export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken } from '@/lib/api-utils';

// GET /api/tasks - List tasks
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await prisma.aITask.findMany({
      where: {
        matter: { userId: user.sub },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        matter: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks - Create task
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { matterId, type, taskType, instructions, documentIds } = body;

    if (!matterId || (!type && !taskType)) {
      return NextResponse.json({ error: 'Matter ID and task type are required' }, { status: 400 });
    }

    // Verify matter ownership
    const matter = await prisma.matter.findFirst({
      where: { id: matterId, userId: user.sub },
    });

    if (!matter) {
      return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
    }

    const task = await prisma.aITask.create({
      data: {
        taskType: taskType || type,
        instructions: instructions || null,
        matterId,
        userId: user.sub,
      },
      include: {
        matter: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
