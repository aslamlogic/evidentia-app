export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken } from '@/lib/api-utils';
import { callLLM } from '@/lib/llm-client';
import { SYSTEM_PROMPT_BASE, PROMPT_BUILDERS, TASK_LABELS, getModelForTask } from '@/lib/prompts';
import { extractKnowledgeUnits, getTierForTask } from '@/lib/ku-extraction';

// POST /api/tasks/[id]/execute - Execute a task with real LLM
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.aITask.findFirst({
      where: {
        id: params.id,
        matter: { userId: user.sub },
      },
      include: {
        matter: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'pending') {
      return NextResponse.json({ error: 'Task has already been executed' }, { status: 400 });
    }

    // Update task to processing
    await prisma.aITask.update({
      where: { id: params.id },
      data: { status: 'processing', startedAt: new Date() },
    });

    // Return the processing status immediately, then process in background
    const updatedTask = await prisma.aITask.findUnique({
      where: { id: params.id },
      include: {
        matter: { select: { id: true, title: true } },
      },
    });

    // Execute AI processing in the background (non-blocking)
    executeTaskInBackground(params.id, task, user.sub).catch((err) => {
      console.error(`[TaskExec] Background execution error for task ${params.id}:`, err);
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error executing task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function executeTaskInBackground(
  taskId: string,
  task: { taskType: string; instructions: string | null; matterId: string; userId: string; matter: { id: string; title: string; matterType: string; description: string | null; clientName: string | null; jurisdiction: string } },
  userId: string
) {
  const startTime = Date.now();
  const taskType = task.taskType || 'scoping_analysis';
  const label = TASK_LABELS[taskType] || taskType;

  try {
    console.log(`[TaskExec] Starting execution: task=${taskId}, type=${taskType}, matter=${task.matter.title}`);

    // 1. Fetch all documents for this matter with extracted text
    const documents = await prisma.document.findMany({
      where: { matterId: task.matterId },
      select: {
        id: true,
        filename: true,
        originalName: true,
        extractedText: true,
        status: true,
      },
    });

    // 2. Assemble document text
    const documentsWithText = documents.filter((d) => d.extractedText && d.extractedText.length > 0);
    let documentsText = '';
    
    if (documentsWithText.length === 0) {
      documentsText = '[No document text available. Analysis is based on matter description and intake data only.]';
      console.log(`[TaskExec] WARNING: No extracted text available for matter ${task.matterId}`);
    } else {
      documentsText = documentsWithText
        .map((d, i) => {
          // Truncate very long documents to avoid token limits
          const text = (d.extractedText || '').slice(0, 50000);
          return `--- Document ${i + 1}: ${d.originalName || d.filename} ---\n${text}\n--- End Document ${i + 1} ---`;
        })
        .join('\n\n');
      console.log(`[TaskExec] Assembled ${documentsWithText.length} documents, total ${documentsText.length} chars`);
    }

    // 3. Build context
    const caseFacts = task.matter.description || 'No case description provided.';
    const intakeData = task.matter.clientName
      ? `Client: ${task.matter.clientName}\nMatter Type: ${task.matter.matterType}\nJurisdiction: ${task.matter.jurisdiction || 'Not specified'}`
      : 'No intake data available.';
    const jurisdiction = task.matter.jurisdiction || 'United Kingdom (England and Wales)';

    // 4. Get the prompt builder for this task type
    const promptBuilder = PROMPT_BUILDERS[taskType];
    if (!promptBuilder) {
      throw new Error(`No prompt builder for task type: ${taskType}`);
    }

    const userPrompt = promptBuilder({
      matterTitle: task.matter.title,
      jurisdiction,
      caseFacts,
      intakeData,
      documentsText,
      instructions: task.instructions || undefined,
    });

    // 5. Select model based on task tier
    const model = getModelForTask(taskType);

    console.log(`[TaskExec] Calling LLM: model=${model}, prompt=${userPrompt.length} chars`);

    // 6. Call the LLM
    const llmResponse = await callLLM({
      model,
      systemPrompt: SYSTEM_PROMPT_BASE,
      userPrompt,
      maxTokens: taskType === 'lawyer_case_pack' ? 16000 : 8000,
      temperature: 0.1,
    });

    const processingTimeMs = Date.now() - startTime;

    // 7. Extract Knowledge Units from the analysis output
    // Parse additional facts from instructions if present
    let additionalFacts: string | null = null;
    if (task.instructions) {
      const factsMatch = task.instructions.match(/\[ADDITIONAL FACTS \/ NEW EVIDENCE\]\n([\s\S]*?)(?:\n\n|$)/);
      if (factsMatch) {
        additionalFacts = factsMatch[1].trim();
      }
    }

    const tierLevel = getTierForTask(taskType);
    console.log(`[TaskExec] Extracting Knowledge Units (tier=${tierLevel}, hasAdditionalFacts=${!!additionalFacts})`);
    
    const extractedKUs = await extractKnowledgeUnits(llmResponse, additionalFacts, taskType);
    console.log(`[TaskExec] Extracted ${extractedKUs.length} Knowledge Units`);

    // 7b. Persist Knowledge Units to database
    if (extractedKUs.length > 0) {
      const existingKUs = await prisma.knowledgeUnit.count({ where: { matterId: task.matterId } });
      
      await prisma.knowledgeUnit.createMany({
        data: extractedKUs.map((ku, idx) => ({
          matterId: task.matterId,
          modality: ku.modality as 'Empirical' | 'Normative',
          quotationText: ku.quotationText,
          analyticalParaphrase: ku.analyticalParaphrase,
          interpretiveCommentary: ku.interpretiveCommentary,
          sourceReference: ku.sourceReference,
          confidence: ku.confidence,
          tierExtracted: tierLevel,
          orderIndex: existingKUs + idx,
        })),
      });

      console.log(`[TaskExec] Persisted ${extractedKUs.length} KUs for matter ${task.matterId}`);
    }

    // 8. Create the AI output
    await prisma.aIOutput.create({
      data: {
        contentMarkdown: llmResponse,
        version: 1,
        confidence: 0.90,
        smrCompliant: true,
        lwpCompliant: true,
        taskId,
        userId,
      },
    });

    // 9. Mark task as succeeded
    await prisma.aITask.update({
      where: { id: taskId },
      data: {
        status: 'succeeded',
        completedAt: new Date(),
        protocolCompliant: true,
        processingTimeMs,
      },
    });

    console.log(`[TaskExec] Task ${taskId} completed successfully in ${processingTimeMs}ms`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';
    console.error(`[TaskExec] Task ${taskId} failed:`, errorMessage);

    await prisma.aITask.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      },
    });
  }
}
