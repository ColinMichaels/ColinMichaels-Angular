export type DailyDiscoveryAdminOperation = 'create' | 'replace';
export type DailyDiscoveryQuestionType =
  | 'article_hunt'
  | 'scenario_application'
  | 'inference'
  | 'compare_articles'
  | 'sequence';
export type DailyDiscoveryDifficulty = 'easy' | 'medium' | 'challenge';

export interface DailyDiscoveryExternalChoice {
  id: string;
  text: string;
}

export interface DailyDiscoveryExternalSourceArticle {
  title: string;
  slug: string;
  url: string;
  evidence: string;
}

export interface DailyDiscoveryExternalQuestion {
  id: string;
  position: number;
  type: DailyDiscoveryQuestionType;
  difficulty: DailyDiscoveryDifficulty;
  prompt: string;
  hint: string;
  choices: DailyDiscoveryExternalChoice[];
  answer: {
    correctChoiceId: string;
    explanation: string;
  };
  sourceArticles: DailyDiscoveryExternalSourceArticle[];
  estimatedSeconds: number;
}

export interface DailyDiscoveryExternalQuiz {
  schema: 'colinmichaels.daily-discovery-quiz';
  version: 1;
  quizDate: string;
  timezone: 'America/New_York';
  status: string;
  uploadStatus: string;
  generatedAt: string;
  questions: DailyDiscoveryExternalQuestion[];
  qualityChecks: Record<string, boolean | number>;
}

export interface DailyDiscoveryAdminChoice {
  id: string;
  text: string;
}

export interface DailyDiscoveryAdminSourceArticle {
  slug: string;
  title: string;
}

export interface DailyDiscoveryAdminQuestion {
  id: string;
  question: string;
  sourceSlug: string;
  sourceTitle: string;
  acceptedAnswers: readonly string[];
  answerSummary: string;
  interactionType?: 'multiple_choice';
  questionType?: DailyDiscoveryQuestionType;
  difficulty?: DailyDiscoveryDifficulty;
  hint?: string;
  choices?: readonly DailyDiscoveryAdminChoice[];
  estimatedSeconds?: number;
  sourceArticles?: readonly DailyDiscoveryAdminSourceArticle[];
}

export interface DailyDiscoveryAdminQuestionSetMissing {
  dateKey: string;
  exists: false;
}

export interface DailyDiscoveryAdminQuestionSetExisting {
  dateKey: string;
  exists: true;
  revision: number;
  status: 'ready';
  generationVersion: string;
  generationMode: string;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
  sourcePostIds: readonly string[];
  questions: readonly DailyDiscoveryAdminQuestion[];
}

export type DailyDiscoveryAdminQuestionSet =
  | DailyDiscoveryAdminQuestionSetMissing
  | DailyDiscoveryAdminQuestionSetExisting;

export interface DailyDiscoveryAdminSaveRequest {
  operation: DailyDiscoveryAdminOperation;
  requestId: string;
  expectedRevision?: number;
  approveDraft: boolean;
  confirmLiveReplacement: boolean;
  dryRun: boolean;
  quiz: DailyDiscoveryExternalQuiz;
}

export interface DailyDiscoveryAdminDryRunResult {
  dryRun: true;
  dateKey: string;
  operation: DailyDiscoveryAdminOperation;
  currentRevision: number | null;
  nextRevision: number;
  liveReplacement: boolean;
  questionCount: number;
  publishedSourceCount: number;
  requiresApproval: boolean;
}

export interface DailyDiscoveryAdminSaveResult {
  dryRun: false;
  dateKey: string;
  operation: DailyDiscoveryAdminOperation;
  revision: number;
  liveReplacement: boolean;
  questionCount: number;
  publishedSourceCount: number;
  updatedAt: string;
  idempotent: boolean;
}

export type DailyDiscoveryAdminMutationResult =
  | DailyDiscoveryAdminDryRunResult
  | DailyDiscoveryAdminSaveResult;

