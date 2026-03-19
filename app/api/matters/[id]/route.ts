export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'evidentia-secret-key';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tier: string;
}

function getUserFromToken(req: NextRequest): JwtPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// GET /api/matters/[id] - Get a specific matter
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matter = await prisma.matter.findFirst({
      where: {
        id: params.id,
        userId: user.sub,
      },
      include: {
        documents: true,
        tasks: true,
      },
    });

    if (!matter) {
      return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
    }

    return NextResponse.json(matter);
  } catch (error) {
    console.error('Error fetching matter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/matters/[id] - Update a matter
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const existing = await prisma.matter.findFirst({
      where: { id: params.id, userId: user.sub },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, type, status, clientName, clientEmail } = body;

    const matter = await prisma.matter.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(type && { matterType: type }),
        ...(status && { status }),
        ...(clientName !== undefined && { clientName }),
        ...(clientEmail !== undefined && { clientEmail }),
      },
    });

    return NextResponse.json(matter);
  } catch (error) {
    console.error('Error updating matter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/matters/[id] - Delete a matter
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const existing = await prisma.matter.findFirst({
      where: { id: params.id, userId: user.sub },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
    }

    await prisma.matter.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting matter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
