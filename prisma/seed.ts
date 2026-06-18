import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  const passwordHash = await hashPassword('159753');

  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@rakshaai.in' },
    update: {
      fullName: 'Super Admin',
      phone: '+919810100001',
      aadhaarNumber: '320000000001',
      passwordHash,
      role: UserRole.SUPERADMIN,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      deletedAt: null,
    },
    create: {
      fullName: 'Super Admin',
      email: 'superadmin@rakshaai.in',
      phone: '+919810100001',
      aadhaarNumber: '320000000001',
      passwordHash,
      role: UserRole.SUPERADMIN,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  const policeDepartment = await prisma.user.upsert({
    where: { email: 'policedepartment@police.com' },
    update: {
      fullName: 'Police Department HQ',
      phone: '+919810100002',
      aadhaarNumber: '320000000002',
      passwordHash,
      role: UserRole.POLICE_DEPARTMENT,
      createdById: superadmin.id,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      deletedAt: null,
    },
    create: {
      fullName: 'Police Department HQ',
      email: 'policedepartment@police.com',
      phone: '+919810100002',
      aadhaarNumber: '320000000002',
      passwordHash,
      role: UserRole.POLICE_DEPARTMENT,
      createdById: superadmin.id,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  const ngo = await prisma.user.upsert({
    where: { email: 'ngo@ngo.com' },
    update: {
      fullName: 'NGO Demo',
      phone: '+919810100004',
      aadhaarNumber: '320000000004',
      passwordHash,
      role: UserRole.NGO,
      createdById: superadmin.id,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      deletedAt: null,
    },
    create: {
      fullName: 'NGO Demo',
      email: 'ngo@ngo.com',
      phone: '+919810100004',
      aadhaarNumber: '320000000004',
      passwordHash,
      role: UserRole.NGO,
      createdById: superadmin.id,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'police@police.com' },
    update: {
      fullName: 'Officer Demo',
      phone: '+919810100003',
      aadhaarNumber: '320000000003',
      passwordHash,
      role: UserRole.POLICEMAN,
      departmentId: policeDepartment.id,
      createdById: policeDepartment.id,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      deletedAt: null,
    },
    create: {
      fullName: 'Officer Demo',
      email: 'police@police.com',
      phone: '+919810100003',
      aadhaarNumber: '320000000003',
      passwordHash,
      role: UserRole.POLICEMAN,
      departmentId: policeDepartment.id,
      createdById: policeDepartment.id,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'volunteer@ngo.com' },
    update: {
      fullName: 'Volunteer Demo',
      phone: '+919810100005',
      aadhaarNumber: '320000000005',
      passwordHash,
      role: UserRole.VOLUNTEER,
      ngoId: ngo.id,
      createdById: ngo.id,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      deletedAt: null,
    },
    create: {
      fullName: 'Volunteer Demo',
      email: 'volunteer@ngo.com',
      phone: '+919810100005',
      aadhaarNumber: '320000000005',
      passwordHash,
      role: UserRole.VOLUNTEER,
      ngoId: ngo.id,
      createdById: ngo.id,
      isSeed: true,
      mustChangePassword: false,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  console.log('Seed complete');
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
