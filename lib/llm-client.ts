/**
 * LLM Client for Evidentia - calls RouteLLM API for legal analysis
 */

const LLM_API_URL = 'https://apps.abacus.ai/v1/chat/completions';

interface LLMCallOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callLLM(options: LLMCallOptions): Promise<string> {
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) {
    throw new Error('ABACUSAI_API_KEY is not configured');
  }

  const { model, systemPrompt, userPrompt, maxTokens = 8000, temperature = 0.1 } = options;

  console.log(`[LLM] Calling model=${model}, prompt length=${userPrompt.length} chars`);

  const response = await fetch(LLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[LLM] API error ${response.status}: ${errorText}`);
    throw new Error(`LLM API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('LLM API returned empty content');
  }

  console.log(`[LLM] Response received, length=${content.length} chars`);
  return content;
}
