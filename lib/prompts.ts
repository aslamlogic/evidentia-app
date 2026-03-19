/**
 * Protocol-guided AI prompts for legal analysis.
 * Embeds SMR v5.6 and LWP v1.3.3 compliance rules directly into prompts.
 * Port of Python ai_service/prompts.py to TypeScript for Next.js API routes.
 */

export const SYSTEM_PROMPT_BASE = `You are Evidentia Legal Intelligence, a protocol-governed legal analysis system.

## GOVERNING PROTOCOLS
You operate under two mandatory protocols:
1. **SUPRA-METARULES (SMR) v5.6** — Constitutional Governance (Level 1)
2. **LEGAL WORK PROTOCOL (LWP) v1.3.3** — Domain Protocol (subordinate to SMR)

## MANDATORY COMPLIANCE RULES

### Truth & Evidence (SMR 1.x)
- You MUST NOT fabricate factual content (SMR 1.1.1)
- Any speculative statement MUST be explicitly marked as speculation (SMR 1.1.2)
- All factual claims must be supported by evidence or logical derivation (SMR 1.2.1)
- All reasoning steps must be visible, complete, and inspectable (SMR 1.3.1)

### Reasoning Mode (SMR 2.x)
- You operate in DETERMINISTIC MODE by default (SMR 2.2.1)
- No probabilistic reasoning unless explicitly requested (SMR 2.2.2)
- All reasoning must be articulated in sequential steps (SMR 2.3.1)

### Legal Work Scope (LWP 1.x)
- Legal work is LIMITED TO: research, drafting support, procedural assistance, document preparation (LWP 1.1)
- Legal research includes: identification, summarisation, comparison of statutes, regulations, case law (LWP 1.2)
- Drafting support includes: draft pleadings, skeleton arguments, chronologies, memoranda (LWP 1.3)
- Procedural assistance includes: evidence collation, indexing, bundling (LWP 1.4)

### ABSOLUTE PROHIBITIONS (LWP 2.1.x)
- You MUST NOT provide legal advice (LWP 2.1.1)
- You MUST NOT apply the law deterministically to an individual's circumstances (LWP 2.1.2)
- You MUST NOT predict legal outcomes (LWP 2.1.3)
- You MUST NOT represent before courts or tribunals (LWP 2.1.4)

### Jurisdiction Lock (LWP 3.x)
- Every legal artefact MUST explicitly state jurisdiction (LWP 3.1)
- Cross-jurisdictional blending is prohibited unless explicitly instructed (LWP 3.3)

### Labelling (LWP 4.x)
- Every output must be classified as: legal information, draft material, or procedural assistance (LWP 4.1)
- All drafts carry the label: "Draft for review by a qualified legal professional" (LWP 4.2)

### Evidence & Versioning (LWP 6.x)
- All legal propositions must be supported by identifiable authority (LWP 6.1)
- All artefacts must be version-labelled (LWP 6.2)

### Interpretive Materials (LWP 7.x)
- Explanatory Notes are permitted interpretive authority (LWP 7.1.1)
- Explanatory Notes do not constitute binding law (LWP 7.1.3)
- Where Explanatory Notes are relied upon, the statutory provision must also be cited (LWP 7.3.1)

### Pre-Output Self-Audit (SMR 5.1)
Before generating ANY output, verify:
1. No fabricated content
2. All claims evidence-backed
3. No legal advice given
4. Jurisdiction stated
5. Appropriate labels applied
6. Reasoning visible and sequential
`;

interface PromptContext {
  matterTitle: string;
  jurisdiction: string;
  caseFacts: string;
  intakeData: string;
  documentsText: string;
  instructions?: string;
}

/**
 * Separates "[ADDITIONAL FACTS / NEW EVIDENCE]" block from general instructions.
 * Returns { additionalFacts, remainingInstructions }.
 */
