import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/app_config.dart';

const _accessKey = 'raksha_access_token';
const _refreshKey = 'raksha_refresh_token';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}

class TokenStore {
  const TokenStore(this.storage);
  final FlutterSecureStorage storage;

  Future<String?> get accessToken => storage.read(key: _accessKey);
  Future<String?> get refreshToken => storage.read(key: _refreshKey);
  Future<void> save({required String access, String? refresh}) async {
    await storage.write(key: _accessKey, value: access);
    if (refresh != null && refresh.isNotEmpty) {
      await storage.write(key: _refreshKey, value: refresh);
    }
  }

  Future<void> clear() => storage.deleteAll();
}

class ApiClient {
  ApiClient(this.tokens)
      : dio = Dio(BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 20),
          receiveTimeout: const Duration(seconds: 30),
          headers: const {'Content-Type': 'application/json'},
        )) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await tokens.accessToken;
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 &&
            error.requestOptions.extra['retried'] != true) {
          final refreshed = await _refresh();
          if (refreshed) {
            final request = error.requestOptions;
            request.extra['retried'] = true;
            request.headers['Authorization'] =
                'Bearer ${await tokens.accessToken}';
            try {
              return handler.resolve(await dio.fetch(request));
            } on DioException catch (retryError) {
              return handler.next(retryError);
            }
          }
        }
        handler.next(error);
      },
    ));
  }

  final TokenStore tokens;
  final Dio dio;
  bool _refreshing = false;
  Future<bool>? _refreshFuture;

  Future<bool> _refresh() {
    if (_refreshing && _refreshFuture != null) return _refreshFuture!;
    _refreshing = true;
    _refreshFuture = () async {
      try {
        final refresh = await tokens.refreshToken;
        if (refresh == null) return false;
        final response = await Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl))
            .post('/auth/refresh', data: {'refreshToken': refresh});
        final data = _unwrap(response.data);
        final access = '${(data as Map)['accessToken'] ?? ''}';
        if (access.isEmpty) return false;
        await tokens.save(access: access);
        return true;
      } catch (_) {
        await tokens.clear();
        return false;
      } finally {
        _refreshing = false;
        _refreshFuture = null;
      }
    }();
    return _refreshFuture!;
  }

  Future<dynamic> get(String path,
      {Map<String, dynamic>? queryParameters}) async {
    return _request(() => dio.get(path, queryParameters: queryParameters));
  }

  Future<dynamic> post(String path, [Object? data]) =>
      _request(() => dio.post(path, data: data));
  Future<dynamic> patch(String path, [Object? data]) =>
      _request(() => dio.patch(path, data: data));
  Future<dynamic> put(String path, [Object? data]) =>
      _request(() => dio.put(path, data: data));
  Future<dynamic> delete(String path, [Object? data]) =>
      _request(() => dio.delete(path, data: data));

  Future<dynamic> _request(Future<Response<dynamic>> Function() call) async {
    try {
      return _unwrap((await call()).data);
    } on DioException catch (error) {
      final body = error.response?.data;
      final message = body is Map
          ? '${body['message'] ?? body['error'] ?? 'Request failed'}'
          : error.type == DioExceptionType.connectionError
              ? 'Unable to reach RakshaAI. Check your connection.'
              : 'Request failed. Please try again.';
      throw ApiException(message, statusCode: error.response?.statusCode);
    }
  }

  static dynamic _unwrap(dynamic body) {
    if (body is Map && body.containsKey('success')) {
      if (body['success'] != true) {
        throw ApiException('${body['message'] ?? 'Request failed'}');
      }
      return body['data'];
    }
    return body;
  }
}

final secureStorageProvider =
    Provider((_) => const FlutterSecureStorage(aOptions: AndroidOptions(encryptedSharedPreferences: true)));
final tokenStoreProvider =
    Provider((ref) => TokenStore(ref.watch(secureStorageProvider)));
final apiClientProvider =
    Provider((ref) => ApiClient(ref.watch(tokenStoreProvider)));
