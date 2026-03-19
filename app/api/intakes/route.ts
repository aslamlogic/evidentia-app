export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken } from '@/lib/api-utils';

// GET /api/intakes - List intake forms
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const intakes = await prisma.intakeForm.findMany({
      where: {
        userId: user.sub,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        matter: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(intakes);
  } catch (error) {
    console.error('Error fetching intakes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/intakes - Create intake form
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, matterId } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // If matterId provided, verify ownership
    if (matterId) {
      const matter = await prisma.matter.findFirst({
        where: { id: matterId, userId: user.sub },
      });
      if (!matter) {
        return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
      }
    }

    const intake = await prisma.intakeForm.create({
      data: {
        title,
        matterId: matterId || null,
        userId: user.sub,
        locked: false,
        answersJson: {},
      },
      include: {
        matter: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(intake, { status: 201 });
  } catch (error) {
    console.error('Error creating intake:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
