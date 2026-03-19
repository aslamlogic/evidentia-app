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
  console.log('✓ Admin user created:', admin.email);

  // Create reviewer user
  const reviewerPassword = await bcrypt.hash('reviewer123', 10);
  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@evidentia.legal' },
    update: {
      password: reviewerPassword,
      role: 'reviewer',
      subscriptionTier: 'Gold',
    },
    create: {
      email: 'reviewer@evidentia.legal',
      password: reviewerPassword,
      firstName: 'Legal',
      lastName: 'Reviewer',
      role: 'reviewer',
      subscriptionTier: 'Gold',
      isActive: true,
    },
  });
  console.log('✓ Reviewer user created:', reviewer.email);

  console.log('\n=== Seeding Complete ===');
  console.log('\nTest Accounts:');
  console.log('─────────────────────────────────────────────');
  console.log('Admin:    admin@evidentia.legal / admin123');
  console.log('Reviewer: reviewer@evidentia.legal / reviewer123');
  console.log('─────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
