// ============ API Types for Evidentia Legal Intelligence ============
// Formal Technical Specification v1.2 Compliant

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'reviewer' | 'superuser';
  subscriptionTier: 'Basic' | 'Silver' | 'Gold' | 'Platinum';
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Matter {
  id: string;
  title: string;
  description?: string;
  practiceArea?: string;          // Legal domain (Spec 4.1)
  type: 'civil' | 'criminal' | 'family' | 'employment' | 'other';
  matterType?: string;
  jurisdiction: string;           // Required per Spec 4.1
  status: 'open' | 'in_progress' | 'closed' | 'archived';
  structuredInputPayload?: Record<string, unknown>;  // Validated intake data (Spec 4.1)
  clientName?: string;
  clientEmail?: string;
  referenceNumber?: string;
  userId: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
  tasks?: AITask[];
  outputs?: AIOutput[];
  knowledgeUnits?: KnowledgeUnit[];  // Spec 4.7
}

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  matterId: string;
  userId: string;
  extractedText?: string;
  contentHash?: string;           // SHA-256 for integrity (Spec requirement)
  status: 'pending' | 'processing' | 'processed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

// Full task type union - all 13 task types per tiered system
export type TaskType = 
  // Basic (Tier 1)
  | 'scoping_analysis'
  | 'laws_affected'
  | 'case_summary'
  // Silver (Tier 2)
  | 'chronology'
  | 'issues_list'
  | 'cause_of_action_matrix'
  | 'breaches_map'
  | 'evidence_schedule'
  // Gold (Tier 3)
  | 'drafting_pack'
  | 'defenses_prosecution'
  // Platinum (Tier 4)
  | 'lawyer_case_pack'
  | 'adversarial_analysis'
  | 'stress_test';

export interface AITask {
  id: string;
  taskType: TaskType;
  type?: TaskType;  // Alias for compatibility
  status: 'pending' | 'queued' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  instructions?: string;
  matterId: string;
  documentIds?: string[];
  userId: string;
  result?: string;
  errorMessage?: string;
  error?: string;
  protocolsApplied?: string[];
  processingTimeMs?: number;
  processingTime?: number;
  // Protocol compliance tracking (Spec 7)
  smrVersion?: string;
  kupVersion?: string;
  protocolCompliant?: boolean;
  // Tier snapshot (Spec 5b - audit-grade)
  tierSnapshotJson?: Record<string, unknown>;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  matter?: Matter;
  documents?: Document[];
}

export interface AIOutput {
  id: string;
  taskId: string;
  content: string;
  contentMarkdown?: string;
  format: string;
  version: number;
  protocolCompliance?: ProtocolCompliance;
  confidence?: number;
  sectionsJson?: Record<string, unknown>[];
  citationsJson?: Citation[];
  // AI metadata
  aiProvider?: string;
  aiModel?: string;
  tokensUsed?: number;
  generationTimeMs?: number;
  // New fields from Spec v1.2
  knowledgeUnits?: KnowledgeUnit[];
  complexityScore?: ComplexityScore;
  invocationRecord?: InvocationRecord;
  matterId: string;
  userId?: string;
  createdAt: string;
  updatedAt?: string;
  task?: AITask;
  matter?: Matter;
}

export interface ProtocolCompliance {
  smrVersion?: string;
  lwpVersion?: string;
  kupVersion?: string;  // Knowledge Unit Protocol
  compliant: boolean;
  smrCompliant?: boolean;
  lwpCompliant?: boolean;
  details?: string;
  rulesApplied?: string[];
  complianceNotes?: string[];
}

// ============ New Spec v1.2 Entities ============

// Spec 4.2 - Invocation Record
export interface InvocationRecord {
  invocationId: string;
  requestHash: string;       // SHA-256 of request
  responseHash: string;      // SHA-256 of response
  protocolVersion: string;
  temperature: number;
  modelTier: string;
}

