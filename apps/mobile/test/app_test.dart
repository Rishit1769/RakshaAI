import 'package:flutter_test/flutter_test.dart';
import 'package:rakshaai_mobile/core/models/auth_user.dart';
import 'package:rakshaai_mobile/features/workspace/workspace_screens.dart';

void main() {
  test('auth user parses API role and security flags', () {
    final user = AuthUser.fromJson({
      'id': '1',
      'fullName': 'Test User',
      'email': 'test@example.com',
      'phone': '9999999999',
      'role': 'POLICEMAN',
      'mustChangePassword': true,
      'mpinEnabled': true,
    });
    expect(user.role, 'POLICEMAN');
    expect(user.mustChangePassword, isTrue);
    expect(user.isCitizen, isFalse);
  });

  test('role API prefixes match the backend route tree', () {
    expect(rolePrefix('SUPERADMIN'), '/admin');
    expect(rolePrefix('POLICE_DEPARTMENT'), '/department');
    expect(rolePrefix('NGO'), '/ngo');
    expect(rolePrefix('POLICEMAN'), '/officer');
    expect(rolePrefix('VOLUNTEER'), '/volunteer');
  });
}
