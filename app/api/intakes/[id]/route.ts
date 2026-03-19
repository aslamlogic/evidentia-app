export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken } from '@/lib/api-utils';

// GET /api/intakes/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const intake = await prisma.intakeForm.findFirst({
      where: {
        id: params.id,
        userId: user.sub,
      },
      include: {
        matter: { select: { id: true, title: true } },
      },
    });

    if (!intake) {
      return NextResponse.json({ error: 'Intake form not found' }, { status: 404 });
    }

    return NextResponse.json(intake);
  } catch (error) {
    console.error('Error fetching intake:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/intakes/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const intake = await prisma.intakeForm.findFirst({
      where: {
        id: params.id,
        userId: user.sub,
      },
    });

    if (!intake) {
      return NextResponse.json({ error: 'Intake form not found' }, { status: 404 });
    }

    await prisma.intakeForm.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting intake:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
