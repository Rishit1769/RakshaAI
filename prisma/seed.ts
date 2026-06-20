import {
  OrganizationStatus,
  OrganizationType,
  Prisma,
  PrismaClient,
  UserRole,
  VerificationStatus,
  VolunteerStatus,
  WorkerType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = '159753';
const INDIA_CENTER = { latitude: 20.5937, longitude: 78.9629 } as const;
const MIRA_ROAD = { latitude: 19.2952, longitude: 72.8544 } as const;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function upsertSeedUser(input: {
  fullName: string;
  email: string;
  phone: string;
  aadhaarNumber: string;
  role: UserRole;
  passwordHash: string;
  createdById?: string | null;
  departmentId?: string | null;
  ngoId?: string | null;
}) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      phone: input.phone,
      aadhaarNumber: input.aadhaarNumber,
      passwordHash: input.passwordHash,
      role: input.role,
      createdById: input.createdById ?? null,
      departmentId: input.departmentId ?? null,
      ngoId: input.ngoId ?? null,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      deletedAt: null,
    },
    create: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      aadhaarNumber: input.aadhaarNumber,
      passwordHash: input.passwordHash,
      role: input.role,
      createdById: input.createdById ?? null,
      departmentId: input.departmentId ?? null,
      ngoId: input.ngoId ?? null,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });
}

async function ensureOrganization(input: {
  ownerUserId: string;
  organizationName: string;
  organizationType: OrganizationType;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}) {
  const existing = await prisma.organization.findFirst({
    where: {
      createdById: input.ownerUserId,
      organizationType: input.organizationType,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.organization.update({
      where: { id: existing.id },
      data: {
        organizationName: input.organizationName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        status: OrganizationStatus.approved,
        approvedAt: new Date(),
        suspendedAt: null,
        suspendReason: null,
      },
    });
  }

  return prisma.organization.create({
    data: {
      organizationName: input.organizationName,
      organizationType: input.organizationType,
      email: input.email,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      status: OrganizationStatus.approved,
      createdById: input.ownerUserId,
      approvedAt: new Date(),
    },
  });
}

async function ensureWorkerProfile(input: {
  userId: string;
  organizationId: string;
  email: string;
  fullName: string;
  passwordHash: string;
  badgeNumber: string;
}) {
  const existing = await prisma.worker.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });

  if (existing) {
    return prisma.worker.update({
      where: { id: existing.id },
      data: {
        organizationId: input.organizationId,
        workerType: WorkerType.police_officer,
        customRole: input.badgeNumber,
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        isActive: true,
      },
    });
  }

  return prisma.worker.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      workerType: WorkerType.police_officer,
      customRole: input.badgeNumber,
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      isActive: true,
    },
  });
}

