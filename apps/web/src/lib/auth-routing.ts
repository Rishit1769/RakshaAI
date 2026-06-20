import type { AuthUser } from '@/store/auth.store';

export function getPostLoginRoute(user: AuthUser): string {
  if (user.mustChangePassword) {
    return '/dashboard/settings';
  }

  switch (user.role) {
    case 'SUPERADMIN':
      return '/dashboard/superadmin';
    case 'POLICE_DEPARTMENT':
      return '/dashboard/department';
    case 'NGO':
      return '/dashboard/ngo';
    case 'POLICEMAN':
      return '/dashboard/policeman';
    case 'VOLUNTEER':
      return '/dashboard/volunteer';
    default:
      return '/dashboard';
  }
}
