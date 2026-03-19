/**
 * Knowledge Unit (KU) Extraction Module
 * 
 * Implements KUP v1.5 extraction from LLM-generated legal analysis outputs.
 * Extracts discrete, self-contained statements of knowledge tagged by modality
 * (Empirical or Normative) and tier level.
 */

import { callLLM } from '@/lib/llm-client';

export interface ExtractedKU {
  modality: 'Empirical' | 'Normative';
  quotationText: string;
  analyticalParaphrase: string;
  interpretiveCommentary: string;
  sourceReference: string | null;
  confidence: number;
}

// Map task types to their tier level
const TASK_TIER_MAP: Record<string, 'Basic' | 'Silver' | 'Gold' | 'Platinum'> = {
  scoping_analysis: 'Basic',
  laws_affected: 'Basic',
  case_summary: 'Basic',
  chronology: 'Silver',
  issues_list: 'Silver',
  cause_of_action_matrix: 'Silver',
  breaches_map: 'Silver',
  evidence_schedule: 'Silver',
  drafting_pack: 'Gold',
  defenses_prosecution: 'Gold',
  lawyer_case_pack: 'Platinum',
  adversarial_analysis: 'Platinum',
  stress_test: 'Platinum',
};

export function getTierForTask(taskType: string): 'Basic' | 'Silver' | 'Gold' | 'Platinum' {
  return TASK_TIER_MAP[taskType] || 'Basic';
}

const KU_EXTRACTION_PROMPT = `You are a Knowledge Unit extractor operating under KUP v1.5.

A Knowledge Unit (KU) is a discrete, self-contained statement of knowledge extracted from legal analysis.
Each KU has:
- **modality**: Either "Empirical" (factual statement derived from evidence/documents) or "Normative" (legal/normative statement derived from law/regulation)
- **quotationText**: The verbatim excerpt from the source text
- **analyticalParaphrase**: A condensed restatement of the key point
- **interpretiveCommentary**: Signposted interpretation explaining significance
- **sourceReference**: Where this KU was found (document name, section, or "Additional Facts" if from user-supplied facts)
- **confidence**: A number 0.0-1.0 indicating extraction confidence

Extract ALL meaningful Knowledge Units from the provided text. Focus on:
1. Key factual findings (Empirical)
2. Legal principles and statutory references (Normative)
3. Any new facts or evidence introduced by the user (Empirical, tagged as from "Additional Facts")
4. Conclusions and determinations

Return ONLY a JSON array of KU objects. No markdown, no explanation, just the JSON array.
Example:
[
  {
    "modality": "Empirical",
    "quotationText": "The claimant commenced employment on 15 March 2019",
    "analyticalParaphrase": "Employment start date established as March 2019",
    "interpretiveCommentary": "This establishes the continuous employment period relevant to unfair dismissal rights under ERA 1996 s.108",
    "sourceReference": "Document 1: Employment Contract",
    "confidence": 0.95
  },
  {
    "modality": "Normative",
    "quotationText": "Under s.98(4) ERA 1996, the tribunal must consider whether dismissal was reasonable",
    "analyticalParaphrase": "Reasonableness test applies to dismissal assessment",
    "interpretiveCommentary": "This is the primary statutory test that governs the fairness of any dismissal",
    "sourceReference": "Employment Rights Act 1996",
    "confidence": 0.98
  }
]`;

/**
 * Extract Knowledge Units from LLM-generated analysis output.
 * 
 * @param analysisOutput - The full LLM-generated analysis text
 * @param additionalFacts - Any additional facts/evidence supplied by the user
 * @param taskType - The type of analysis task
 * @returns Array of extracted Knowledge Units
 */
export async function extractKnowledgeUnits(
  analysisOutput: string,
  additionalFacts: string | null,
  taskType: string
): Promise<ExtractedKU[]> {
  try {
    let textToAnalyse = analysisOutput;
    
    // If there are additional facts, append them prominently for extraction
    if (additionalFacts && additionalFacts.trim()) {
      textToAnalyse += `\n\n--- ADDITIONAL FACTS / NEW EVIDENCE (User-Supplied) ---\n${additionalFacts.trim()}\n--- END ADDITIONAL FACTS ---`;
    }

    // Truncate if very long to stay within token limits
    const maxChars = 30000;
    if (textToAnalyse.length > maxChars) {
      textToAnalyse = textToAnalyse.slice(0, maxChars) + '\n[...truncated for KU extraction]';
    }

    const userPrompt = `Extract Knowledge Units from the following ${taskType.replace(/_/g, ' ')} analysis output:\n\n${textToAnalyse}`;

    const response = await callLLM({
      model: 'gpt-4.1-mini',
      systemPrompt: KU_EXTRACTION_PROMPT,
      userPrompt,
      maxTokens: 4000,
      temperature: 0.0,
    });

    // Parse the JSON response
    const cleaned = response.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      console.warn('[KU-Extract] Response was not an array, skipping');
      return [];
    }

    // Validate and clean each KU
    return parsed
      .filter((ku: Record<string, unknown>) => ku.quotationText && ku.analyticalParaphrase && ku.interpretiveCommentary)
      .map((ku: Record<string, unknown>) => ({
        modality: ku.modality === 'Normative' ? 'Normative' : 'Empirical',
        quotationText: String(ku.quotationText),
        analyticalParaphrase: String(ku.analyticalParaphrase),
        interpretiveCommentary: String(ku.interpretiveCommentary),
        sourceReference: ku.sourceReference ? String(ku.sourceReference) : null,
        confidence: typeof ku.confidence === 'number' ? Math.min(1, Math.max(0, ku.confidence)) : 0.8,
      })) as ExtractedKU[];
  } catch (err) {
    console.error('[KU-Extract] Failed to extract Knowledge Units:', err);
    return [];
  }
}