function parseInstructions(instructions?: string): { additionalFacts: string; remainingInstructions: string } {
  if (!instructions) return { additionalFacts: '', remainingInstructions: '' };
  const match = instructions.match(/\[ADDITIONAL FACTS \/ NEW EVIDENCE\]\n([\s\S]*?)(?:\n\n|$)([\s\S]*)/);
  if (match) {
    return { additionalFacts: match[1].trim(), remainingInstructions: match[2]?.trim() || '' };
  }
  return { additionalFacts: '', remainingInstructions: instructions.trim() };
}

/**
 * Renders the combined instructions + additional facts sections for a prompt.
 * Additional facts are rendered as a substantive evidence section (not as instructions).
 */
function renderInstructionsAndFacts(ctx: PromptContext): string {
  const { additionalFacts, remainingInstructions } = parseInstructions(ctx.instructions);
  let sections = '';
  if (remainingInstructions) {
    sections += `### ADDITIONAL INSTRUCTIONS\n${remainingInstructions}\n\n`;
  }
  if (additionalFacts) {
    sections += `### ADDITIONAL FACTS / NEW EVIDENCE (User-Supplied)\nThe following facts have been introduced by the instructing party and MUST be treated as substantive evidence in your analysis. Incorporate these facts into your reasoning, conclusions, and any tables or schedules produced. Where these facts affect, strengthen, or weaken the analysis, explicitly state how.\n\n${additionalFacts}\n\n`;
  }
  return sections;
}

function buildScopingAnalysisPrompt(ctx: PromptContext): string {
  return `## TASK: Scoping Analysis

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Legal Information — Legal Research (LWP 4.1)

### INSTRUCTIONS
Perform an initial scoping analysis of this matter. Evaluate:

1. **Matter Overview** — What the case is about, key parties, nature of dispute
2. **Complexity Assessment** — Factors affecting complexity:
   - Number of parties
   - Number of potentially applicable statutes/regulations
   - Jurisdictional layers
   - Temporal span of events
3. **Key Legal Areas** — Primary areas of law that appear relevant
4. **Document Assessment** — Summary of available evidence and gaps
5. **Risk Indicators** — Limitation periods, urgent deadlines, or preservation issues
6. **Recommended Next Steps** — What further analysis may be warranted

### COMPLIANCE REQUIREMENTS
- Legal research per LWP 1.2
- Do NOT provide legal advice (LWP 2.1.1)
- Clear jurisdiction statement (LWP 3.1)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce as structured scoping document.

End with compliance footer per LWP 4.2.
`;
}

function buildCaseSummaryPrompt(ctx: PromptContext): string {
  return `## TASK: Generate Comprehensive Case Summary

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Legal Research & Drafting Support (LWP 4.1)

### INSTRUCTIONS
Produce a detailed case summary based on the documents and intake data provided. The summary should include:

1. **Case Overview** — Brief description of the dispute and parties involved
2. **Key Facts** — Material facts extracted from documents, with source citations
3. **Parties and Roles** — Identify all parties, their roles, and relationships
4. **Timeline Summary** — High-level chronological overview of key events
5. **Issues Identified** — Legal issues that arise from the facts (as legal information, NOT advice)
6. **Evidential Position** — Assessment of available evidence and gaps
7. **Procedural Status** — Current procedural position and any upcoming deadlines

### COMPLIANCE REQUIREMENTS
- Preparation of memoranda per LWP 1.3
- All factual claims must be evidence-backed (SMR 1.2.1)
- Do NOT fabricate any facts (SMR 1.1.1)
- Speculative observations MUST be labelled as speculative and non-advisory (LWP 2.2.3)
- Do NOT provide legal advice or predict outcomes (LWP 2.1.1, 2.1.3)
- Do NOT apply law deterministically to the individual's circumstances (LWP 2.1.2)
- All legal propositions must cite identifiable authority (LWP 6.1)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce the case summary as structured Markdown with the sections listed above.

End with:
- "Draft for review by a qualified legal professional." (LWP 4.2)
- This constitutes legal information and draft material only, not legal advice (LWP 2.1.1)
`;
}

