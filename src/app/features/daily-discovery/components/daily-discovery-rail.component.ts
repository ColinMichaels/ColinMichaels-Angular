import {ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild} from '@angular/core';
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
      [class.is-answer-open]="isExpanded()"
      aria-labelledby="daily-discovery-heading"
    >
      <div class="daily-discovery-shell">
        <div class="daily-discovery-kicker">
          <span>Today at</span>
          <strong>ColinMichaels.com</strong>
        </div>

        <p class="daily-discovery-date" aria-label="Today's date">{{ displayDate() }}</p>

        <div class="daily-discovery-prompt">
          <p class="daily-discovery-label">Daily Discovery</p>
          @if (challenge(); as dailyChallenge) {
            <button
              type="button"
              class="daily-discovery-question"
              [attr.aria-expanded]="isExpanded()"
              aria-controls="daily-discovery-answer-panel"
              (click)="toggleAnswerPanel()"
            >
              <span id="daily-discovery-heading">{{ dailyChallenge.question }}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" [class.is-expanded]="isExpanded()">
                <path d="m6.5 9 5.5 5.5L17.5 9"></path>
              </svg>
            </button>
          } @else if (loadError()) {
            <p id="daily-discovery-heading" class="daily-discovery-status">Today's prompt is taking a little longer to arrive.</p>
          } @else {
            <p id="daily-discovery-heading" class="daily-discovery-status">Loading today's question…</p>
          }
        </div>

        <div class="daily-discovery-points">
          @if (isCompleted()) {
            <strong>Complete</strong>
            @if (challenge()?.progress?.currentStreak; as streak) {
              <span>{{ streak }} day streak</span>
            } @else {
              <span>Come back tomorrow</span>
            }
          } @else {
            <strong>{{ challenge()?.points ?? 5 }} points</strong>
            <span>{{ currentUser() ? 'Sign in streak active' : 'Sign in to earn' }}</span>
          }
        </div>

        <button
          type="button"
          class="daily-discovery-search"
          [disabled]="!challenge()"
          (click)="searchTheBlog()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="10.5" cy="10.5" r="6"></circle>
            <path d="m15 15 4.5 4.5"></path>
          </svg>
          <span>Search the blog</span>
        </button>
      </div>

      @if (isExpanded() && challenge(); as dailyChallenge) {
        <div id="daily-discovery-answer-panel" class="daily-discovery-answer-panel">
          @if (isCompleted() && answerResult()?.correct) {
            <div class="daily-discovery-result" role="status" aria-live="polite">
              <span class="daily-discovery-result-mark" aria-hidden="true">✓</span>
              <div>
                <p class="daily-discovery-answer-label">Discovery complete</p>
                <p class="daily-discovery-result-message">{{ answerResult()?.message }}</p>
                @if (answerResult()?.source; as source) {
                  <a [routerLink]="['/', pathNames.BLOG, source.slug]">Read {{ source.title }}</a>
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
                    before tomorrow's challenge to earn points and build a streak.
                  </p>
                }
              </div>
            </div>
          } @else if (isCompleted()) {
            <div class="daily-discovery-result" role="status">
              <span class="daily-discovery-result-mark" aria-hidden="true">✓</span>
              <div>
                <p class="daily-discovery-answer-label">Discovery complete</p>
                <p class="daily-discovery-result-message">You've already solved today's question. A new one arrives tomorrow.</p>
              </div>
            </div>
          } @else {
            <form class="daily-discovery-answer-form" (submit)="checkAnswer($event)">
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

              <div class="daily-discovery-answer-actions">
                <button type="button" class="daily-discovery-search daily-discovery-search-secondary" (click)="searchTheBlog()">
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <circle cx="10.5" cy="10.5" r="6"></circle>
                    <path d="m15 15 4.5 4.5"></path>
                  </svg>
                  <span>Search the blog</span>
                </button>
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
      grid-template-columns: minmax(8.7rem, 0.72fr) auto minmax(20rem, 2.25fr) minmax(7rem, 0.62fr) auto;
      gap: clamp(1rem, 2vw, 2.25rem);
      align-items: center;
      min-height: 7.25rem;
      padding-block: 1.1rem;
    }

    .daily-discovery-kicker,
    .daily-discovery-points {
      display: grid;
      gap: 0.18rem;
      font-family: var(--font-accent);
      text-transform: uppercase;
    }

    .daily-discovery-kicker span,
    .daily-discovery-points span {
      color: #94a3b8;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.14em;
    }

    .daily-discovery-kicker strong,
    .daily-discovery-points strong {
      color: #ecfeff;
      font-size: 0.72rem;
      font-weight: 850;
      letter-spacing: 0.08em;
    }

    .daily-discovery-date {
      margin: 0;
      border-inline: 1px solid rgba(148, 163, 184, 0.2);
      padding-inline: clamp(0.8rem, 1.5vw, 1.5rem);
      color: #67e8f9;
      font-family: var(--font-accent);
      font-size: 0.74rem;
      font-weight: 850;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      white-space: nowrap;
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

    .daily-discovery-question {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      border: 0;
      background: transparent;
      padding: 0;
      color: #f8fafc;
      cursor: pointer;
      font-family: var(--font-heading);
      font-size: clamp(1rem, 1.25vw, 1.25rem);
      font-weight: 650;
      line-height: 1.3;
      text-align: left;
    }

    .daily-discovery-question:hover,
    .daily-discovery-question:focus-visible {
      color: #cffafe;
    }

    .daily-discovery-question:focus-visible,
    .daily-discovery-search:focus-visible,
    .daily-discovery-check:focus-visible,
    .daily-discovery-dismiss:focus-visible,
    .daily-discovery-answer-field input:focus-visible {
      outline: 2px solid #67e8f9;
      outline-offset: 3px;
    }

    .daily-discovery-question svg,
    .daily-discovery-search svg {
      width: 1.15rem;
      height: 1.15rem;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .daily-discovery-question svg {
      transition: transform 180ms ease;
    }

    .daily-discovery-question svg.is-expanded {
      transform: rotate(180deg);
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

    .daily-discovery-search,
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

    .daily-discovery-search:hover,
    .daily-discovery-check:hover {
      border-color: #cffafe;
      background: #cffafe;
    }

    .daily-discovery-search:disabled,
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

    .daily-discovery-answer-field label {
      color: #67e8f9;
      font-family: var(--font-accent);
      font-size: 0.64rem;
      font-weight: 850;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .daily-discovery-answer-field input {
      min-height: 2.8rem;
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.42);
      background: rgba(15, 23, 42, 0.94) !important;
      padding: 0.68rem 0.8rem;
      color: #f8fafc !important;
      color-scheme: dark;
    }

    .daily-discovery-answer-field input::placeholder {
      color: #64748b;
    }

    .daily-discovery-answer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .daily-discovery-search-secondary {
      background: transparent;
      color: #cffafe;
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

    .daily-discovery-result a,
    .daily-discovery-account-note a {
      color: #67e8f9;
      font-weight: 700;
      text-underline-offset: 0.2rem;
    }

    .daily-discovery-account-note {
      margin-top: 0.45rem;
      color: #94a3b8;
      font-size: 0.78rem;
    }

    @media (max-width: 1040px) {
      .daily-discovery-shell {
        grid-template-columns: auto minmax(0, 1fr) auto;
      }

      .daily-discovery-kicker {
        display: none;
      }

      .daily-discovery-date {
        border-left: 0;
        padding-left: 0;
      }

      .daily-discovery-points {
        display: none;
      }
    }

    @media (max-width: 720px) {
      .daily-discovery-shell {
        grid-template-columns: auto minmax(0, 1fr);
        gap: 0.7rem 1rem;
        padding-block: 0.9rem 1rem;
      }

      .daily-discovery-date {
        grid-row: 1;
        align-self: start;
        border-right: 0;
        padding-right: 0;
      }

      .daily-discovery-prompt {
        grid-column: 2;
        grid-row: 1 / span 2;
      }

      .daily-discovery-search {
        grid-column: 1 / -1;
        width: 100%;
      }

      .daily-discovery.is-answer-open > .daily-discovery-shell > .daily-discovery-search {
        display: none;
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

      .daily-discovery-answer-actions .daily-discovery-search,
      .daily-discovery-dismiss {
        grid-column: 1 / -1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .daily-discovery-question svg,
      .daily-discovery-search,
      .daily-discovery-check {
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

  protected readonly pathNames = PATH_NAMES;
  protected readonly challenge = signal<DailyDiscoveryChallenge | null>(null);
  protected readonly loadError = signal(false);
  protected readonly isExpanded = signal(false);
  protected readonly answer = signal('');
  protected readonly answerResult = signal<DailyDiscoveryAnswerResult | null>(null);
  protected readonly submitting = signal(false);
  protected readonly currentUser = toSignal(this.authService.user$, {initialValue: null});
  protected readonly isCompleted = signal(false);
  protected readonly displayDate = computed(() => {
    const dateKey = this.challenge()?.dateKey;

    if (!dateKey) {
      return 'Today';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${dateKey}T12:00:00.000Z`));
  });

  constructor() {
    void this.loadChallenge();
  }

  protected toggleAnswerPanel(): void {
    this.isExpanded.update(value => !value);

    if (this.isExpanded() && !this.isCompleted()) {
      queueMicrotask(() => this.answerInput()?.nativeElement.focus());
    }
  }

  protected closeAnswerPanel(): void {
    this.isExpanded.set(false);
  }

  protected searchTheBlog(): void {
    this.isExpanded.set(true);
    this.searchOverlay.openAndFocus();
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

  private async loadChallenge(): Promise<void> {
    try {
      const challenge = await this.dailyDiscoveryService.getChallenge();
      this.challenge.set(challenge);
      this.isCompleted.set(
        challenge.completedToday || this.localState.hasCompleted(challenge.dateKey, challenge.id)
      );
    } catch {
      this.loadError.set(true);
    }
  }
}
