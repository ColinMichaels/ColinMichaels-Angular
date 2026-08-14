import {Injectable, computed, inject, signal} from '@angular/core';

import {SiteAnalyticsService} from '../../../shared/analytics/site-analytics.service';
import {DailyDiscoveryAnswerResult, DailyDiscoveryChallenge} from '../models/daily-discovery.model';
import {DailyDiscoveryService} from './daily-discovery.service';
import {DailyDiscoveryStateService} from './daily-discovery-state.service';

/**
 * Owns the tab-scoped play session above routed pages. Completed guest state is
 * delegated to DailyDiscoveryStateService; unfinished answers are never persisted.
 */
@Injectable({
  providedIn: 'root',
})
export class DailyDiscoveryPlayService {
  private readonly dailyDiscoveryService = inject(DailyDiscoveryService);
  private readonly localState = inject(DailyDiscoveryStateService);
  private readonly analytics = inject(SiteAnalyticsService);
  private returnFocus: HTMLElement | null = null;

  readonly challenge = signal<DailyDiscoveryChallenge | null>(null);
  readonly isPlaying = signal(false);
  readonly answersVisible = signal(false);
  readonly answer = signal('');
  readonly answerResult = signal<DailyDiscoveryAnswerResult | null>(null);
  readonly submitting = signal(false);
  readonly isCompleted = signal(false);
  readonly loadError = signal(false);
  readonly completedCount = computed(() => (
    this.answerResult()?.completedCount ?? this.challenge()?.completedCount ?? 0
  ));
  readonly totalQuestions = computed(() => (
    this.answerResult()?.totalQuestions ?? this.challenge()?.totalQuestions ?? 10
  ));
  readonly dailyComplete = computed(() => (
    this.answerResult()?.dailyComplete ?? this.challenge()?.dailyComplete ?? false
  ));
  readonly answerSources = computed(() => {
    const result = this.answerResult();

    return result?.sources ?? (result?.source ? [result.source] : []);
  });

  start(challenge: DailyDiscoveryChallenge, returnFocus?: HTMLElement | null): void {
    this.challenge.set(challenge);
    this.isCompleted.set(this.challengeIsComplete(challenge));
    this.answer.set('');
    this.answerResult.set(null);
    this.loadError.set(false);
    this.answersVisible.set(true);
    this.isPlaying.set(true);
    this.returnFocus = returnFocus ?? null;
    this.analytics.trackDailyDiscoveryStart(
      challenge.id,
      challenge.questionType ?? challenge.interactionType,
      challenge.progress !== null
    );
  }

  stop(): void {
    const returnFocus = this.returnFocus;

    this.isPlaying.set(false);
    this.answersVisible.set(false);
    this.challenge.set(null);
    this.answer.set('');
    this.answerResult.set(null);
    this.isCompleted.set(false);
    this.submitting.set(false);
    this.loadError.set(false);
    this.returnFocus = null;

    if (returnFocus?.isConnected) {
      setTimeout(() => returnFocus.focus(), 0);
    }
  }

  toggleAnswers(): void {
    this.answersVisible.update(value => !value);
  }

  updateAnswer(value: string): void {
    this.answer.set(value);

    if (this.answerResult() && !this.answerResult()?.correct) {
      this.answerResult.set(null);
    }
  }

  async checkAnswer(): Promise<void> {
    const challenge = this.challenge();
    const answer = this.answer().trim();

    if (!challenge || !answer || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.answerResult.set(null);

    try {
      const result = await this.dailyDiscoveryService.submitAnswer({
        challengeId: challenge.id,
        dateKey: challenge.dateKey,
        answer,
        completedChallengeIds: this.localState.getCompletedChallengeIds(challenge.dateKey),
      });

      this.answerResult.set(result);
      const signedIn = challenge.progress !== null || result.progress !== null && result.progress !== undefined;
      this.analytics.trackDailyDiscoveryAnswer(
        challenge.id,
        challenge.questionType ?? challenge.interactionType,
        result.correct,
        result.dailyComplete === true,
        signedIn
      );

      if (result.correct) {
        this.localState.markCompleted(challenge.dateKey, challenge.id);
        this.isCompleted.set(true);

        if (result.dailyComplete) {
          this.analytics.trackDailyDiscoveryComplete(
            challenge.dateKey,
            result.totalQuestions ?? challenge.totalQuestions,
            signedIn
          );
        }
      }
    } catch {
      this.answerResult.set({
        correct: false,
        message: 'The answer could not be checked right now. Your entry is still here—please try again.',
      });
    } finally {
      this.submitting.set(false);
    }
  }

  async loadNextChallenge(): Promise<void> {
    this.answer.set('');
    this.answerResult.set(null);
    this.isCompleted.set(false);
    this.loadError.set(false);

    try {
      const challenge = await this.dailyDiscoveryService.getChallenge(
        this.localState.getCompletedChallengeIdsForToday()
      );
      this.challenge.set(challenge);
      this.isCompleted.set(this.challengeIsComplete(challenge));
      this.answersVisible.set(true);
    } catch {
      this.loadError.set(true);
    }
  }

  private challengeIsComplete(challenge: DailyDiscoveryChallenge): boolean {
    // Account progress is authoritative after sign-in; device history fills only the guest state.
    return challenge.dailyComplete
      || challenge.completedToday
      || (challenge.progress === null && this.localState.hasCompleted(challenge.dateKey, challenge.id));
  }
}
