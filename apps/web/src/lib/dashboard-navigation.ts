export interface DashboardNavItem {
  href: string;
  label: string;
}

const commonItems: DashboardNavItem[] = [
  { href: '/dashboard/settings', label: 'Settings' },
];

export function getDashboardNavigation(role: string): DashboardNavItem[] {
  switch (role) {
    case 'SUPERADMIN':
      return [
        { href: '/dashboard/superadmin', label: 'Overview' },
        { href: '/dashboard/superadmin/users', label: 'Users' },
        { href: '/dashboard/superadmin/create', label: 'Create' },
        { href: '/dashboard/superadmin/moderation', label: 'Moderation' },
        { href: '/dashboard/superadmin/hotspots', label: 'Hotspots' },
        { href: '/dashboard/superadmin/analytics', label: 'Analytics' },
        { href: '/dashboard/superadmin/audit', label: 'Audit' },
        ...commonItems,
      ];
    case 'POLICE_DEPARTMENT':
      return [
        { href: '/dashboard/department', label: 'Overview' },
        { href: '/dashboard/department/policemen', label: 'Policemen' },
        { href: '/dashboard/department/assignments', label: 'Assignments' },
        { href: '/dashboard/department/map', label: 'Map' },
        { href: '/dashboard/department/sos', label: 'SOS Feed' },
        { href: '/dashboard/department/zones', label: 'Zones' },
        { href: '/dashboard/department/activity', label: 'Activity' },
        ...commonItems,
      ];
    case 'NGO':
      return [
        { href: '/dashboard/ngo', label: 'Overview' },
        { href: '/dashboard/ngo/volunteers', label: 'Volunteers' },
        { href: '/dashboard/ngo/response', label: 'Response' },
        { href: '/dashboard/ngo/sos', label: 'SOS Feed' },
        { href: '/dashboard/ngo/zones', label: 'Zones' },
        { href: '/dashboard/ngo/activity', label: 'Activity' },
        ...commonItems,
      ];
    case 'POLICEMAN':
      return [
        { href: '/dashboard/policeman', label: 'Overview' },
        { href: '/dashboard/policeman/hotspot', label: 'Hotspot' },
        { href: '/dashboard/policeman/sos', label: 'SOS Feed' },
        { href: '/dashboard/policeman/incidents', label: 'Incidents' },
        { href: '/dashboard/policeman/report', label: 'Report' },
        { href: '/dashboard/policeman/stations', label: 'Stations' },
        ...commonItems,
      ];
    case 'VOLUNTEER':
      return [
        { href: '/dashboard/volunteer', label: 'Overview' },
        { href: '/dashboard/volunteer/sos', label: 'SOS Feed' },
        { href: '/dashboard/volunteer/cases', label: 'Cases' },
        { href: '/dashboard/volunteer/map', label: 'Map' },
        { href: '/dashboard/volunteer/check-in', label: 'Check-In' },
        { href: '/dashboard/volunteer/zones', label: 'Zones' },
        ...commonItems,
      ];
    default:
      return [
        { href: '/dashboard', label: 'Overview' },
        { href: '/journey', label: 'Journey' },
        { href: '/map', label: 'Safety Map' },
        { href: '/community', label: 'Community' },
        { href: '/dashboard/emergency-contacts', label: 'Contacts' },
        ...commonItems,
      ];
  }
}