function buildLawsAffectedPrompt(ctx: PromptContext): string {
  return `## TASK: Identify and Analyse Laws Affected

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Legal Research (LWP 4.1)

### INSTRUCTIONS
Based on the case documents and facts, identify all relevant legislation, regulations, and legal authorities applicable to this matter within the stated jurisdiction.

For each identified law:
1. **Full statutory reference** (Act, section, subsection)
2. **Relevance** — How it relates to the case facts
3. **Key provisions** — Summarise the relevant sections
4. **Explanatory Notes** (if applicable, per LWP 7.1.1 — with statutory provision also cited per LWP 7.3.1)
5. **Related case law** (if known — identify relevant reported decisions)
6. **Regulatory framework** — Identify relevant regulations, codes of practice, guidance

### COMPLIANCE REQUIREMENTS
- Identification and structured presentation of statutes, regulations, case law (LWP 1.2)
- All legal propositions supported by identifiable authority (LWP 6.1)
- Do NOT apply law to individual circumstances (LWP 2.1.2)
- No fabrication of legislation or case law (SMR 1.1.1)
- If uncertain about a legal authority, state uncertainty explicitly (SMR 1.1.4)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce as structured Markdown. Group laws by category.

End with compliance footer per LWP 4.2.
`;
}

function buildChronologyPrompt(ctx: PromptContext): string {
  return `## TASK: Generate Detailed Legal Chronology

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Procedural Assistance (LWP 4.1)

### INSTRUCTIONS
Analyse the case documents and intake information below and produce a comprehensive chronology of events.

For each event, provide:
1. **Date** (exact or approximate with qualifier)
2. **Event description** (factual, evidence-based)
3. **Source** (which document or intake field provides this information)
4. **Legal significance** (brief note on why this event matters — as legal information, NOT advice)

### COMPLIANCE REQUIREMENTS
- Evidence collation and indexing per LWP 1.4
- All dates must be sourced from provided documents (SMR 1.2.1)
- Do NOT fabricate dates or events (SMR 1.1.1)
- If a date is uncertain, explicitly state "Date approximate" or "Date not confirmed" (SMR 1.1.2)
- State jurisdiction: ${ctx.jurisdiction} (LWP 3.1)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce the chronology as a Markdown table with columns: Date | Event | Source | Legal Significance

Follow with analysis notes explaining the evidential basis for the chronology.

End with the compliance footer:
- "Draft for review by a qualified legal professional." (LWP 4.2)
- This constitutes legal information and procedural assistance only, not legal advice (LWP 2.1.1)
`;
}

function buildIssuesListPrompt(ctx: PromptContext): string {
  return `## TASK: Generate Issues List

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Legal Research & Drafting Support (LWP 4.1)

### INSTRUCTIONS
Identify and catalogue all legal issues arising from this matter:

1. **Issue identification** — Each discrete legal issue
2. **Category** — Substantive, procedural, evidential, or jurisdictional
3. **Applicable law** — Statutes, regulations, or case law relevant to each issue
4. **Factual basis** — Which facts from the case support or relate to this issue
5. **Evidential status** — Whether evidence exists, is partial, or is missing
6. **Priority** — High, Medium, or Low based on significance to the matter
7. **Interconnections** — How issues relate to each other

### COMPLIANCE REQUIREMENTS
- Legal research per LWP 1.2
- All issues must be evidence-based (SMR 1.2.1)
- Do NOT provide legal advice (LWP 2.1.1)
- Do NOT predict outcomes (LWP 2.1.3)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce as numbered list with full detail per issue.

End with compliance footer per LWP 4.2.
`;
}

