/**
 * Document text extraction for Evidentia.
 * Extracts text from DOCX and PDF files for LLM processing.
 */

import mammoth from 'mammoth';

/**
 * Extract text from a DOCX file buffer
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (err) {
    console.error('[Extractor] DOCX extraction failed:', err);
    // Fallback: try with ArrayBuffer
    try {
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || '';
    } catch (err2) {
      console.error('[Extractor] DOCX fallback extraction failed:', err2);
      throw new Error('Failed to extract text from DOCX file');
    }
  }
}

/**
 * Extract text from a PDF file by sending it to the LLM API.
 * Uses base64 encoding to send the PDF to the chat completions endpoint.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) {
    throw new Error('ABACUSAI_API_KEY is not configured');
  }

  const base64String = buffer.toString('base64');

  const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'file',
              file: {
                filename: 'document.pdf',
                file_data: `data:application/pdf;base64,${base64String}`,
              },
            },
            {
              type: 'text',
              text: 'Extract ALL text content from this PDF document. Return the complete text exactly as it appears, preserving structure, paragraphs, headings, lists, and tables. Do not summarize — return the full verbatim text content.',
            },
          ],
        },
      ],
      max_tokens: 16000,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PDF extraction API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Determine extraction method based on MIME type and extract text.
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/docx'
  ) {
    return extractDocxText(buffer);
  }
  if (mimeType === 'application/pdf') {
    return extractPdfText(buffer);
  }
  if (mimeType.startsWith('text/')) {
    return buffer.toString('utf-8');
  }
  throw new Error(`Unsupported file type for text extraction: ${mimeType}`);
}
