class AuthUser {
  const AuthUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.role,
    required this.mustChangePassword,
    this.mpinEnabled = false,
  });

  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String role;
  final bool mustChangePassword;
  final bool mpinEnabled;

  bool get isCitizen => role.toLowerCase() == 'user';

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: '${json['id'] ?? ''}',
        fullName: '${json['fullName'] ?? 'Raksha user'}',
        email: '${json['email'] ?? ''}',
        phone: '${json['phone'] ?? ''}',
        role: '${json['role'] ?? 'user'}',
        mustChangePassword: json['mustChangePassword'] == true,
        mpinEnabled: json['mpinEnabled'] == true,
      );
}
