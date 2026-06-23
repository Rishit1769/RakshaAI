class AppConfig {
  AppConfig._();

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://raksha.rishit.codes/api',
  );
  static const socketUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'https://raksha.rishit.codes',
  );
  static const appName = 'RakshaAI';
}
