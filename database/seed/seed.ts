/**
 * RakshaAI — Database Seed
 * Seeds the Super Admin user. Run with:
 *   npx ts-node prisma/seed.ts
 *
 * IMPORTANT: Change credentials in .env before running in production.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Starting seed...');

  const email = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@rakshaai.in';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'SuperAdmin@2024!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`⚠️  Super admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const superAdmin = await prisma.user.create({
    data: {
      fullName: 'Super Administrator',
      email,
      phone: '+919999999999',
      passwordHash,
      role: 'super_admin',
      isVerified: true,
      isEmailVerified: true,
    },
  });

  console.log(`✅  Super admin created: ${superAdmin.email} (id: ${superAdmin.id})`);
  console.log(`⚠️  Change the default password immediately in production!`);

  // ─── Fixed admin account ────────────────────────────────────────────
  const adminEmail = 'admin@raksha.ai';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log(`⚠️  Admin account already exists: ${adminEmail}`);
  } else {
    const adminHash = await bcrypt.hash('admin@159753', 12);
    const admin = await prisma.user.create({
      data: {
        fullName: 'RakshaAI Admin',
        email: adminEmail,
        phone: '+919988776655',
        passwordHash: adminHash,
        role: 'super_admin',
        isVerified: true,
        isEmailVerified: true,
      },
    });
    console.log(`✅  Admin account created: ${admin.email} (id: ${admin.id})`);
  }
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