// Spec 4.4 - Source (cited legal authority)
export interface Source {
  id: string;
  citationText: string;
  sourceType: 'Statute' | 'Case' | 'Regulation' | 'Secondary' | 'Other';
  referencedSection?: string;
  jurisdiction?: string;
  yearPublished?: number;
  verified?: boolean;
  extractedTimestamp: string;
}

// Alias for compatibility
export interface Citation {
  source: string;
  type: string;
  relevance: string;
  sourceType?: string;
  jurisdiction?: string;
  yearPublished?: number;
}

// Spec 4.7 - Knowledge Unit (KUP v1.5)
export interface KnowledgeUnit {
  id: string;
  modality: 'Empirical' | 'Normative';
  quotationText: string;           // Verbatim excerpt
  analyticalParaphrase: string;    // Condensed restatement
  interpretiveCommentary: string;  // Signposted interpretation
  sourceReference?: string;
  confidence?: number;
  tierExtracted?: 'Basic' | 'Silver' | 'Gold' | 'Platinum';
  orderIndex?: number;
}

// Spec 4.8 - Adversarial Knowledge Unit (Tier 4)
export interface AdversarialKnowledgeUnit {
  id: string;
  baseKuId: string;               // Base KU this is derived from
  targetKuId: string;             // Primary KU being rebutted
  functionType: 'rebut' | 'distinguish' | 'narrow' | 'reinterpret' | 'alternative_authority' | 'factual_counter';
  strengthRating: 1 | 2 | 3 | 4;  // 1-4 scale
  adversarialArgument: string;
  additionalSources?: Source[];
  reinterpretation?: string;
}

// Spec Section 9 - Complexity Scoring
export interface ComplexityScore {
  rawScore: number;
  normalizedScore: number;        // 0-100 scale
  recommendedTier: 'BASIC' | 'SILVER' | 'GOLD' | 'PLATINUM';
  modelTier: string;
  componentScores?: {
    document?: number;
    party?: number;
    statute?: number;
    jurisdiction?: number;
    temporal?: number;
    empiricalKu?: number;
    normativeKu?: number;
  };
  routingReason?: string;
}

// Spec 4.3 - Legal Artefact
export interface LegalArtefact {
  id: string;
  matterId: string;
  tierLevel: 'Basic' | 'Silver' | 'Gold' | 'Platinum';
  generatedText: string;
  contentMarkdown?: string;
  artefactType?: string;
  version: number;
  confidence?: number;
  generatedTimestamp: string;
  invocationId?: string;
}

// Stress Test Result (Tier 4)
export interface StressTestResult {
  overallStrength: number;        // 1-10 scale
  weakestPoints: { area: string; issue: string; severity: string }[];
  strongestPoints: { area: string; strength: string }[];
  missingEvidence: string[];
  vulnerableClaims: string[];
  recommendedActions: string[];
  adversarialSummary: string;
}

export interface IntakeForm {
  id: string;
  title: string;
  matterId?: string;
  fields: IntakeField[];
  responses: Record<string, string>;
  locked: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface DashboardStats {
  activeMatters: number;
  pendingTasks: number;
  completedOutputs: number;
  totalDocuments: number;
}

// ============ Task Type Labels & Descriptions ============
// Organized by tier per Formal Technical Spec v1.2

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  // Basic (Tier 1)
  scoping_analysis: 'Scoping Analysis',
  laws_affected: 'Laws Affected',
  case_summary: 'Case Summary',
  // Silver (Tier 2)
  chronology: 'Chronology',
  issues_list: 'Issues List',
  cause_of_action_matrix: 'Cause of Action Matrix',
  breaches_map: 'Breaches Map',
  evidence_schedule: 'Evidence Schedule',
  // Gold (Tier 3)
  drafting_pack: 'Drafting Pack',
  defenses_prosecution: 'Defences / Prosecution',
  // Platinum (Tier 4)
  lawyer_case_pack: 'Lawyer Case Pack',
  adversarial_analysis: 'Devil\'s Advocate Analysis',
  stress_test: 'Stress Test',
};

