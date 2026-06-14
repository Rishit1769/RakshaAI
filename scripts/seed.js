const { PrismaClient, UserRole, OrganizationType, OrganizationStatus, WorkerType } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PASSWORD = '159753';
const SEED_EMAILS = [
  'admin@gmail.com',
  'police.department@gmail.com',
  'police.worker@gmail.com',
  'ngo.department@gmail.com',
  'ngo.worker@gmail.com',
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await purgeSeedData();

  const admin = await prisma.user.create({
    data: {
      fullName: 'Admin',
      email: 'admin@gmail.com',
      passwordHash,
      role: UserRole.admin,
      isVerified: true,
      isEmailVerified: true,
    },
  });

  const policeDepartment = await prisma.organization.create({
    data: {
      organizationName: 'Police Department',
      organizationType: OrganizationType.police,
      email: 'police.department@gmail.com',
      status: OrganizationStatus.approved,
      approvedAt: new Date(),
      createdById: admin.id,
    },
  });

  const ngoDepartment = await prisma.organization.create({
    data: {
      organizationName: 'NGO Department',
      organizationType: OrganizationType.ngo,
      email: 'ngo.department@gmail.com',
      status: OrganizationStatus.approved,
      approvedAt: new Date(),
      createdById: admin.id,
    },
  });

  const policeDepartmentUser = await prisma.user.create({
    data: {
      fullName: 'Police Department',
      email: 'police.department@gmail.com',
      passwordHash,
      role: UserRole.department,
      departmentId: policeDepartment.id,
      isVerified: true,
      isEmailVerified: true,
    },
  });

  const ngoDepartmentUser = await prisma.user.create({
    data: {
      fullName: 'NGO Department',
      email: 'ngo.department@gmail.com',
      passwordHash,
      role: UserRole.department,
      departmentId: ngoDepartment.id,
      isVerified: true,
      isEmailVerified: true,
    },
  });

  const policeWorkerUser = await prisma.user.create({
    data: {
      fullName: 'Police Worker',
      email: 'police.worker@gmail.com',
      passwordHash,
      role: UserRole.worker,
      departmentId: policeDepartment.id,
      isVerified: true,
      isEmailVerified: true,
    },
  });

  const ngoWorkerUser = await prisma.user.create({
    data: {
      fullName: 'NGO Worker',
      email: 'ngo.worker@gmail.com',
      passwordHash,
      role: UserRole.worker,
      departmentId: ngoDepartment.id,
      isVerified: true,
      isEmailVerified: true,
    },
  });

  await prisma.worker.createMany({
    data: [
      {
        userId: policeWorkerUser.id,
        organizationId: policeDepartment.id,
        workerType: WorkerType.police_officer,
        customRole: 'police_worker',
        email: 'police.worker@gmail.com',
        passwordHash,
        fullName: 'Police Worker',
      },
      {
        userId: ngoWorkerUser.id,
        organizationId: ngoDepartment.id,
        workerType: WorkerType.ngo_worker,
        customRole: 'ngo_worker',
        email: 'ngo.worker@gmail.com',
        passwordHash,
        fullName: 'NGO Worker',
      },
    ],
  });

  console.log('Seed complete');
  console.log({
    admin: admin.email,
    departments: [policeDepartmentUser.email, ngoDepartmentUser.email],
    workers: [policeWorkerUser.email, ngoWorkerUser.email],
    password: PASSWORD,
  });
}

async function purgeSeedData() {
  const organizations = await prisma.organization.findMany({
    where: { email: { in: ['police.department@gmail.com', 'ngo.department@gmail.com'] } },
    select: { id: true },
  });

  const organizationIds = organizations.map((org) => org.id);
  const users = await prisma.user.findMany({
    where: { email: { in: SEED_EMAILS } },
    select: { id: true },
  });

  const userIds = users.map((user) => user.id);

  await prisma.redZone.deleteMany({
    where: {
      OR: [
        { triggeredById: { in: userIds } },
        { notifiedDepartments: { some: { id: { in: organizationIds } } } },
      ],
    },
  });
  await prisma.safeZone.deleteMany({
    where: {
      OR: [
        { departmentId: { in: organizationIds } },
        { addedBy: { in: userIds } },
      ],
    },
  });
  await prisma.worker.deleteMany({
    where: {
      OR: [
        { email: { in: ['police.worker@gmail.com', 'ngo.worker@gmail.com'] } },
        { organizationId: { in: organizationIds } },
        { userId: { in: userIds } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { email: { in: SEED_EMAILS } } });
  await prisma.organization.deleteMany({
    where: { email: { in: ['police.department@gmail.com', 'ngo.department@gmail.com'] } },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