async function ensureVolunteerProfile(userId: string, ngoAffiliation: string) {
  const existing = await prisma.volunteer.findUnique({
    where: { userId },
    select: { id: true },
  });

  const data = {
    userId,
    status: VolunteerStatus.available,
    verificationStatus: VerificationStatus.verified,
    ngoAffiliation,
    skills: ['field support', 'community outreach'],
    languagesSpoken: ['Hindi', 'English'],
    serviceRadiusKm: 10,
    aadhaarVerified: true,
  };

  if (existing) {
    return prisma.volunteer.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.volunteer.create({ data });
}

async function ensureAuditLog(action: string, actorId: string, entityId: string, entityType: string, metadata: Prisma.InputJsonValue) {
  const existing = await prisma.auditLog.findFirst({
    where: {
      action,
      actorId,
      entityId,
      entityType,
    },
    select: { id: true },
  });

  if (existing) return existing;

  return prisma.auditLog.create({
    data: {
      action,
      actorId,
      actorRole: null,
      entityId,
      entityType,
      metadata,
    },
  });
}

async function ensureSafeZone(input: {
  name: string;
  type: 'SAFE' | 'RED';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  departmentId: string;
  departmentType: OrganizationType;
  addedBy: string;
  address: string;
  city: string;
}) {
  const existing = await prisma.safeZone.findFirst({
    where: {
      name: input.name,
      departmentId: input.departmentId,
    },
    select: { id: true },
  });

  const data = {
    name: input.name,
    type: input.type,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMeters: input.radiusMeters,
    departmentId: input.departmentId,
    departmentType: input.departmentType,
    addedBy: input.addedBy,
    address: input.address,
    city: input.city,
    is24x7: true,
    isVerified: true,
    isActive: true,
  };

  if (existing) {
    return prisma.safeZone.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.safeZone.create({ data });
}

async function ensureHotspot(input: {
  title: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  assignedPolicemanId: string;
}) {
  const existing = await prisma.safetyHotspot.findFirst({
    where: { title: input.title },
    select: { id: true },
  });

  const data = {
    title: input.title,
    latitude: input.latitude,
    longitude: input.longitude,
    city: input.city,
    state: input.state,
    category: 'unsafe_area' as const,
    description: 'Seeded hotspot for dashboard verification around Mira Road.',
    riskScore: new Prisma.Decimal(0.88),
    reportCount: 3,
    verifiedCount: 1,
    isVerified: true,
    isActive: true,
    peakDangerHours: [20, 21, 22],
    lastIncidentAt: new Date(),
    assignedPolicemanId: input.assignedPolicemanId,
    assignedAt: new Date(),
  };

  if (existing) {
    return prisma.safetyHotspot.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.safetyHotspot.create({ data });
}

async function ensureCommunityReport(input: {
  reporterId: string;
  hotspotId: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  city: string;
}) {
  const existing = await prisma.communityReport.findFirst({
    where: {
      title: input.title,
      latitude: input.latitude,
      longitude: input.longitude,
    },
    select: { id: true },
  });

  const data = {
    reporterId: input.reporterId,
    isAnonymous: false,
    category: 'harassment' as const,
    title: input.title,
    description: input.description,
    latitude: input.latitude,
    longitude: input.longitude,
    address: 'Mira Road East, Mumbai',
    city: input.city,
    imageUrls: [],
    score: 8,
    pinColor: 'red',
    alertSent: false,
    isVerified: true,
    hotspotId: input.hotspotId,
    isActive: true,
  };

  if (existing) {
    return prisma.communityReport.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.communityReport.create({ data });
}

async function replaceUserLocations(entries: Array<{ userId: string; latitude: number; longitude: number }>) {
  const userIds = entries.map((entry) => entry.userId);
  await prisma.userLocation.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userLocation.createMany({
    data: entries.map((entry) => ({
      userId: entry.userId,
      latitude: entry.latitude,
      longitude: entry.longitude,
      isSharing: true,
    })),
  });
}

async function main() {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  const superadmin = await upsertSeedUser({
    fullName: 'Super Admin',
    email: 'superadmin@rakshaai.in',
    phone: '+919810100001',
    aadhaarNumber: '320000000001',
    role: UserRole.SUPERADMIN,
    passwordHash,
  });

  const policeDepartment = await upsertSeedUser({
    fullName: 'Raksha Police Department Mumbai',
    email: 'policedepartment@police.com',
    phone: '+919810100002',
    aadhaarNumber: '320000000002',
    role: UserRole.POLICE_DEPARTMENT,
    passwordHash,
    createdById: superadmin.id,
  });

  const ngo = await upsertSeedUser({
    fullName: 'Raksha Women Support NGO',
    email: 'ngo@ngo.com',
    phone: '+919810100004',
    aadhaarNumber: '320000000004',
    role: UserRole.NGO,
    passwordHash,
    createdById: superadmin.id,
  });

  const officer = await upsertSeedUser({
    fullName: 'Officer Demo',
    email: 'police@police.com',
    phone: '+919810100003',
    aadhaarNumber: '320000000003',
    role: UserRole.POLICEMAN,
    passwordHash,
    departmentId: policeDepartment.id,
    createdById: policeDepartment.id,
  });

  const volunteer = await upsertSeedUser({
    fullName: 'Volunteer Demo',
    email: 'volunteer@ngo.com',
    phone: '+919810100005',
    aadhaarNumber: '320000000005',
    role: UserRole.VOLUNTEER,
    passwordHash,
    ngoId: ngo.id,
    createdById: ngo.id,
  });

  const citizen = await upsertSeedUser({
    fullName: 'Mira Road Reporter',
    email: 'citizen@rakshaai.in',
    phone: '+919810100006',
    aadhaarNumber: '320000000006',
    role: UserRole.user,
    passwordHash,
  });

  const policeOrganization = await ensureOrganization({
    ownerUserId: policeDepartment.id,
    organizationName: 'Raksha Police Department Mumbai',
    organizationType: OrganizationType.police,
    email: 'policedepartment@police.com',
    phone: '+919810100002',
    address: 'Mira Road Command Office, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '401107',
  });

  const ngoOrganization = await ensureOrganization({
    ownerUserId: ngo.id,
    organizationName: 'Raksha Women Support NGO',
    organizationType: OrganizationType.ngo,
    email: 'ngo@ngo.com',
    phone: '+919810100004',
    address: 'Mira Road NGO Support Center, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '401107',
  });

  const worker = await ensureWorkerProfile({
    userId: officer.id,
    organizationId: policeOrganization.id,
    email: officer.email,
    fullName: officer.fullName,
    passwordHash,
    badgeNumber: 'MIR-2047',
  });

  await ensureVolunteerProfile(volunteer.id, ngo.fullName);

  await ensureAuditLog('CREATED_POLICEMAN', policeDepartment.id, officer.id, 'User', {
    email: officer.email,
    role: UserRole.POLICEMAN,
    departmentId: policeDepartment.id,
    badgeNumber: 'MIR-2047',
  });

  await ensureSafeZone({
    name: 'Mira Road Safe Patrol Zone',
    type: 'SAFE',
    latitude: MIRA_ROAD.latitude,
    longitude: MIRA_ROAD.longitude,
    radiusMeters: 2200,
    departmentId: policeOrganization.id,
    departmentType: OrganizationType.police,
    addedBy: policeDepartment.id,
    address: 'Mira Road East patrol coverage',
    city: 'Mumbai',
  });

  await ensureSafeZone({
    name: 'NGO Mira Support Coverage',
    type: 'SAFE',
    latitude: MIRA_ROAD.latitude,
    longitude: MIRA_ROAD.longitude,
    radiusMeters: 2500,
    departmentId: ngoOrganization.id,
    departmentType: OrganizationType.ngo,
    addedBy: ngo.id,
    address: 'NGO volunteer support coverage around Mira Road',
    city: 'Mumbai',
  });

  const hotspot = await ensureHotspot({
    title: 'Mira Road Incident Watch',
    latitude: MIRA_ROAD.latitude,
    longitude: MIRA_ROAD.longitude,
    city: 'Mumbai',
    state: 'Maharashtra',
    assignedPolicemanId: worker.id,
  });

  await ensureAuditLog('DEPARTMENT_CREATED_HOTSPOT', policeDepartment.id, hotspot.id, 'SafetyHotspot', {
    name: 'Mira Road Incident Watch',
    radiusMeters: 2200,
    severity: 'HIGH',
    status: 'ACTIVE',
  });

  await ensureAuditLog('DEPARTMENT_ASSIGNED_HOTSPOT', policeDepartment.id, hotspot.id, 'SafetyHotspot', {
    officerId: officer.id,
    officerName: officer.fullName,
    hotspotName: 'Mira Road Incident Watch',
  });

  await ensureCommunityReport({
    reporterId: citizen.id,
    hotspotId: hotspot.id,
    title: 'Harassment near Mira Road station',
    description: 'Seeded community incident with valid Mira Road coordinates for map verification.',
    latitude: MIRA_ROAD.latitude,
    longitude: MIRA_ROAD.longitude,
    city: 'Mumbai',
  });

  await replaceUserLocations([
    { userId: officer.id, latitude: MIRA_ROAD.latitude, longitude: MIRA_ROAD.longitude },
    { userId: volunteer.id, latitude: MIRA_ROAD.latitude, longitude: MIRA_ROAD.longitude },
    { userId: ngo.id, latitude: MIRA_ROAD.latitude, longitude: MIRA_ROAD.longitude },
  ]);

  console.log('Seed complete', {
    superadmin: superadmin.email,
    policeDepartment: policeDepartment.email,
    officer: officer.email,
    ngo: ngo.email,
    volunteer: volunteer.email,
    fallbackCenter: INDIA_CENTER,
  });
}

main()
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
