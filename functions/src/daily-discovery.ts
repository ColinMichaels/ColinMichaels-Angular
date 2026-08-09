export const DAILY_DISCOVERY_TIME_ZONE = 'America/New_York';
export const DAILY_DISCOVERY_POINTS = 5;
export const DAILY_DISCOVERY_LAUNCH_DATE = '2026-08-09';

export interface DailyDiscoveryChallengeDefinition {
  id: string;
  question: string;
  sourceSlug: string;
  sourceTitle: string;
  acceptedAnswers: readonly string[];
  answerSummary: string;
}

export interface DailyDiscoveryProgress {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  lastCompletedDate: string | null;
}

export const DAILY_DISCOVERY_CHALLENGES: readonly DailyDiscoveryChallengeDefinition[] = [
  {
    id: 'family-ai-voice-safe-word',
    question: 'What family rule can help stop an AI voice scam?',
    sourceSlug: 'i-cloned-my-own-voice-now-my-family-needs-a-safe-word',
    sourceTitle: 'I Cloned My Own Voice. Now My Family Needs a Safe Word.',
    acceptedAnswers: ['safe word', 'family safe word', 'use a safe word', 'a family safe word'],
    answerSummary: 'Set a private family safe word and ask for it before trusting an urgent voice request.',
  },
  {
    id: 'auto-blog-starting-point',
    question: 'What simple input can start the Auto Blog workflow?',
    sourceSlug: 'how-i-built-my-auto-blog-workflow',
    sourceTitle: 'How I Built My Auto Blog Workflow: From Dictation to Draft',
    acceptedAnswers: ['dictation', 'voice dictation', 'voice note', 'a voice note', 'rough notes', 'rough idea', 'talking through a rough idea'],
    answerSummary: 'The workflow can begin with rough notes or voice dictation, then shape them into a draft.',
  },
  {
    id: 'gemini-travel-final-decision',
    question: 'What should Gemini not make for you when comparing travel options?',
    sourceSlug: 'use-gemini-to-compare-flights-and-hotels',
    sourceTitle: 'Use Gemini to Compare Flights and Hotels Without Letting AI Spend Your Money',
    acceptedAnswers: ['the final decision', 'final decision', 'booking decision', 'the booking decision'],
    answerSummary: 'Use the comparison as research, but keep the final booking decision in your hands.',
  },
  {
    id: 'flock-camera-core-concern',
    question: 'What matters more than the camera itself in the Flock camera discussion?',
    sourceSlug: 'flock-cameras-dont-scare-me-unchecked-access-does',
    sourceTitle: "Flock Cameras Don't Scare Me. Unchecked Access Does.",
    acceptedAnswers: ['unchecked access', 'unrestricted access', 'access without oversight'],
    answerSummary: 'The central concern is unchecked access to the collected information.',
  },
  {
    id: 'password-breach-check-time',
    question: 'How long does the suggested password check take after a data breach?',
    sourceSlug: '15-minute-password-check-after-a-data-breach',
    sourceTitle: 'The 15-Minute Password Check I’d Do After Any Big Data-Breach Scare',
    acceptedAnswers: ['15 minutes', 'fifteen minutes', '15 minute', 'fifteen minute'],
    answerSummary: 'The focused password check is designed to take about 15 minutes.',
  },
  {
    id: 'personal-health-record-length',
    question: 'How short can the personal health record be before an appointment?',
    sourceSlug: 'build-a-personal-health-record-before-the-next-appointment',
    sourceTitle: 'How I Would Build a Personal Health Record Before the Next Appointment Scramble',
    acceptedAnswers: ['one page', '1 page', 'a single page', 'single page'],
    answerSummary: 'A concise one-page record can make the essential details easier to use at an appointment.',
  },
  {
    id: 'summer-outdoor-plan',
    question: 'What kind of plan should you make before heading outside in summer heat?',
    sourceSlug: 'before-you-head-outside-summer-heat-safety-plan',
    sourceTitle: 'Before You Head Outside: A Simple Summer Heat Safety Plan',
    acceptedAnswers: ['heat safety plan', 'summer heat safety plan', 'a heat safety plan'],
    answerSummary: 'Make a heat safety plan before you head outside in high temperatures.',
  },
] as const;

export function getDailyDiscoveryDateKey(
  date = new Date(),
  timeZone = DAILY_DISCOVERY_TIME_ZONE
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return `${values['year']}-${values['month']}-${values['day']}`;
}

export function getDailyDiscoveryChallenge(
  dateKey: string,
  challenges = DAILY_DISCOVERY_CHALLENGES
): DailyDiscoveryChallengeDefinition {
  if (challenges.length === 0) {
    throw new Error('At least one Daily Discovery challenge is required.');
  }

  const launchDay = parseDateKey(DAILY_DISCOVERY_LAUNCH_DATE);
  const requestedDay = parseDateKey(dateKey);
  // Both keys already represent calendar dates, so UTC math avoids host-time-zone drift.
  const elapsedDays = Math.floor((requestedDay - launchDay) / 86_400_000);
  const index = ((elapsedDays % challenges.length) + challenges.length) % challenges.length;

  return challenges[index];
}

export function isDailyDiscoveryAnswerCorrect(
  challenge: DailyDiscoveryChallengeDefinition,
  answer: string
): boolean {
  const normalizedAnswer = normalizeDailyDiscoveryAnswer(answer);

  return normalizedAnswer.length > 0
    && challenge.acceptedAnswers.some(candidate => normalizeDailyDiscoveryAnswer(candidate) === normalizedAnswer);
}

export function normalizeDailyDiscoveryAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getNextDailyDiscoveryProgress(
  current: DailyDiscoveryProgress,
  completedDate: string
): DailyDiscoveryProgress {
  if (current.lastCompletedDate === completedDate) {
    return current;
  }

  const currentStreak = current.lastCompletedDate === getPreviousDateKey(completedDate)
    ? current.currentStreak + 1
    : 1;

  return {
    currentStreak,
    longestStreak: Math.max(current.longestStreak, currentStreak),
    totalCompleted: current.totalCompleted + 1,
    lastCompletedDate: completedDate,
  };
}

export function getPreviousDateKey(dateKey: string): string {
  const date = new Date(parseDateKey(dateKey));
  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().slice(0, 10);
}

function parseDateKey(dateKey: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const parsed = Date.parse(`${dateKey}T00:00:00.000Z`);

  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== dateKey) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  return parsed;
}
