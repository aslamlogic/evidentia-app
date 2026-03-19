export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken } from '@/lib/api-utils';

// GET /api/outputs - List outputs
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outputs = await prisma.aIOutput.findMany({
      where: {
        userId: user.sub,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        task: { 
          select: { 
            id: true, 
            taskType: true,
            matter: { select: { id: true, title: true } },
          } 
        },
      },
    });

    // Transform to include matter at top level for backwards compatibility
    const transformed = outputs.map(output => ({
      ...output,
      content: output.contentMarkdown,
      matter: output.task?.matter,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching outputs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
