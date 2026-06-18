import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const seedUsers = [
  {
    fullName: 'Super Admin',
    email: 'superadmin@rakshaai.in',
    phone: '+919810100001',
    aadhaarNumber: '320000000001',
    role: UserRole.SUPERADMIN,
  },
  {
    fullName: 'Police Department HQ',
    email: 'policedepartment@police.com',
    phone: '+919810100002',
    aadhaarNumber: '320000000002',
    role: UserRole.POLICE_DEPARTMENT,
  },
  {
    fullName: 'Officer Demo',
    email: 'police@police.com',
    phone: '+919810100003',
    aadhaarNumber: '320000000003',
    role: UserRole.POLICEMAN,
  },
  {
    fullName: 'NGO Demo',
    email: 'ngo@ngo.com',
    phone: '+919810100004',
    aadhaarNumber: '320000000004',
    role: UserRole.NGO,
  },
  {
    fullName: 'Volunteer Demo',
    email: 'volunteer@ngo.com',
    phone: '+919810100005',
    aadhaarNumber: '320000000005',
    role: UserRole.VOLUNTEER,
  },
] as const;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  const passwordHash = await hashPassword('159753');

  for (const seedUser of seedUsers) {
    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        fullName: seedUser.fullName,
        phone: seedUser.phone,
        aadhaarNumber: seedUser.aadhaarNumber,
        passwordHash,
        role: seedUser.role,
        isSeed: true,
        isActive: true,
        isVerified: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        deletedAt: null,
      },
      create: {
        fullName: seedUser.fullName,
        email: seedUser.email,
        phone: seedUser.phone,
        aadhaarNumber: seedUser.aadhaarNumber,
        passwordHash,
        role: seedUser.role,
        isSeed: true,
        isActive: true,
        isVerified: true,
        isPhoneVerified: true,
        isEmailVerified: true,
      },
    });
  }

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