export const TASK_TYPE_DESCRIPTIONS: Record<TaskType, string> = {
  // Basic (Tier 1)
  scoping_analysis: 'Initial scoping and applicable law map with complexity assessment',
  laws_affected: 'Identify all relevant laws, statutes, and regulations affected',
  case_summary: 'Create a comprehensive summary of the case with key findings',
  // Silver (Tier 2)
  chronology: 'Generate a detailed timeline of events from case documents',
  issues_list: 'Identify and structure all legal and factual issues',
  cause_of_action_matrix: 'Map potential causes of action with elements analysis',
  breaches_map: 'Map out potential breaches and compliance violations with scenarios',
  evidence_schedule: 'Comprehensive evidence catalogue with relevance mapping',
  // Gold (Tier 3)
  drafting_pack: 'Complete drafting pack with summary, chronology, grounds, and breach schedule',
  defenses_prosecution: 'Analysis of defences/prosecution with case law pointers',
  // Platinum (Tier 4)
  lawyer_case_pack: 'Full lawyer-ready case file bundle with procedural roadmap',
  adversarial_analysis: 'Devil\'s Advocate counter-narrative and adversarial KU table',
  stress_test: 'Case theory stress test identifying weakest points and recommendations',
};

// Task tier mapping per Spec Section 8
export const TASK_TIER_MAP: Record<TaskType, 'Basic' | 'Silver' | 'Gold' | 'Platinum'> = {
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

export const MATTER_TYPE_LABELS: Record<string, string> = {
  civil: 'Civil',
  criminal: 'Criminal',
  family: 'Family',
  employment: 'Employment',
  other: 'Other',
};

// Tier features with all task types per Spec Section 8
export const TIER_FEATURES: Record<string, { 
  tasks: TaskType[]; 
  maxDocs: number; 
  label: string; 
  color: string;
  price: string;
  maxMatters: number;
  citationMode: string;
  humanReview: boolean;
  tier: number;
}> = {
  Basic: { 
    tasks: ['scoping_analysis', 'laws_affected', 'case_summary'], 
    maxDocs: 5, 
    label: 'Basic', 
    color: 'bg-gray-500',
    price: '£250/month',
    maxMatters: 2,
    citationMode: 'minimal',
    humanReview: false,
    tier: 1,
  },
  Silver: { 
    tasks: [
      'scoping_analysis', 'laws_affected', 'case_summary',
      'chronology', 'issues_list', 'cause_of_action_matrix', 'breaches_map', 'evidence_schedule'
    ], 
    maxDocs: 20, 
    label: 'Silver', 
    color: 'bg-slate-400',
    price: '£400/month',
    maxMatters: 8,
    citationMode: 'standard',
    humanReview: false,
    tier: 2,
  },
  Gold: { 
    tasks: [
      'scoping_analysis', 'laws_affected', 'case_summary',
      'chronology', 'issues_list', 'cause_of_action_matrix', 'breaches_map', 'evidence_schedule',
      'drafting_pack', 'defenses_prosecution'
    ], 
    maxDocs: 50, 
    label: 'Gold', 
    color: 'bg-amber-500',
    price: '£700/month',
    maxMatters: 20,
    citationMode: 'strict',
    humanReview: true,
    tier: 3,
  },
  Platinum: { 
    tasks: [
      'scoping_analysis', 'laws_affected', 'case_summary',
      'chronology', 'issues_list', 'cause_of_action_matrix', 'breaches_map', 'evidence_schedule',
      'drafting_pack', 'defenses_prosecution',
      'lawyer_case_pack', 'adversarial_analysis', 'stress_test'
    ], 
    maxDocs: 999, 
    label: 'Platinum', 
    color: 'bg-purple-600',
    price: '£1,500/month',
    maxMatters: 60,
    citationMode: 'strict_plus',
    humanReview: true,
    tier: 4,
  },
};

// Helper to check if a task is available for a tier
export function isTaskAvailableForTier(task: TaskType, tier: string): boolean {
  const features = TIER_FEATURES[tier];
  return features?.tasks.includes(task) ?? false;
}

// Get tier badge color class
export function getTierBadgeClass(tier: string): string {
  return TIER_FEATURES[tier]?.color ?? 'bg-gray-500';
}
