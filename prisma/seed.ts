import { PrismaClient, OrganizationStatus, OrganizationType, UserRole, VerificationStatus, VolunteerStatus, WorkerType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function upsertUser(input: {
  fullName: string;
  email: string;
  phone: string;
  aadhaarNumber: string;
  password: string;
  role: UserRole;
}) {
  const passwordHash = await hashPassword(input.password);

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      phone: input.phone,
      aadhaarNumber: input.aadhaarNumber,
      passwordHash,
      role: input.role,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    create: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      aadhaarNumber: input.aadhaarNumber,
      passwordHash,
      role: input.role,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });
}

async function main() {
  const departmentAdmin = await upsertUser({
    fullName: 'Ananya Sharma',
    email: 'police.department@rakshaai.local',
    phone: '+919810000001',
    aadhaarNumber: '310000000001',
    password: 'DeptAdmin@123',
    role: UserRole.organization_admin,
  });

  const volunteerUser = await upsertUser({
    fullName: 'Meera Joshi',
    email: 'volunteer@rakshaai.local',
    phone: '+919810000002',
    aadhaarNumber: '310000000002',
    password: 'Volunteer@123',
    role: UserRole.volunteer,
  });

  const policeUser = await upsertUser({
    fullName: 'Inspector Arjun Verma',
    email: 'policeman@rakshaai.local',
    phone: '+919810000003',
    aadhaarNumber: '310000000003',
    password: 'Police@123',
    role: UserRole.police,
  });

  const policeOrganization = await prisma.organization.upsert({
    where: { email: 'central-police-dept@rakshaai.local' },
    update: {
      organizationName: 'Central City Police Department',
      organizationType: OrganizationType.police,
      description: 'Primary police department for hotspot assignment workflows.',
      phone: '+911124000100',
      address: '1 Civic Safety Plaza',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      status: OrganizationStatus.approved,
      createdById: departmentAdmin.id,
      approvedAt: new Date(),
    },
    create: {
      organizationName: 'Central City Police Department',
      organizationType: OrganizationType.police,
      description: 'Primary police department for hotspot assignment workflows.',
      email: 'central-police-dept@rakshaai.local',
      phone: '+911124000100',
      address: '1 Civic Safety Plaza',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      status: OrganizationStatus.approved,
      createdById: departmentAdmin.id,
      approvedAt: new Date(),
    },
  });

  const workerPasswordHash = await hashPassword('WorkerPolice@123');
  const policeWorker = await prisma.worker.upsert({
    where: { email: 'worker.policeman@rakshaai.local' },
    update: {
      organizationId: policeOrganization.id,
      workerType: WorkerType.police_officer,
      fullName: 'Officer Kavya Singh',
      phone: '+919810000004',
      passwordHash: workerPasswordHash,
      isActive: true,
    },
    create: {
      organizationId: policeOrganization.id,
      workerType: WorkerType.police_officer,
      email: 'worker.policeman@rakshaai.local',
      passwordHash: workerPasswordHash,
      fullName: 'Officer Kavya Singh',
      phone: '+919810000004',
      isActive: true,
    },
  });

  await prisma.volunteer.upsert({
    where: { userId: volunteerUser.id },
    update: {
      status: VolunteerStatus.available,
      verificationStatus: VerificationStatus.verified,
      serviceRadiusKm: 8,
      ngoAffiliation: 'RakshaAI Volunteer Network',
      skills: ['first_aid', 'escort_support'],
      languagesSpoken: ['Hindi', 'English'],
      aadhaarVerified: true,
    },
    create: {
      userId: volunteerUser.id,
      status: VolunteerStatus.available,
      verificationStatus: VerificationStatus.verified,
      serviceRadiusKm: 8,
      ngoAffiliation: 'RakshaAI Volunteer Network',
      skills: ['first_aid', 'escort_support'],
      languagesSpoken: ['Hindi', 'English'],
      aadhaarVerified: true,
    },
  });

  const station = await prisma.policeStation.upsert({
    where: { stationCode: 'CCPD-001' },
    update: {
      name: 'Central City Police Station',
      address: '22 Justice Avenue',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110002',
      phonePrimary: '+911124000200',
      email: 'station.ccpd@rakshaai.local',
      isActive: true,
      latitude: 28.6139,
      longitude: 77.209,
    },
    create: {
      name: 'Central City Police Station',
      stationCode: 'CCPD-001',
      address: '22 Justice Avenue',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110002',
      phonePrimary: '+911124000200',
      email: 'station.ccpd@rakshaai.local',
      isActive: true,
      latitude: 28.6139,
      longitude: 77.209,
    },
  });

  const policeAccount = await prisma.policeAccount.upsert({
    where: { badgeNumber: 'DL-INSP-2048' },
    update: {
      userId: policeUser.id,
      rank: 'Inspector',
      stationId: station.id,
      isOnDuty: true,
      verificationStatus: VerificationStatus.verified,
    },
    create: {
      userId: policeUser.id,
      badgeNumber: 'DL-INSP-2048',
      rank: 'Inspector',
      stationId: station.id,
      isOnDuty: true,
      verificationStatus: VerificationStatus.verified,
    },
  });

  console.log('Seed complete');
  console.log(`Department admin: ${departmentAdmin.email}`);
  console.log(`Volunteer user: ${volunteerUser.email}`);
  console.log(`Police organization: ${policeOrganization.organizationName}`);
  console.log(`Worker policeman: ${policeWorker.email}`);
  console.log(`Police station: ${station.name}`);
  console.log(`Police account: ${policeAccount.badgeNumber}`);
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
