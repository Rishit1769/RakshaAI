import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_controller.dart';
import '../../features/auth/auth_screens.dart';
import '../../features/citizen/citizen_screens.dart';
import '../../features/workspace/workspace_screens.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);
  return GoRouter(
    initialLocation: '/splash',
    redirect: (_, state) {
      final public = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register' ||
          state.matchedLocation == '/splash';
      if (auth.status == AuthStatus.loading) return '/splash';
      if (auth.status == AuthStatus.unauthenticated && !public) return '/login';
      if (auth.status == AuthStatus.authenticated && public) {
        return auth.user!.mustChangePassword ? '/settings' : '/home';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/home', builder: (_, __) => const RoleHomeScreen()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/sos', builder: (_, __) => const SosScreen()),
      GoRoute(path: '/sos/active', builder: (_, state) =>
          ActiveSosScreen(alertId: state.uri.queryParameters['id'])),
      GoRoute(path: '/contacts', builder: (_, __) => const ContactsScreen()),
      GoRoute(path: '/map', builder: (_, __) => const SafetyMapScreen()),
      GoRoute(path: '/community', builder: (_, __) => const CommunityScreen()),
      GoRoute(path: '/ai', builder: (_, __) => const AiAssistantScreen()),
      GoRoute(path: '/journey', builder: (_, __) => const JourneyScreen()),
      GoRoute(path: '/workspace/:section', builder: (_, state) =>
          WorkspaceSectionScreen(section: state.pathParameters['section']!)),
    ],
  );
});
