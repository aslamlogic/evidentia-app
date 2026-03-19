export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken } from '@/lib/api-utils';

// GET /api/outputs/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const output = await prisma.aIOutput.findFirst({
      where: {
        id: params.id,
        userId: user.sub,
      },
      include: {
        task: { 
          select: { 
            id: true, 
            taskType: true, 
            instructions: true,
            matter: { select: { id: true, title: true } },
          } 
        },
      },
    });

    if (!output) {
      return NextResponse.json({ error: 'Output not found' }, { status: 404 });
    }

    // Transform for backwards compatibility
    const transformed = {
      ...output,
      content: output.contentMarkdown,
      matter: output.task?.matter,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching output:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
