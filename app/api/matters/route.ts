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

// GET /api/matters - List all matters for the user
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matters = await prisma.matter.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            documents: true,
            tasks: true,
          },
        },
      },
    });

    return NextResponse.json(matters);
  } catch (error) {
    console.error('Error fetching matters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/matters - Create a new matter
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, type, clientName, clientEmail }  = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const matter = await prisma.matter.create({
      data: {
        title,
        description: description || null,
        matterType: type || 'civil',
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        userId: user.sub,
      },
    });

    return NextResponse.json(matter, { status: 201 });
  } catch (error) {
    console.error('Error creating matter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
