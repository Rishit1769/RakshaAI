import { UserRole } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/utils/password';

async function upsertUser(email: string, fullName: string, phone: string, password: string, role: UserRole) {
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      phone,
      passwordHash,
      role,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
    },
    create: {
      fullName,
      email,
      phone,
      aadhaarNumber: role === UserRole.admin ? '111122223333' : '444455556666',
      passwordHash,
      role,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
    },
  });
}

async function main() {
  await upsertUser('admin@rakshaai.local', 'Platform Admin', '+919999000001', 'AdminPass123', UserRole.admin);
  await upsertUser('user@rakshaai.local', 'Test User', '+919999000002', 'UserPass123', UserRole.user);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
