import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '159753';
const SALT_ROUNDS = 12;

type SeedUserInput = {
  fullName: string;
  email: string;
  phone: string;
  aadhaarNumber: string;
  role: UserRole;
  createdById?: string | null;
  departmentId?: string | null;
  ngoId?: string | null;
};

async function upsertSeedUser(input: SeedUserInput) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      phone: input.phone,
      aadhaarNumber: input.aadhaarNumber,
      passwordHash,
      role: input.role,
      createdById: input.createdById ?? null,
      departmentId: input.departmentId ?? null,
      ngoId: input.ngoId ?? null,
      isSeed: true,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      mustChangePassword: false,
      deletedAt: null,
    },
    create: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      aadhaarNumber: input.aadhaarNumber,
      passwordHash,
      role: input.role,
      createdById: input.createdById ?? null,
      departmentId: input.departmentId ?? null,
      ngoId: input.ngoId ?? null,
      isSeed: true,
      isActive: true,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      mustChangePassword: false,
    },
  });
}

async function main() {
  const superadmin = await upsertSeedUser({
    fullName: 'Super Admin',
    email: 'superadmin@rakshaai.in',
    phone: '+919810100001',
    aadhaarNumber: '320000000001',
    role: UserRole.SUPERADMIN,
  });

  const policeDepartment = await upsertSeedUser({
    fullName: 'Police Department HQ',
    email: 'policedepartment@police.com',
    phone: '+919810100002',
    aadhaarNumber: '320000000002',
    role: UserRole.POLICE_DEPARTMENT,
    createdById: superadmin.id,
  });

  const policeman = await upsertSeedUser({
    fullName: 'Officer Demo',
    email: 'police@police.com',
    phone: '+919810100003',
    aadhaarNumber: '320000000003',
    role: UserRole.POLICEMAN,
    departmentId: policeDepartment.id,
    createdById: policeDepartment.id,
  });

  const ngo = await upsertSeedUser({
    fullName: 'NGO Demo',
    email: 'ngo@ngo.com',
    phone: '+919810100004',
    aadhaarNumber: '320000000004',
    role: UserRole.NGO,
    createdById: superadmin.id,
  });

  const volunteer = await upsertSeedUser({
    fullName: 'Volunteer Demo',
    email: 'volunteer@ngo.com',
    phone: '+919810100005',
    aadhaarNumber: '320000000005',
    role: UserRole.VOLUNTEER,
    ngoId: ngo.id,
    createdById: ngo.id,
  });

  console.log(
    JSON.stringify(
      {
        seededUsers: [
          { id: superadmin.id, email: superadmin.email, role: superadmin.role },
          { id: policeDepartment.id, email: policeDepartment.email, role: policeDepartment.role },
          { id: policeman.id, email: policeman.email, role: policeman.role },
          { id: ngo.id, email: ngo.email, role: ngo.role },
          { id: volunteer.id, email: volunteer.email, role: volunteer.role },
        ],
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
