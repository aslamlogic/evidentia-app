import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create superuser (THE ONLY superuser - total system access)
  const superuserPassword = await bcrypt.hash('Ev1dent!a$uper2026', 10);
  const superuser = await prisma.user.upsert({
    where: { email: 'superuser@evidentia.legal' },
    update: {
      password: superuserPassword,
      role: 'superuser',
      subscriptionTier: 'Platinum',
    },
    create: {
      email: 'superuser@evidentia.legal',
      password: superuserPassword,
      firstName: 'System',
      lastName: 'Superuser',
      role: 'superuser',
      subscriptionTier: 'Platinum',
      isActive: true,
    },
  });
  // Silent creation - no logging

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@evidentia.legal' },
    update: {
      password: adminPassword,
      role: 'admin',
      subscriptionTier: 'Platinum',
    },
    create: {
      email: 'admin@evidentia.legal',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'admin',
      subscriptionTier: 'Platinum',
      isActive: true,
    },
  });
  console.log('\u2713 Admin user created:', admin.email);

  // Create demo user_admin (firm-level admin for demo organisation)
  const userAdminPassword = await bcrypt.hash('useradmin123', 10);
  const userAdmin = await prisma.user.upsert({
    where: { email: 'firmadmin@evidentia.legal' },
    update: {
      password: userAdminPassword,
      role: 'user_admin',
      subscriptionTier: 'Gold',
    },
    create: {
      email: 'firmadmin@evidentia.legal',
      password: userAdminPassword,
      firstName: 'Firm',
      lastName: 'Admin',
      role: 'user_admin',
      subscriptionTier: 'Gold',
      isActive: true,
    },
  });
  console.log('\u2713 User Admin created:', userAdmin.email);

  console.log('\n=== Seeding Complete ===');
  console.log('\nTest Accounts:');
  console.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  console.log('Admin:      admin@evidentia.legal / admin123');
  console.log('User Admin: firmadmin@evidentia.legal / useradmin123');
  console.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
