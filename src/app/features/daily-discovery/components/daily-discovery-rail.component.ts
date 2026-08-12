import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {AuthService} from '../../../services/auth.service';
import {SiteSearchOverlayService} from '../../search/services/site-search-overlay.service';
import {DailyDiscoveryAnswerResult, DailyDiscoveryChallenge} from '../models/daily-discovery.model';
import {DailyDiscoveryService} from '../services/daily-discovery.service';
import {DailyDiscoveryStateService} from '../services/daily-discovery-state.service';

@Component({
  selector: 'app-daily-discovery-rail',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="daily-discovery"
      aria-labelledby="daily-discovery-heading"
    >
      <div class="daily-discovery-shell">
        <div class="daily-discovery-prompt">
          <p class="daily-discovery-label">
            Daily Discovery
            @if (challenge(); as dailyChallenge) {
              <span>· {{ dailyChallenge.challengeNumber }} / {{ dailyChallenge.totalQuestions }}</span>
            }
          </p>
          @if (challenge(); as dailyChallenge) {
            <div class="daily-discovery-question-row">
              <p id="daily-discovery-heading" class="daily-discovery-question">
                {{ dailyChallenge.question }}
              </p>
              <button
                type="button"
                class="daily-discovery-answer-toggle"
                [attr.aria-expanded]="isExpanded()"
                aria-controls="daily-discovery-answer-panel"
                (click)="toggleAnswerPanel()"
              >
                {{ answerActionLabel() }}
              </button>
            </div>
          } @else if (loadError()) {
            <p id="daily-discovery-heading" class="daily-discovery-status">Today's prompt is taking a little longer to arrive.</p>
          } @else {
            <p id="daily-discovery-heading" class="daily-discovery-status">Loading today's question…</p>
          }
        </div>

        <div class="daily-discovery-points">
          @if (dailyComplete()) {
            <strong>All {{ totalQuestions() }} complete</strong>
            @if (challenge()?.progress?.currentStreak; as streak) {
              <span>{{ streak }} day streak</span>
            } @else {
              <span>Come back tomorrow</span>
            }
          } @else if (isCompleted()) {
            <strong>{{ completedCount() }} / {{ totalQuestions() }} complete</strong>
            <span>Next question ready</span>
          } @else {
            <strong>{{ challenge()?.points ?? 5 }} points</strong>
            <span>
              {{ completedCount() }} / {{ totalQuestions() }} complete ·
              {{ currentUser() ? 'Streak active' : 'Sign in to earn' }}
            </span>
          }
        </div>
      </div>

      @if (isExpanded() && challenge(); as dailyChallenge) {
        <div id="daily-discovery-answer-panel" class="daily-discovery-answer-panel">
          @if (isCompleted() && answerResult()?.correct) {
            <div class="daily-discovery-result" role="status" aria-live="polite">
              <span class="daily-discovery-result-mark" aria-hidden="true">✓</span>
              <div>
                <p class="daily-discovery-answer-label">Discovery complete</p>
                <p class="daily-discovery-result-message">{{ answerResult()?.message }}</p>
                @if (answerSources().length > 0) {
                  <div class="daily-discovery-sources" aria-label="Source articles">
                    @for (source of answerSources(); track source.slug) {
                      <a [routerLink]="['/', pathNames.BLOG, source.slug]">Read {{ source.title }}</a>
                    }
                  </div>
                }
                @if (currentUser()) {
                  <p class="daily-discovery-account-note">
                    @if (answerResult()?.awarded) {
                      +{{ answerResult()?.points }} points · {{ answerResult()?.progress?.currentStreak }} day streak
                    } @else {
                      Today's points are already on your account.
                    }
                  </p>
                } @else {
                  <p class="daily-discovery-account-note">
                    Solved on this device.
                    <a [routerLink]="['/', pathNames.OS_LOGIN]" [queryParams]="{redirectUrl: '/'}">Sign in</a>
                    to earn points and build a streak across all of today's questions.
                  </p>
                }
                @if (!dailyComplete()) {
                  <button type="button" class="daily-discovery-next" (click)="loadNextChallenge()">
                    <span>Next question</span>
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="m9 5 7 7-7 7"></path>
                    </svg>
                  </button>
                }
              </div>
            </div>
          } @else if (isCompleted()) {
            <div class="daily-discovery-result" role="status">
              <span class="daily-discovery-result-mark" aria-hidden="true">✓</span>
              <div>
                <p class="daily-discovery-answer-label">Discovery complete</p>
                <p class="daily-discovery-result-message">You've completed all {{ totalQuestions() }} of today's questions. A new set arrives tomorrow.</p>
              </div>
            </div>
          } @else {
            <form
              class="daily-discovery-answer-form"
              [class.has-choices]="dailyChallenge.interactionType === 'multiple_choice'"
              (submit)="checkAnswer($event)"
            >
              @if (dailyChallenge.hint) {
                <details class="daily-discovery-hint">
                  <summary>Need a hint?</summary>
                  <p>{{ dailyChallenge.hint }}</p>
                </details>
              }

              @if (dailyChallenge.interactionType === 'multiple_choice' && dailyChallenge.choices?.length) {
                <fieldset class="daily-discovery-answer-field is-choice-field">
                  <legend>Choose one answer</legend>
                  <div class="daily-discovery-choices">
                    @for (choice of dailyChallenge.choices ?? []; track choice.id) {
                      <label class="daily-discovery-choice">
                        <input
                          #answerChoice
                          type="radio"
                          name="daily-discovery-answer"
                          [value]="choice.id"
                          [checked]="answer() === choice.id"
                          [attr.aria-describedby]="answerResult() ? 'daily-discovery-feedback' : null"
                          (change)="updateAnswer(choice.id)"
                        >
                        <span class="daily-discovery-choice-id" aria-hidden="true">{{ choice.id }}</span>
                        <span>{{ choice.text }}</span>
                      </label>
                    }
                  </div>
                </fieldset>
              } @else {
                <div class="daily-discovery-answer-field">
                  <label for="daily-discovery-answer">Your answer</label>
                  <input
                    #answerInput
                    id="daily-discovery-answer"
                    type="text"
                    maxlength="160"
                    autocomplete="off"
                    placeholder="Type the answer you found"
                    [value]="answer()"
                    [attr.aria-describedby]="answerResult() ? 'daily-discovery-feedback' : null"
                    (input)="updateAnswer(answerInput.value)"
                  >
                </div>
              }

              <div class="daily-discovery-answer-actions">
                <button type="submit" class="daily-discovery-check" [disabled]="submitting() || !answer().trim()">
                  {{ submitting() ? 'Checking…' : 'Check answer' }}
                </button>
                <button type="button" class="daily-discovery-dismiss" (click)="closeAnswerPanel()">Not today</button>
              </div>

              @if (answerResult(); as result) {
                <p
                  id="daily-discovery-feedback"
                  class="daily-discovery-feedback"
                  [class.is-error]="!result.correct"
                  role="status"
                  aria-live="polite"
                >
                  {{ result.message }}
                </p>
              }
            </form>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    :host {
      position: relative;
      z-index: 4;
      display: block;
      width: 100vw;
      margin-inline: calc((100% - 100vw) / 2);
    }

    .daily-discovery {
      position: relative;
      border-top: 1px solid rgba(103, 232, 249, 0.74);
      background: linear-gradient(90deg, rgba(2, 6, 23, 0.98), rgba(8, 23, 43, 0.97) 48%, rgba(2, 6, 23, 0.98));
      box-shadow: 0 -18px 45px rgba(2, 6, 23, 0.42);
      color: #f8fafc;
    }

    .daily-discovery-shell,
    .daily-discovery-answer-panel {
      width: min(100%, 96rem);
      margin-inline: auto;
      padding-inline: clamp(1rem, 4vw, 3rem);
    }

    .daily-discovery-shell {
      display: grid;
      grid-template-columns: minmax(20rem, 2.25fr) minmax(7rem, 0.62fr);
      gap: clamp(1rem, 2vw, 2.25rem);
      align-items: center;
      min-height: 7.25rem;
      padding-block: 1.1rem;
    }

    .daily-discovery-points {
      display: grid;
      gap: 0.18rem;
      font-family: var(--font-accent);
      text-transform: uppercase;
    }

    .daily-discovery-points span {
      color: #94a3b8;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.14em;
    }

    .daily-discovery-points strong {
      color: #ecfeff;
      font-size: 0.72rem;
      font-weight: 850;
      letter-spacing: 0.08em;
    }

    .daily-discovery-prompt {
      min-width: 0;
    }

    .daily-discovery-label,
    .daily-discovery-answer-label {
      margin: 0 0 0.38rem;
      color: #67e8f9;
      font-family: var(--font-accent);
      font-size: 0.64rem;
      font-weight: 850;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .daily-discovery-question-row {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .daily-discovery-question {
      min-width: 0;
      margin: 0;
      color: #f8fafc;
      font-family: var(--font-heading);
      font-size: clamp(1rem, 1.25vw, 1.25rem);
      font-weight: 650;
      line-height: 1.3;
      text-align: left;
    }

    .daily-discovery-answer-toggle:focus-visible,
    .daily-discovery-check:focus-visible,
    .daily-discovery-next:focus-visible,
    .daily-discovery-dismiss:focus-visible,
    .daily-discovery-answer-field input:focus-visible,
    .daily-discovery-hint summary:focus-visible {
      outline: 2px solid #67e8f9;
      outline-offset: 3px;
    }

    .daily-discovery-next svg {
      width: 1.15rem;
      height: 1.15rem;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .daily-discovery-status {
      margin: 0;
      color: #cbd5e1;
      font-size: 0.95rem;
    }

    .daily-discovery-points {
      align-content: center;
      min-height: 2.8rem;
      border-left: 1px solid rgba(148, 163, 184, 0.2);
      padding-left: clamp(1rem, 2vw, 2rem);
    }

    .daily-discovery-points strong {
      color: #67e8f9;
    }

    .daily-discovery-answer-toggle,
    .daily-discovery-check {
      display: inline-flex;
      min-height: 2.8rem;
      align-items: center;
      justify-content: center;
      gap: 0.58rem;
      border: 1px solid #67e8f9;
      background: #67e8f9;
      padding: 0.68rem 0.9rem;
      color: #082f49;
      cursor: pointer;
      font-family: var(--font-accent);
      font-size: 0.68rem;
      font-weight: 850;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      white-space: nowrap;
      transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
    }

    .daily-discovery-answer-toggle:hover,
    .daily-discovery-check:hover {
      border-color: #cffafe;
      background: #cffafe;
    }

    .daily-discovery-check:disabled {
      border-color: #475569;
      background: #334155;
      color: #94a3b8;
      cursor: not-allowed;
    }

    .daily-discovery-answer-panel {
      position: absolute;
      right: 0;
      bottom: 100%;
      left: 0;
      background: linear-gradient(90deg, rgba(2, 6, 23, 0.98), rgba(8, 23, 43, 0.97) 48%, rgba(2, 6, 23, 0.98));
      border-top: 1px solid rgba(148, 163, 184, 0.16);
      box-shadow: 0 -18px 45px rgba(2, 6, 23, 0.3);
      padding-block: 1rem 1.25rem;
    }

    .daily-discovery-answer-form {
      display: grid;
      grid-template-columns: minmax(16rem, 1fr) auto;
      gap: 1rem 1.25rem;
      align-items: end;
    }

    .daily-discovery-answer-field {
      display: grid;
      gap: 0.45rem;
    }

    .daily-discovery-answer-field > label,
    .daily-discovery-answer-field legend {
      color: #67e8f9;
      font-family: var(--font-accent);
      font-size: 0.64rem;
      font-weight: 850;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .daily-discovery-answer-field.is-choice-field,
    .daily-discovery-answer-form.has-choices .daily-discovery-answer-actions {
      grid-column: 1 / -1;
    }

    .daily-discovery-answer-field.is-choice-field {
      min-width: 0;
      margin: 0;
      border: 0;
      padding: 0;
    }

    .daily-discovery-answer-field legend {
      margin-bottom: 0.55rem;
    }

    .daily-discovery-choices {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
    }

    .daily-discovery-choice {
      display: grid;
      grid-template-columns: auto auto minmax(0, 1fr);
      gap: 0.62rem;
      align-items: center;
      min-height: 3.25rem;
      border: 1px solid rgba(148, 163, 184, 0.32);
      background: rgba(15, 23, 42, 0.72);
      padding: 0.68rem 0.78rem;
      color: #e2e8f0;
      cursor: pointer;
      font-size: 0.82rem;
      line-height: 1.38;
      transition: border-color 160ms ease, background 160ms ease;
    }

    .daily-discovery-choice:hover,
    .daily-discovery-choice:has(input:checked) {
      border-color: #67e8f9;
      background: rgba(8, 47, 73, 0.6);
    }

    .daily-discovery-choice input {
      width: 1rem;
      height: 1rem;
      margin: 0;
      accent-color: #22d3ee;
    }

    .daily-discovery-choice-id {
      display: grid;
      width: 1.55rem;
      height: 1.55rem;
      place-items: center;
      border: 1px solid rgba(103, 232, 249, 0.44);
      border-radius: 999px;
      color: #a5f3fc;
      font-family: var(--font-accent);
      font-size: 0.66rem;
      font-weight: 850;
      text-transform: uppercase;
    }

    .daily-discovery-hint {
      grid-column: 1 / -1;
      color: #cbd5e1;
      font-size: 0.8rem;
    }

    .daily-discovery-hint summary {
      width: fit-content;
      color: #67e8f9;
      cursor: pointer;
      font-family: var(--font-accent);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .daily-discovery-hint p {
      margin: 0.45rem 0 0;
      max-width: 70rem;
      line-height: 1.45;
    }

    .daily-discovery-answer-field input[type="text"] {
      min-height: 2.8rem;
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.42);
      background: rgba(15, 23, 42, 0.94) !important;
      padding: 0.68rem 0.8rem;
      color: #f8fafc !important;
      color-scheme: dark;
    }

    .daily-discovery-answer-field input[type="text"]::placeholder {
      color: #64748b;
    }

    .daily-discovery-answer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .daily-discovery-dismiss {
      min-height: 2.8rem;
      border: 0;
      background: transparent;
      padding: 0.5rem;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.8rem;
      text-decoration: underline;
      text-underline-offset: 0.24rem;
    }

    .daily-discovery-feedback {
      grid-column: 1 / -1;
      margin: 0;
      color: #a7f3d0;
      font-size: 0.82rem;
    }

    .daily-discovery-feedback.is-error {
      color: #fecaca;
    }

    .daily-discovery-result {
      display: flex;
      gap: 0.9rem;
      align-items: flex-start;
      max-width: 64rem;
    }

    .daily-discovery-result-mark {
      display: grid;
      width: 2.25rem;
      height: 2.25rem;
      flex: 0 0 auto;
      place-items: center;
      border: 1px solid #34d399;
      border-radius: 999px;
      color: #a7f3d0;
      font-weight: 900;
    }

    .daily-discovery-result-message,
    .daily-discovery-account-note {
      margin: 0;
      color: #e2e8f0;
      line-height: 1.5;
    }

    .daily-discovery-next {
      display: inline-flex;
      min-height: 2.5rem;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.85rem;
      border: 1px solid #67e8f9;
      background: transparent;
      padding: 0.55rem 0.8rem;
      color: #cffafe;
      cursor: pointer;
      font-family: var(--font-accent);
      font-size: 0.68rem;
      font-weight: 850;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .daily-discovery-next:hover {
      background: rgba(103, 232, 249, 0.12);
    }

    .daily-discovery-next svg {
      width: 1rem;
      height: 1rem;
    }

    .daily-discovery-result a,
    .daily-discovery-account-note a {
      color: #67e8f9;
      font-weight: 700;
      text-underline-offset: 0.2rem;
    }

    .daily-discovery-sources {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 1rem;
      margin-top: 0.35rem;
    }

    .daily-discovery-account-note {
      margin-top: 0.45rem;
      color: #94a3b8;
      font-size: 0.78rem;
    }

    @media (max-width: 1040px) {
      .daily-discovery-shell {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .daily-discovery-points {
        display: none;
      }
    }

    @media (max-width: 720px) {
      .daily-discovery-shell {
        grid-template-columns: 1fr;
        gap: 0.7rem 1rem;
        padding-block: 0.9rem 1rem;
      }

      .daily-discovery-answer-form {
        grid-template-columns: 1fr;
      }

      .daily-discovery-answer-panel {
        position: static;
      }

      .daily-discovery-answer-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }

      .daily-discovery-choices {
        grid-template-columns: 1fr;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .daily-discovery-answer-toggle,
      .daily-discovery-check,
      .daily-discovery-next {
        transition: none;
      }
    }
  `],
})
export class DailyDiscoveryRailComponent {
  private readonly dailyDiscoveryService = inject(DailyDiscoveryService);
  private readonly localState = inject(DailyDiscoveryStateService);
  private readonly searchOverlay = inject(SiteSearchOverlayService);
  private readonly authService = inject(AuthService);
  private readonly answerInput = viewChild<ElementRef<HTMLInputElement>>('answerInput');
  private readonly answerChoices = viewChildren<ElementRef<HTMLInputElement>>('answerChoice');

  protected readonly pathNames = PATH_NAMES;
  protected readonly challenge = signal<DailyDiscoveryChallenge | null>(null);
  protected readonly loadError = signal(false);
  protected readonly isExpanded = signal(false);
  protected readonly answer = signal('');
  protected readonly answerResult = signal<DailyDiscoveryAnswerResult | null>(null);
  protected readonly submitting = signal(false);
  protected readonly currentUser = toSignal(this.authService.user$, {initialValue: null});
  protected readonly isCompleted = signal(false);
  protected readonly completedCount = computed(() => (
    this.answerResult()?.completedCount ?? this.challenge()?.completedCount ?? 0
  ));
  protected readonly totalQuestions = computed(() => (
    this.answerResult()?.totalQuestions ?? this.challenge()?.totalQuestions ?? 10
  ));
  protected readonly dailyComplete = computed(() => (
    this.answerResult()?.dailyComplete ?? this.challenge()?.dailyComplete ?? false
  ));
  protected readonly answerActionLabel = computed(() => {
    const questionType = this.challenge()?.questionType;

    return questionType === 'scenario_application'
      || questionType === 'inference'
      || questionType === 'compare_articles'
      || questionType === 'sequence'
      ? 'Solve'
      : 'Answer';
  });
  protected readonly answerSources = computed(() => {
    const result = this.answerResult();

    return result?.sources ?? (result?.source ? [result.source] : []);
  });
  private readonly answerControlFocusEffect = effect(() => {
    if (!this.isExpanded() || this.isCompleted()) {
      return;
    }

    const control = this.answerChoices()[0]?.nativeElement ?? this.answerInput()?.nativeElement;

    if (control) {
      setTimeout(() => control.focus(), 0);
    }
  });

  constructor() {
    void this.loadChallenge();
  }

  protected toggleAnswerPanel(): void {
    this.isExpanded.update(value => !value);

    if (this.isExpanded() && !this.isCompleted()) {
      this.searchOverlay.requestAttention();
    }
  }

  protected closeAnswerPanel(): void {
    this.isExpanded.set(false);
  }

  protected updateAnswer(value: string): void {
    this.answer.set(value);

    if (this.answerResult() && !this.answerResult()?.correct) {
      this.answerResult.set(null);
    }
  }

  protected async checkAnswer(event: Event): Promise<void> {
    event.preventDefault();
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

      if (result.correct) {
        this.localState.markCompleted(challenge.dateKey, challenge.id);
        this.isCompleted.set(true);
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

  protected async loadNextChallenge(): Promise<void> {
    this.answer.set('');
    this.answerResult.set(null);
    this.isCompleted.set(false);
    await this.loadChallenge();
    this.isExpanded.set(true);
  }

  private async loadChallenge(): Promise<void> {
    this.loadError.set(false);

    try {
      const challenge = await this.dailyDiscoveryService.getChallenge(
        this.localState.getCompletedChallengeIdsForToday()
      );
      this.challenge.set(challenge);
      // Account progress is authoritative after sign-in; guest-only device history must not
      // hide an unfinished account question when both states exist in the same browser.
      this.isCompleted.set(
        challenge.dailyComplete
        || challenge.completedToday
        || (challenge.progress === null && this.localState.hasCompleted(challenge.dateKey, challenge.id))
      );
    } catch {
      this.loadError.set(true);
    }
  }
}
