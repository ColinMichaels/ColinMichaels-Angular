import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {AuthService} from '../../../services/auth.service';
import {DailyDiscoveryPlayService} from '../services/daily-discovery-play.service';
import {createDailyDiscoveryDisplayChoices} from '../utils/daily-discovery-choice-order.util';

@Component({
  selector: 'app-daily-discovery-play-overlay',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (play.isPlaying() && play.challenge(); as dailyChallenge) {
      <section
        class="discovery-play-overlay"
        aria-labelledby="discovery-play-question"
        data-search-highlight-ignore
      >
        <div class="discovery-play-card">
          <header class="discovery-play-header">
            <button
              type="button"
              class="discovery-playing-toggle"
              role="switch"
              aria-checked="true"
              title="Stop playing Daily Discovery"
              (click)="stopPlaying()"
            >
              <span class="discovery-playing-dot" aria-hidden="true"></span>
              <span>Playing Discovery</span>
            </button>
            <span class="discovery-play-progress">
              Question {{ dailyChallenge.challengeNumber }} of {{ dailyChallenge.totalQuestions }}
            </span>
            <button
              type="button"
              class="discovery-play-close"
              aria-label="Stop playing Daily Discovery"
              title="Stop playing Daily Discovery"
              (click)="stopPlaying()"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18"></path>
              </svg>
            </button>
          </header>

          <div class="discovery-play-question-row">
            <div>
              <p class="discovery-play-kicker">
                {{ dailyChallenge.points }} points
                <span aria-hidden="true">·</span>
                {{ play.completedCount() }} / {{ play.totalQuestions() }} complete
              </p>
              <p id="discovery-play-question" class="discovery-play-question">
                {{ dailyChallenge.question }}
              </p>
            </div>
            @if (!play.isCompleted()) {
              <button
                type="button"
                class="discovery-answer-toggle"
                [attr.aria-expanded]="play.answersVisible()"
                aria-controls="discovery-play-answer-panel"
                (click)="toggleAnswers()"
              >
                {{ play.answersVisible() ? 'Hide answers' : answerActionLabel() }}
              </button>
            }
          </div>

          @if (play.answersVisible()) {
            <div id="discovery-play-answer-panel" class="discovery-play-answer-panel">
              @if (play.loadError()) {
                <div class="discovery-play-feedback is-error" role="status">
                  The next question could not be loaded. Your Discovery session is still open.
                </div>
              } @else if (play.isCompleted() && play.answerResult()?.correct) {
                <div class="discovery-play-result" role="status" aria-live="polite">
                  <span class="discovery-play-result-mark" aria-hidden="true">✓</span>
                  <div>
                    <p class="discovery-play-label">Discovery complete</p>
                    <p class="discovery-play-result-message">{{ play.answerResult()?.message }}</p>
                    @if (play.answerSources().length > 0) {
                      <div class="discovery-play-sources" aria-label="Source articles">
                        @for (source of play.answerSources(); track source.slug) {
                          <a [routerLink]="['/', pathNames.BLOG, source.slug]">Read {{ source.title }}</a>
                        }
                      </div>
                    }
                    @if (currentUser()) {
                      <p class="discovery-play-account-note">
                        @if (play.answerResult()?.awarded) {
                          +{{ play.answerResult()?.points }} points · {{ play.answerResult()?.progress?.currentStreak }} day streak
                        } @else {
                          Today's points are already on your account.
                        }
                      </p>
                    } @else {
                      <p class="discovery-play-account-note">
                        Solved on this device.
                        <a [routerLink]="['/', pathNames.OS_LOGIN]" [queryParams]="{redirectUrl: '/'}">Sign in</a>
                        to earn points and build a streak.
                      </p>
                    }
                    @if (!play.dailyComplete()) {
                      <button type="button" class="discovery-next" (click)="loadNextChallenge()">
                        <span>Next question</span>
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path d="m9 5 7 7-7 7"></path>
                        </svg>
                      </button>
                    }
                  </div>
                </div>
              } @else if (play.isCompleted()) {
                <div class="discovery-play-result" role="status">
                  <span class="discovery-play-result-mark" aria-hidden="true">✓</span>
                  <div>
                    <p class="discovery-play-label">Discovery complete</p>
                    <p class="discovery-play-result-message">
                      You've completed all {{ play.totalQuestions() }} of today's questions. A new set arrives tomorrow.
                    </p>
                  </div>
                </div>
              } @else {
                <form
                  class="discovery-answer-form"
                  [class.has-choices]="dailyChallenge.interactionType === 'multiple_choice'"
                  (submit)="checkAnswer($event)"
                >
                  @if (dailyChallenge.hint) {
                    <details class="discovery-hint">
                      <summary>Need a hint?</summary>
                      <p>{{ dailyChallenge.hint }}</p>
                    </details>
                  }

                  @if (dailyChallenge.interactionType === 'multiple_choice' && dailyChallenge.choices?.length) {
                    <fieldset class="discovery-answer-field is-choice-field">
                      <legend>Choose one answer</legend>
                      <div class="discovery-choices">
                        @for (displayChoice of displayChoices(); track displayChoice.choice.id) {
                          <label
                            class="discovery-choice"
                            [class.is-selected]="play.answer() === displayChoice.choice.id"
                            [attr.data-choice-id]="displayChoice.choice.id"
                          >
                            <input
                              #answerChoice
                              type="radio"
                              class="discovery-choice-input"
                              name="daily-discovery-answer"
                              [value]="displayChoice.choice.id"
                              [checked]="play.answer() === displayChoice.choice.id"
                              [attr.aria-describedby]="play.answerResult() ? 'discovery-play-feedback' : null"
                              (change)="play.updateAnswer(displayChoice.choice.id)"
                            >
                            <span
                              class="discovery-choice-id"
                              data-choice-marker
                              aria-hidden="true"
                            >{{ displayChoice.label }}</span>
                            <span>{{ displayChoice.choice.text }}</span>
                          </label>
                        }
                      </div>
                    </fieldset>
                  } @else {
                    <div class="discovery-answer-field">
                      <label for="discovery-play-answer">Your answer</label>
                      <input
                        #answerInput
                        id="discovery-play-answer"
                        type="text"
                        maxlength="160"
                        autocomplete="off"
                        placeholder="Type the answer you found"
                        [value]="play.answer()"
                        [attr.aria-describedby]="play.answerResult() ? 'discovery-play-feedback' : null"
                        (input)="play.updateAnswer(answerInput.value)"
                      >
                    </div>
                  }

                  <div class="discovery-answer-actions">
                    <button type="submit" class="discovery-check" [disabled]="play.submitting() || !play.answer().trim()">
                      {{ play.submitting() ? 'Checking…' : 'Check answer' }}
                    </button>
                    <button type="button" class="discovery-keep-browsing" (click)="hideAnswers()">Keep browsing</button>
                  </div>

                  @if (play.answerResult(); as result) {
                    <p
                      id="discovery-play-feedback"
                      class="discovery-play-feedback"
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
        </div>
      </section>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .discovery-play-overlay {
      position: fixed;
      z-index: 160;
      right: 0;
      bottom: 0;
      left: 0;
      display: flex;
      justify-content: center;
      padding: 1rem 5.5rem calc(1rem + env(safe-area-inset-bottom));
      pointer-events: none;
    }

    .discovery-play-overlay::before {
      position: absolute;
      right: 0;
      bottom: 0;
      left: 0;
      height: min(55vh, 30rem);
      background: linear-gradient(180deg, transparent, rgba(2, 6, 23, 0.82) 64%, rgba(2, 6, 23, 0.94));
      content: '';
      pointer-events: none;
    }

    .discovery-play-card {
      position: relative;
      width: min(68rem, 100%);
      max-height: min(72dvh, 42rem);
      overflow-y: auto;
      border: 1px solid rgba(103, 232, 249, 0.74);
      border-radius: 0.75rem;
      background: linear-gradient(135deg, rgba(2, 6, 23, 0.99), rgba(8, 23, 43, 0.99));
      box-shadow: 0 1.5rem 4rem rgba(2, 6, 23, 0.64), 0 0 0 1px rgba(34, 211, 238, 0.12);
      color: #f8fafc;
      pointer-events: auto;
      scrollbar-color: rgba(103, 232, 249, 0.5) rgba(15, 23, 42, 0.9);
    }

    .discovery-play-header {
      position: sticky;
      z-index: 2;
      top: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto 2.75rem;
      gap: 0.75rem;
      align-items: center;
      min-height: 3.5rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(2, 6, 23, 0.97);
      padding: 0.38rem 0.5rem 0.38rem 1rem;
    }

    .discovery-playing-toggle {
      display: inline-flex;
      width: fit-content;
      min-height: 2.75rem;
      align-items: center;
      gap: 0.55rem;
      border: 0;
      background: transparent;
      padding: 0.5rem 0;
      color: #67e8f9;
      cursor: pointer;
      font-family: var(--font-accent);
      font-size: 0.68rem;
      font-weight: 850;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .discovery-playing-dot {
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 999px;
      background: #22d3ee;
      box-shadow: 0 0 0 0.35rem rgba(34, 211, 238, 0.16);
    }

    .discovery-play-progress {
      color: #94a3b8;
      font-family: var(--font-accent);
      font-size: 0.62rem;
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .discovery-play-close {
      display: grid;
      width: 2.75rem;
      height: 2.75rem;
      place-items: center;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: #cbd5e1;
      cursor: pointer;
    }

    .discovery-play-close:hover {
      border-color: rgba(103, 232, 249, 0.4);
      background: rgba(103, 232, 249, 0.1);
      color: #ecfeff;
    }

    .discovery-play-close svg,
    .discovery-next svg {
      width: 1.15rem;
      height: 1.15rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .discovery-play-question-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1rem;
      align-items: center;
      padding: 1rem;
    }

    .discovery-play-kicker,
    .discovery-play-label {
      margin: 0 0 0.38rem;
      color: #67e8f9;
      font-family: var(--font-accent);
      font-size: 0.64rem;
      font-weight: 850;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .discovery-play-question {
      margin: 0;
      color: #f8fafc;
      font-family: var(--font-heading);
      font-size: clamp(1rem, 2vw, 1.3rem);
      font-weight: 680;
      line-height: 1.35;
    }

    .discovery-answer-toggle,
    .discovery-check,
    .discovery-next {
      display: inline-flex;
      min-height: 2.75rem;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: 1px solid #67e8f9;
      background: #67e8f9;
      padding: 0.65rem 0.9rem;
      color: #082f49;
      cursor: pointer;
      font-family: var(--font-accent);
      font-size: 0.68rem;
      font-weight: 850;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .discovery-answer-toggle:hover,
    .discovery-check:hover {
      border-color: #cffafe;
      background: #cffafe;
    }

    .discovery-play-answer-panel {
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(8, 23, 43, 0.82);
      padding: 1rem;
    }

    .discovery-answer-form {
      display: grid;
      grid-template-columns: minmax(16rem, 1fr) auto;
      gap: 1rem 1.25rem;
      align-items: end;
    }

    .discovery-hint {
      grid-column: 1 / -1;
      color: #cbd5e1;
      font-size: 0.82rem;
    }

    .discovery-hint summary {
      width: fit-content;
      color: #67e8f9;
      cursor: pointer;
      font-family: var(--font-accent);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .discovery-hint p {
      margin: 0.45rem 0 0;
      line-height: 1.45;
    }

    .discovery-answer-field {
      display: grid;
      gap: 0.45rem;
    }

    .discovery-answer-field > label,
    .discovery-answer-field legend {
      color: #67e8f9;
      font-family: var(--font-accent);
      font-size: 0.64rem;
      font-weight: 850;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .discovery-answer-field.is-choice-field,
    .discovery-answer-form.has-choices .discovery-answer-actions {
      grid-column: 1 / -1;
    }

    .discovery-answer-field.is-choice-field {
      min-width: 0;
      margin: 0;
      border: 0;
      padding: 0;
    }

    .discovery-answer-field legend {
      margin-bottom: 0.55rem;
    }

    .discovery-choices {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
    }

    .discovery-choice {
      position: relative;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.62rem;
      align-items: center;
      min-height: 3.35rem;
      border: 1px solid rgba(148, 163, 184, 0.38);
      background: rgba(15, 23, 42, 0.96);
      padding: 0.7rem 0.8rem;
      color: #f1f5f9;
      cursor: pointer;
      font-size: 0.84rem;
      line-height: 1.4;
    }

    .discovery-choice:hover,
    .discovery-choice.is-selected {
      border-color: #67e8f9;
      background: rgba(8, 47, 73, 0.9);
    }

    .discovery-choice:has(.discovery-choice-input:focus-visible) {
      outline: 2px solid #67e8f9;
      outline-offset: 3px;
    }

    .discovery-choice-input {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
    }

    .discovery-choice-id {
      display: grid;
      width: 1.55rem;
      height: 1.55rem;
      place-items: center;
      border: 1px solid rgba(103, 232, 249, 0.52);
      border-radius: 999px;
      color: #a5f3fc;
      font-family: var(--font-accent);
      font-size: 0.66rem;
      font-weight: 850;
      text-transform: uppercase;
    }

    .discovery-choice.is-selected .discovery-choice-id {
      border-color: #cffafe;
      background: #67e8f9;
      box-shadow: 0 0 0 0.2rem rgba(34, 211, 238, 0.2);
      color: #082f49;
    }

    .discovery-answer-field input[type="text"] {
      min-height: 2.8rem;
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.54);
      background: rgba(15, 23, 42, 0.98) !important;
      padding: 0.68rem 0.8rem;
      color: #f8fafc !important;
      color-scheme: dark;
    }

    .discovery-answer-field input[type="text"]::placeholder {
      color: #94a3b8;
    }

    .discovery-answer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .discovery-check:disabled {
      border-color: #475569;
      background: #334155;
      color: #94a3b8;
      cursor: not-allowed;
    }

    .discovery-keep-browsing {
      min-height: 2.75rem;
      border: 0;
      background: transparent;
      padding: 0.5rem;
      color: #cbd5e1;
      cursor: pointer;
      font-size: 0.82rem;
      text-decoration: underline;
      text-underline-offset: 0.24rem;
    }

    .discovery-play-feedback {
      grid-column: 1 / -1;
      margin: 0;
      color: #a7f3d0;
      font-size: 0.84rem;
    }

    .discovery-play-feedback.is-error {
      color: #fecaca;
    }

    .discovery-play-result {
      display: flex;
      gap: 0.9rem;
      align-items: flex-start;
      max-width: 64rem;
    }

    .discovery-play-result-mark {
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

    .discovery-play-result-message,
    .discovery-play-account-note {
      margin: 0;
      color: #e2e8f0;
      line-height: 1.5;
    }

    .discovery-play-sources {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 1rem;
      margin-top: 0.35rem;
    }

    .discovery-play-sources a,
    .discovery-play-account-note a {
      color: #67e8f9;
      font-weight: 700;
      text-underline-offset: 0.2rem;
    }

    .discovery-play-account-note {
      margin-top: 0.45rem;
      color: #cbd5e1;
      font-size: 0.8rem;
    }

    .discovery-next {
      margin-top: 0.85rem;
      background: transparent;
      color: #cffafe;
    }

    .discovery-next:hover {
      background: rgba(103, 232, 249, 0.12);
    }

    .discovery-playing-toggle:focus-visible,
    .discovery-play-close:focus-visible,
    .discovery-answer-toggle:focus-visible,
    .discovery-check:focus-visible,
    .discovery-next:focus-visible,
    .discovery-keep-browsing:focus-visible,
    .discovery-answer-field input[type="text"]:focus-visible,
    .discovery-hint summary:focus-visible {
      outline: 2px solid #67e8f9;
      outline-offset: 3px;
    }

    @media (max-width: 720px) {
      .discovery-play-overlay {
        padding: 0 0.5rem calc(4.75rem + env(safe-area-inset-bottom));
      }

      .discovery-play-card {
        width: 100%;
        max-height: min(72dvh, 40rem);
        border-radius: 0.65rem;
      }

      .discovery-play-header {
        grid-template-columns: minmax(0, 1fr) 2.75rem;
      }

      .discovery-play-progress {
        display: none;
      }

      .discovery-play-question-row,
      .discovery-answer-form {
        grid-template-columns: 1fr;
      }

      .discovery-answer-toggle {
        width: 100%;
      }

      .discovery-choices {
        grid-template-columns: 1fr;
      }

      .discovery-answer-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .discovery-playing-dot {
        box-shadow: none;
      }
    }
  `],
})
export class DailyDiscoveryPlayOverlayComponent {
  protected readonly play = inject(DailyDiscoveryPlayService);
  private readonly authService = inject(AuthService);
  private readonly answerInput = viewChild<ElementRef<HTMLInputElement>>('answerInput');
  private readonly answerChoices = viewChildren<ElementRef<HTMLInputElement>>('answerChoice');

  protected readonly pathNames = PATH_NAMES;
  protected readonly currentUser = toSignal(this.authService.user$, {initialValue: null});
  protected readonly displayChoices = computed(() => {
    const challenge = this.play.challenge();

    return challenge
      ? createDailyDiscoveryDisplayChoices(
        challenge.choices ?? [],
        `${challenge.dateKey}:${challenge.id}`,
      )
      : [];
  });
  protected readonly answerActionLabel = computed(() => {
    const questionType = this.play.challenge()?.questionType;

    return questionType === 'scenario_application'
      || questionType === 'inference'
      || questionType === 'compare_articles'
      || questionType === 'sequence'
      ? 'Solve'
      : 'Answer';
  });
  private readonly answerControlFocusEffect = effect(() => {
    if (!this.play.isPlaying() || !this.play.answersVisible() || this.play.isCompleted()) {
      return;
    }

    const control = this.answerChoices()[0]?.nativeElement ?? this.answerInput()?.nativeElement;

    if (control) {
      setTimeout(() => control.focus(), 0);
    }
  });

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.play.isPlaying()) {
      this.stopPlaying();
    }
  }

  protected stopPlaying(): void {
    this.play.stop();
  }

  protected toggleAnswers(): void {
    this.play.toggleAnswers();
  }

  protected hideAnswers(): void {
    this.play.answersVisible.set(false);
  }

  protected async checkAnswer(event: Event): Promise<void> {
    event.preventDefault();
    await this.play.checkAnswer();
  }

  protected async loadNextChallenge(): Promise<void> {
    await this.play.loadNextChallenge();
  }
}
