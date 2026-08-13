import {ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';

import {AuthService} from '../../../services/auth.service';
import {SiteSearchOverlayService} from '../../search/services/site-search-overlay.service';
import {DailyDiscoveryChallenge} from '../models/daily-discovery.model';
import {DailyDiscoveryPlayService} from '../services/daily-discovery-play.service';
import {DailyDiscoveryService} from '../services/daily-discovery.service';
import {DailyDiscoveryStateService} from '../services/daily-discovery-state.service';

@Component({
  selector: 'app-daily-discovery-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-playing]': 'play.isPlaying()',
  },
  template: `
    <section class="daily-discovery" aria-labelledby="daily-discovery-heading">
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
                #playButton
                type="button"
                class="daily-discovery-answer-toggle"
                (click)="startPlaying()"
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

    :host(.is-playing) {
      display: none;
    }

    .daily-discovery {
      position: relative;
      border-top: 1px solid rgba(103, 232, 249, 0.74);
      background: linear-gradient(90deg, rgba(2, 6, 23, 0.99), rgba(8, 23, 43, 0.99) 48%, rgba(2, 6, 23, 0.99));
      box-shadow: 0 -18px 45px rgba(2, 6, 23, 0.52);
      color: #f8fafc;
    }

    .daily-discovery-shell {
      display: grid;
      width: min(100%, 96rem);
      min-height: 7.25rem;
      grid-template-columns: minmax(20rem, 2.25fr) minmax(7rem, 0.62fr);
      gap: clamp(1rem, 2vw, 2.25rem);
      align-items: center;
      margin-inline: auto;
      padding: 1.1rem clamp(1rem, 4vw, 3rem);
    }

    .daily-discovery-prompt {
      min-width: 0;
    }

    .daily-discovery-label {
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

    .daily-discovery-status {
      margin: 0;
      color: #cbd5e1;
      font-size: 0.95rem;
    }

    .daily-discovery-points {
      display: grid;
      min-height: 2.8rem;
      align-content: center;
      gap: 0.18rem;
      border-left: 1px solid rgba(148, 163, 184, 0.26);
      padding-left: clamp(1rem, 2vw, 2rem);
      font-family: var(--font-accent);
      text-transform: uppercase;
    }

    .daily-discovery-points span {
      color: #cbd5e1;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.14em;
    }

    .daily-discovery-points strong {
      color: #67e8f9;
      font-size: 0.72rem;
      font-weight: 850;
      letter-spacing: 0.08em;
    }

    .daily-discovery-answer-toggle {
      display: inline-flex;
      min-height: 2.8rem;
      align-items: center;
      justify-content: center;
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
      transition: background 160ms ease, border-color 160ms ease;
    }

    .daily-discovery-answer-toggle:hover {
      border-color: #cffafe;
      background: #cffafe;
    }

    .daily-discovery-answer-toggle:focus-visible {
      outline: 2px solid #67e8f9;
      outline-offset: 3px;
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
    }

    @media (prefers-reduced-motion: reduce) {
      .daily-discovery-answer-toggle {
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
  private readonly playButton = viewChild<ElementRef<HTMLButtonElement>>('playButton');
  protected readonly play = inject(DailyDiscoveryPlayService);

  protected readonly challenge = signal<DailyDiscoveryChallenge | null>(null);
  protected readonly loadError = signal(false);
  protected readonly currentUser = toSignal(this.authService.user$, {initialValue: null});
  protected readonly isCompleted = computed(() => {
    const challenge = this.challenge();

    return Boolean(challenge && (
      challenge.dailyComplete
      || challenge.completedToday
      || (challenge.progress === null && this.localState.hasCompleted(challenge.dateKey, challenge.id))
    ));
  });
  protected readonly completedCount = computed(() => this.challenge()?.completedCount ?? 0);
  protected readonly totalQuestions = computed(() => this.challenge()?.totalQuestions ?? 10);
  protected readonly dailyComplete = computed(() => this.challenge()?.dailyComplete ?? false);
  protected readonly answerActionLabel = computed(() => {
    const questionType = this.challenge()?.questionType;

    return questionType === 'scenario_application'
      || questionType === 'inference'
      || questionType === 'compare_articles'
      || questionType === 'sequence'
      ? 'Solve'
      : 'Answer';
  });

  constructor() {
    void this.loadChallenge();
  }

  protected startPlaying(): void {
    const challenge = this.challenge();

    if (!challenge) {
      return;
    }

    this.play.start(challenge, this.playButton()?.nativeElement);

    if (!this.isCompleted()) {
      this.searchOverlay.requestAttention();
    }
  }

  private async loadChallenge(): Promise<void> {
    this.loadError.set(false);

    try {
      this.challenge.set(await this.dailyDiscoveryService.getChallenge(
        this.localState.getCompletedChallengeIdsForToday()
      ));
    } catch {
      this.loadError.set(true);
    }
  }
}
