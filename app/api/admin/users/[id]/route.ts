export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken, isAdmin } from '@/lib/api-utils';

// PATCH /api/admin/users/[id] — update role and/or subscriptionTier
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(req);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { role, subscriptionTier, organisationId } = body;

    const updateData: Record<string, unknown> = {};
    if (role) updateData.role = role;
    if (subscriptionTier) updateData.subscriptionTier = subscriptionTier;
    if (organisationId) updateData.organisationId = organisationId;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        subscriptionTier: true,
        organisationId: true,
        isActive: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/admin/users/[id] — fetch single user
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(req);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const found = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        subscriptionTier: true,
        organisationId: true,
        isActive: true,
        createdAt: true,
      }
    });

    if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(found);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
