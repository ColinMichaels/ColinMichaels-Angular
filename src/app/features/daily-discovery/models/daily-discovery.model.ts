export interface DailyDiscoveryProgress {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  lastCompletedDate: string | null;
  completedChallengeIds: readonly string[];
}

export interface DailyDiscoveryChallenge {
  id: string;
  dateKey: string;
  question: string;
  points: number;
  completedToday: boolean;
  challengeNumber: number;
  totalQuestions: number;
  completedCount: number;
  dailyComplete: boolean;
  progress: DailyDiscoveryProgress | null;
}

export interface DailyDiscoveryAnswerRequest {
  challengeId: string;
  dateKey: string;
  answer: string;
  completedChallengeIds: readonly string[];
}

export interface DailyDiscoverySource {
  slug: string;
  title: string;
}

export interface DailyDiscoveryAnswerResult {
  correct: boolean;
  message: string;
  source?: DailyDiscoverySource;
  awarded?: boolean;
  points?: number;
  total?: number | null;
  progress?: DailyDiscoveryProgress | null;
  totalQuestions?: number;
  completedCount?: number;
  dailyComplete?: boolean;
}