function buildCauseOfActionMatrixPrompt(ctx: PromptContext): string {
  return `## TASK: Generate Cause of Action Matrix

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Legal Research (LWP 4.1)

### INSTRUCTIONS
Construct a cause of action matrix identifying all potential causes of action:

1. **Cause of action** — Legal name and statutory/common law basis
2. **Elements** — Required elements that must be satisfied
3. **Evidence mapping** — Which available evidence supports each element
4. **Gaps** — Where evidence is missing or weak
5. **Limitation period** — Applicable limitation period and current status
6. **Remedies available** — Types of remedies potentially available (as legal information)

### COMPLIANCE REQUIREMENTS
- Legal research per LWP 1.2
- All causes of action must be supported by identifiable authority (LWP 6.1)
- Do NOT predict outcomes (LWP 2.1.3)
- No fabrication (SMR 1.1.1)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce as structured matrix table.

End with compliance footer per LWP 4.2.
`;
}

function buildBreachesMapPrompt(ctx: PromptContext): string {
  return `## TASK: Generate Breaches Map

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Legal Research (LWP 4.1)

### INSTRUCTIONS
Map all identified or potential breaches across the matter:

1. **Breach identification** — Nature of the alleged breach
2. **Legal basis** — Statute, regulation, contract clause, or duty breached
3. **Parties** — Who is alleged to have breached and against whom
4. **Evidence** — Available evidence supporting or challenging the breach allegation
5. **Severity** — Assessment of severity based on available information
6. **Interconnections** — How breaches relate to each other

### COMPLIANCE REQUIREMENTS
- Legal research per LWP 1.2
- All breach allegations must be evidence-based (SMR 1.2.1)
- Do NOT provide legal advice or predict outcomes (LWP 2.1.1, 2.1.3)
- No fabrication (SMR 1.1.1)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce as structured breaches map with full detail.

End with compliance footer per LWP 4.2.
`;
}

function buildEvidenceSchedulePrompt(ctx: PromptContext): string {
  return `## TASK: Generate Evidence Schedule

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Procedural Assistance (LWP 4.1)

### INSTRUCTIONS
Compile a comprehensive evidence schedule for this matter:

1. **Evidence item** — Description of the document or evidence
2. **Source** — Where it came from
3. **Date** — When it was created or received
4. **Relevance** — Which issues it relates to
5. **Status** — Available, to be obtained, or not available
6. **Authentication** — Notes on authenticity or admissibility considerations
7. **Privilege** — Whether privilege may apply

### COMPLIANCE REQUIREMENTS
- Evidence collation, indexing, bundling per LWP 1.4
- All entries must be sourced (SMR 1.2.1)
- Do NOT fabricate evidence items (SMR 1.1.1)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce as structured evidence schedule table.

End with compliance footer per LWP 4.2.
`;
}

function buildDraftingPackPrompt(ctx: PromptContext): string {
  return `## TASK: Generate Drafting Pack

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Drafting Support (LWP 4.1)

### INSTRUCTIONS
Prepare a comprehensive drafting pack that includes:

1. **Draft Particulars of Claim / Statement of Case** — Based on identified causes of action and facts
2. **Key Chronology** — Timeline for inclusion in the statement of case
3. **List of Documents** — Documents to be disclosed or relied upon
4. **Draft Witness Statement Outline** — Key points to be covered
5. **Draft Directions** — Suggested case management directions

### COMPLIANCE REQUIREMENTS
- Drafting support per LWP 1.3
- All draft documents must be version-labelled (LWP 6.2)
- Every draft must carry: "Draft for review by a qualified legal professional" (LWP 4.2)
- Do NOT provide legal advice (LWP 2.1.1)
- All legal propositions must cite authority (LWP 6.1)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce each draft document as a separate section with clear headings.

End each section with compliance footer per LWP 4.2.
`;
}

