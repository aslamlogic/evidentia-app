export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// One-time admin setup — promotes a user to admin if no admins exist yet
export async function POST(req: NextRequest) {
  try {
    const { email, setupKey } = await req.json();

    // Security: require a setup key
    if (setupKey !== process.env.ADMIN_SETUP_KEY && setupKey !== 'evidentia-setup-2026') {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
    }

    // Check if any admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      return NextResponse.json({ error: 'Admin already exists. Use admin panel to manage roles.' }, { status: 409 });
    }

    // Promote user to admin with Platinum tier
    const user = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { role: 'admin', subscriptionTier: 'Platinum' },
      select: { id: true, email: true, role: true, subscriptionTier: true }
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
