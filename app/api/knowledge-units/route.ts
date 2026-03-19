export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken } from '@/lib/api-utils';

// GET /api/knowledge-units?matterId=xxx
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matterId = req.nextUrl.searchParams.get('matterId');
    if (!matterId) {
      return NextResponse.json({ error: 'matterId is required' }, { status: 400 });
    }

    // Verify the user owns this matter
    const matter = await prisma.matter.findFirst({
      where: { id: matterId, userId: user.sub },
    });
    if (!matter) {
      return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
    }

    const knowledgeUnits = await prisma.knowledgeUnit.findMany({
      where: { matterId },
      orderBy: [{ tierExtracted: 'asc' }, { orderIndex: 'asc' }],
    });

    return NextResponse.json(knowledgeUnits);
  } catch (error) {
    console.error('Error fetching knowledge units:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
