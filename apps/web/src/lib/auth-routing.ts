import type { AuthUser } from '@/store/auth.store';

export function getPostLoginRoute(user: AuthUser): string {
  if (user.mustChangePassword) {
    return '/auth/change-password';
  }

  switch (user.role) {
    case 'SUPERADMIN':
      return '/dashboard/admin';
    case 'POLICE_DEPARTMENT':
      return '/dashboard/department';
    case 'NGO':
      return '/dashboard/ngo';
    case 'POLICEMAN':
      return '/police/dashboard';
    case 'VOLUNTEER':
      return '/volunteer/dashboard';
    default:
      return '/dashboard';
  }
}