function buildDefensesProsecutionPrompt(ctx: PromptContext): string {
  return `## TASK: Generate Defences / Prosecution Analysis

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Legal Research (LWP 4.1)

### INSTRUCTIONS
Analyse potential defences and prosecution/claimant arguments:

1. **Available Defences** — For each identified cause of action, what defences may be available
2. **Statutory Defences** — Any statutory defences with full references
3. **Common Law Defences** — Applicable common law defences with authorities
4. **Prosecution/Claimant Strengths** — Analysis of strong points
5. **Prosecution/Claimant Weaknesses** — Potential vulnerabilities
6. **Evidence Assessment** — How evidence maps to each argument

### COMPLIANCE REQUIREMENTS
- Legal research per LWP 1.2
- All defences and arguments must be supported by authority (LWP 6.1)
- Do NOT predict outcomes (LWP 2.1.3)
- Do NOT provide legal advice (LWP 2.1.1)
- No fabrication (SMR 1.1.1)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce as structured analysis.

End with compliance footer per LWP 4.2.
`;
}

function buildLawyerCasePackPrompt(ctx: PromptContext): string {
  return `## TASK: Generate Lawyer Case Pack

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Comprehensive Drafting Support (LWP 4.1)

### INSTRUCTIONS
Assemble a complete Lawyer Case Pack integrating all prior analysis tiers:

1. **Executive Summary** — High-level case overview for the instructing solicitor
2. **Case Theory** — Primary and alternative case theories based on facts and law
3. **Comprehensive Chronology** — Detailed timeline with source citations
4. **Legal Framework** — All applicable legislation, case law, and regulations
5. **Issues Matrix** — Complete list of legal issues with evidence mapping
6. **Causes of Action / Defence Analysis** — Full matrix with elements and evidence
7. **Evidence Assessment** — Complete evidence schedule with gap analysis
8. **Risk Assessment** — Key risks and mitigation strategies (as legal information)
9. **Recommended Actions** — Procedural next steps and deadlines
10. **Document Bundle Index** — Organised index of all case documents

### COMPLIANCE REQUIREMENTS
- Comprehensive legal research, drafting support, and procedural assistance (LWP 1.1-1.4)
- All factual claims evidence-backed (SMR 1.2.1)
- All legal propositions cite identifiable authority (LWP 6.1)
- Version-labelled (LWP 6.2)
- Do NOT provide legal advice (LWP 2.1.1)
- Do NOT predict outcomes (LWP 2.1.3)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce as comprehensive document with all 10 sections clearly structured.

End each section and the overall document with compliance footer per LWP 4.2.
`;
}

function buildAdversarialAnalysisPrompt(ctx: PromptContext): string {
  return `## TASK: Adversarial Analysis (Devil's Advocate)

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Legal Research (LWP 4.1)

### INSTRUCTIONS
Perform an adversarial analysis challenging the primary case theory:

1. **Primary Case Theory** — State the primary case theory as understood from the documents
2. **Counter-Narratives** — Generate alternative interpretations of the facts
3. **Rebuttal Arguments** — For each key proposition, identify the strongest rebuttal
4. **Distinguished Authorities** — Identify cases or statutes that could be distinguished or that support the opposing view
5. **Factual Vulnerabilities** — Weaknesses in the factual record
6. **Evidential Challenges** — How the opponent might challenge evidence
7. **Alternative Legal Theories** — What legal theories might the opposing party advance
8. **Argument Strength Assessment** — Rate each adversarial point on a 1-4 scale

### COMPLIANCE REQUIREMENTS
- Legal research per LWP 1.2
- All counter-arguments must be evidence-based (SMR 1.2.1)
- Adversarial arguments must be labelled as such (SMR 1.1.2)
- Do NOT provide legal advice (LWP 2.1.1)
- No fabrication of authorities (SMR 1.1.1)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce as structured adversarial analysis with all 8 sections.

End with compliance footer per LWP 4.2.
`;
}

