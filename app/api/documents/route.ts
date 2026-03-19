export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken } from '@/lib/api-utils';
import { extractDocxText, extractPdfText } from '@/lib/document-extractor';

// GET /api/documents - List documents
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const matterId = searchParams.get('matterId');

    const documents = await prisma.document.findMany({
      where: {
        matter: { userId: user.sub },
        ...(matterId ? { matterId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        matter: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/documents - Upload document with text extraction
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const matterId = formData.get('matterId') as string | null;

    if (!file || !matterId) {
      return NextResponse.json({ error: 'File and matterId are required' }, { status: 400 });
    }

    // Verify matter ownership
    const matter = await prisma.matter.findFirst({
      where: { id: matterId, userId: user.sub },
    });

    if (!matter) {
      return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
    }

    // Read file content into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from the file
    let extractedText = '';
    let extractionStatus: 'processed' | 'failed' | 'pending' = 'pending';
    
    try {
      const mimeType = file.type;
      console.log(`[DocUpload] Extracting text from ${file.name} (${mimeType}, ${buffer.length} bytes)`);
      
      if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.docx')
      ) {
        extractedText = await extractDocxText(buffer);
        extractionStatus = 'processed';
      } else if (mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        extractedText = await extractPdfText(buffer);
        extractionStatus = 'processed';
      } else if (mimeType.startsWith('text/')) {
        extractedText = buffer.toString('utf-8');
        extractionStatus = 'processed';
      } else {
        console.log(`[DocUpload] Unsupported type for extraction: ${mimeType}`);
        extractionStatus = 'pending';
      }
      
      console.log(`[DocUpload] Extracted ${extractedText.length} characters from ${file.name}`);
    } catch (extractErr) {
      console.error('[DocUpload] Text extraction failed:', extractErr);
      extractionStatus = 'failed';
    }

    // Create document record with extracted text
    const document = await prisma.document.create({
      data: {
        filename: file.name,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        matterId,
        userId: user.sub,
        storagePath: `/uploads/${Date.now()}-${file.name}`,
        extractedText: extractedText || null,
        charCount: extractedText.length,
        status: extractionStatus,
      },
    });

    return NextResponse.json({
      ...document,
      extractionStatus,
      extractedChars: extractedText.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
