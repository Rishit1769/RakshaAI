import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/auth_user.dart';
import '../../core/network/api_client.dart';

enum AuthStatus { loading, authenticated, unauthenticated }

class AuthState {
  const AuthState(this.status, {this.user, this.error});
  final AuthStatus status;
  final AuthUser? user;
  final String? error;
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this.api, this.tokens)
      : super(const AuthState(AuthStatus.loading)) {
    restore();
  }

  final ApiClient api;
  final TokenStore tokens;

  Future<void> restore() async {
    if (await tokens.accessToken == null) {
      state = const AuthState(AuthStatus.unauthenticated);
      return;
    }
    try {
      state = AuthState(AuthStatus.authenticated,
          user: AuthUser.fromJson(Map<String, dynamic>.from(await api.get('/auth/me'))));
    } catch (_) {
      await tokens.clear();
      state = const AuthState(AuthStatus.unauthenticated);
    }
  }

  Future<void> login({
    required String identifier,
    required String credential,
    required String method,
  }) async {
    state = const AuthState(AuthStatus.loading);
    try {
      final result = Map<String, dynamic>.from(await api.post('/auth/login', {
        'identifier': identifier.trim(),
        'credential': credential,
        'loginMethod': method,
      }));
      await tokens.save(
        access: '${result['accessToken']}',
        refresh: result['refreshToken']?.toString(),
      );
      state = AuthState(AuthStatus.authenticated,
          user: AuthUser.fromJson(Map<String, dynamic>.from(result['user'])));
    } catch (error) {
      state = AuthState(AuthStatus.unauthenticated, error: '$error');
      rethrow;
    }
  }

  Future<void> acceptAuthResult(dynamic value) async {
    final result = Map<String, dynamic>.from(value);
    await tokens.save(
      access: '${result['accessToken']}',
      refresh: result['refreshToken']?.toString(),
    );
    state = AuthState(AuthStatus.authenticated,
        user: AuthUser.fromJson(Map<String, dynamic>.from(result['user'])));
  }

  Future<void> reloadUser() => restore();

  Future<void> logout() async {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // Local logout remains authoritative when the server is unreachable.
    }
    await tokens.clear();
    state = const AuthState(AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(
    ref.watch(apiClientProvider),
    ref.watch(tokenStoreProvider),
  );
});