function buildStressTestPrompt(ctx: PromptContext): string {
  return `## TASK: Stress Test Analysis

### Matter: ${ctx.matterTitle}
### Jurisdiction: ${ctx.jurisdiction} (LWP 3.1 — Jurisdiction Lock)
### Classification: Draft Material — Legal Research (LWP 4.1)

### INSTRUCTIONS
Perform a comprehensive stress test of the case theory:

1. **Case Theory Summary** — State the primary case theory being tested
2. **Vulnerability Analysis** — Identify the top vulnerabilities in the case
3. **Worst-Case Scenarios** — What are the worst realistic outcomes for each issue
4. **Evidence Gaps** — Critical missing evidence that could undermine the case
5. **Legal Uncertainty** — Areas where the law is unclear or developing
6. **Procedural Risks** — Risks relating to procedure, limitation, jurisdiction
7. **Opponent Strategy** — What strategy would a competent opponent adopt
8. **Mitigation Strategies** — How each vulnerability might be addressed (as procedural assistance)
9. **Overall Resilience Score** — Assessment of how well the case withstands scrutiny

### COMPLIANCE REQUIREMENTS
- Legal research per LWP 1.2
- All vulnerabilities must be evidence-based (SMR 1.2.1)
- Stress test findings are legal information, NOT advice (LWP 2.1.1)
- Do NOT predict outcomes (LWP 2.1.3)
- No fabrication (SMR 1.1.1)

${renderInstructionsAndFacts(ctx)}
### CASE DOCUMENTS AND FACTS
${ctx.caseFacts}

### CLIENT INTAKE DATA
${ctx.intakeData}

### UPLOADED DOCUMENTS CONTENT
${ctx.documentsText}

### OUTPUT FORMAT
Produce as structured stress test report with all 9 sections.

End with compliance footer per LWP 4.2.
`;
}

export const PROMPT_BUILDERS: Record<string, (ctx: PromptContext) => string> = {
  // Basic (Tier 1)
  scoping_analysis: buildScopingAnalysisPrompt,
  laws_affected: buildLawsAffectedPrompt,
  case_summary: buildCaseSummaryPrompt,
  // Silver (Tier 2)
  chronology: buildChronologyPrompt,
  issues_list: buildIssuesListPrompt,
  cause_of_action_matrix: buildCauseOfActionMatrixPrompt,
  breaches_map: buildBreachesMapPrompt,
  evidence_schedule: buildEvidenceSchedulePrompt,
  // Gold (Tier 3)
  drafting_pack: buildDraftingPackPrompt,
  defenses_prosecution: buildDefensesProsecutionPrompt,
  // Platinum (Tier 4)
  lawyer_case_pack: buildLawyerCasePackPrompt,
  adversarial_analysis: buildAdversarialAnalysisPrompt,
  stress_test: buildStressTestPrompt,
};

export const TASK_LABELS: Record<string, string> = {
  scoping_analysis: 'Scoping Analysis',
  laws_affected: 'Laws Affected',
  case_summary: 'Case Summary',
  chronology: 'Chronology',
  issues_list: 'Issues List',
  cause_of_action_matrix: 'Cause of Action Matrix',
  breaches_map: 'Breaches Map',
  evidence_schedule: 'Evidence Schedule',
  drafting_pack: 'Drafting Pack',
  defenses_prosecution: 'Defences / Prosecution',
  lawyer_case_pack: 'Lawyer Case Pack',
  adversarial_analysis: 'Adversarial Analysis',
  stress_test: 'Stress Test',
};

// Model routing based on task tier complexity
export function getModelForTask(taskType: string): string {
  const platinumTasks = ['lawyer_case_pack', 'adversarial_analysis', 'stress_test'];
  const goldTasks = ['drafting_pack', 'defenses_prosecution'];
  
  if (platinumTasks.includes(taskType)) return 'claude-sonnet-4-20250514';
  if (goldTasks.includes(taskType)) return 'gpt-4.1';
  return 'gpt-4.1-mini';
}
