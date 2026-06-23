import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/app_config.dart';

class SocketService {
  io.Socket? _socket;

  io.Socket connect(String token) {
    _socket?.dispose();
    _socket = io.io(
      AppConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableReconnection()
          .disableAutoConnect()
          .build(),
    )..connect();
    return _socket!;
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
  }
}
