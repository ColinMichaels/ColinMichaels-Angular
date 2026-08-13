import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';

import {
  DailyDiscoveryExternalQuestion,
  DailyDiscoveryExternalQuiz,
} from './daily-discovery-admin.models';
import {createDailyDiscoveryDisplayChoices} from '../../../features/daily-discovery/utils/daily-discovery-choice-order.util';

type PreviewFeedback = 'idle' | 'incorrect' | 'correct';

@Component({
  selector: 'app-daily-discovery-draft-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-[42rem] bg-zinc-950 text-zinc-100">
      <header class="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-900/70 px-4 py-4 sm:px-6">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Admin-only reader preview</p>
          <h2 class="mt-1 text-xl font-semibold text-zinc-50">Daily Discovery · {{ formattedQuizDate() }}</h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Test this local draft as a reader. Answers, progress, streaks, and points are not sent to Firebase.
          </p>
        </div>
        <button
          type="button"
          class="min-h-11 border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 transition hover:border-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          (click)="closePreview.emit()"
        >
          Return to editor
        </button>
      </header>

      @if (previewComplete) {
        <section class="grid min-h-[32rem] place-items-center p-6 text-center" aria-live="polite">
          <div class="max-w-xl border border-emerald-500/40 bg-emerald-500/10 p-6 sm:p-8">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Preview complete</p>
            <h3 class="mt-3 text-2xl font-semibold text-white">All {{ quiz.questions.length }} questions tested</h3>
            <p class="mt-3 text-sm leading-6 text-emerald-100/80">
              No reader progress or points were recorded. You can restart the draft or return to editing.
            </p>
            <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                class="min-h-11 border border-emerald-300 bg-emerald-300 px-5 text-sm font-bold text-zinc-950 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                (click)="restartPreview()"
              >
                Restart preview
              </button>
              <button
                type="button"
                class="min-h-11 border border-zinc-700 px-5 text-sm font-semibold text-zinc-200 hover:border-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                (click)="closePreview.emit()"
              >
                Return to editor
              </button>
            </div>
          </div>
        </section>
      } @else if (activeQuestion(); as question) {
        <div class="grid gap-6 p-4 sm:p-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside class="border border-zinc-800 bg-zinc-900/40 p-4" aria-label="Preview question navigation">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Jump to question</p>
            <div class="mt-3 grid grid-cols-5 gap-2 lg:grid-cols-2" role="group" aria-label="Preview questions">
              @for (candidate of quiz.questions; track candidate.id; let index = $index) {
                <button
                  type="button"
                  class="grid min-h-11 place-items-center border text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  [class.border-cyan-300]="selectedQuestionIndex === index"
                  [class.bg-cyan-300]="selectedQuestionIndex === index"
                  [class.text-zinc-950]="selectedQuestionIndex === index"
                  [class.border-zinc-700]="selectedQuestionIndex !== index"
                  [class.text-zinc-300]="selectedQuestionIndex !== index"
                  [attr.aria-current]="selectedQuestionIndex === index ? 'step' : null"
                  [attr.aria-label]="'Preview question ' + (index + 1)"
                  (click)="selectQuestion(index)"
                >
                  {{ index + 1 }}
                </button>
              }
            </div>
            <div class="mt-5 border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
              <p>Question {{ selectedQuestionIndex + 1 }} of {{ quiz.questions.length }}</p>
              <p class="mt-1">{{ testedQuestionCount }} tested this session</p>
            </div>
          </aside>

          <article class="min-w-0 border border-zinc-800 bg-zinc-900/35">
            <header class="border-b border-zinc-800 px-4 py-5 sm:px-6">
              <div class="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                <span class="border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200">{{ questionTypeLabel(question.type) }}</span>
                <span class="border border-zinc-700 px-2 py-1 text-zinc-300">{{ titleCase(question.difficulty) }}</span>
                <span class="text-zinc-500">About {{ question.estimatedSeconds }} seconds</span>
              </div>
              <h3 class="mt-4 max-w-4xl text-xl font-semibold leading-8 text-white sm:text-2xl">
                {{ question.prompt }}
              </h3>
            </header>

            <div class="space-y-5 p-4 sm:p-6">
              <div>
                <button
                  type="button"
                  class="min-h-11 border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 hover:border-amber-300 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  [attr.aria-expanded]="hintVisible"
                  (click)="hintVisible = !hintVisible"
                >
                  {{ hintVisible ? 'Hide hint' : 'Show hint' }}
                </button>
                @if (hintVisible) {
                  <p class="mt-3 border-l-2 border-amber-300 bg-amber-300/5 px-4 py-3 text-sm leading-6 text-amber-100">
                    {{ question.hint }}
                  </p>
                }
              </div>

              <fieldset [disabled]="feedback === 'correct'">
                <legend class="text-sm font-semibold text-zinc-200">Choose one answer</legend>
                <div class="mt-3 grid gap-3">
                  @for (displayChoice of displayChoices(question); track displayChoice.choice.id) {
                    <label
                      class="grid min-h-14 cursor-pointer grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 border bg-zinc-950 px-4 py-3 text-sm leading-6 transition focus-within:ring-2 focus-within:ring-cyan-300"
                      [attr.data-choice-id]="displayChoice.choice.id"
                      [class.border-cyan-300]="selectedChoiceId === displayChoice.choice.id && feedback === 'idle'"
                      [class.border-rose-400]="selectedChoiceId === displayChoice.choice.id && feedback === 'incorrect'"
                      [class.border-emerald-400]="feedback === 'correct' && displayChoice.choice.id === question.answer.correctChoiceId"
                      [class.border-zinc-800]="selectedChoiceId !== displayChoice.choice.id && !(feedback === 'correct' && displayChoice.choice.id === question.answer.correctChoiceId)"
                      [class.bg-cyan-300/5]="selectedChoiceId === displayChoice.choice.id && feedback === 'idle'"
                      [class.bg-rose-400/5]="selectedChoiceId === displayChoice.choice.id && feedback === 'incorrect'"
                      [class.bg-emerald-400/10]="feedback === 'correct' && displayChoice.choice.id === question.answer.correctChoiceId"
                    >
                      <input
                        type="radio"
                        class="sr-only"
                        [name]="'preview-' + question.id"
                        [value]="displayChoice.choice.id"
                        [checked]="selectedChoiceId === displayChoice.choice.id"
                        (change)="selectChoice(displayChoice.choice.id)"
                      >
                      <span
                        class="grid h-7 w-7 place-items-center rounded-full border border-cyan-300/50 text-xs font-bold text-cyan-200 transition"
                        data-choice-marker
                        aria-hidden="true"
                        [class.border-cyan-100]="selectedChoiceId === displayChoice.choice.id && feedback === 'idle'"
                        [class.bg-cyan-300]="selectedChoiceId === displayChoice.choice.id && feedback === 'idle'"
                        [class.text-zinc-950]="selectedChoiceId === displayChoice.choice.id && feedback === 'idle'"
                        [class.border-rose-300]="selectedChoiceId === displayChoice.choice.id && feedback === 'incorrect'"
                        [class.bg-rose-400]="selectedChoiceId === displayChoice.choice.id && feedback === 'incorrect'"
                        [class.text-white]="selectedChoiceId === displayChoice.choice.id && feedback === 'incorrect'"
                        [class.border-emerald-300]="feedback === 'correct' && displayChoice.choice.id === question.answer.correctChoiceId"
                        [class.bg-emerald-300]="feedback === 'correct' && displayChoice.choice.id === question.answer.correctChoiceId"
                      >{{ displayChoice.label }}</span>
                      <span>{{ displayChoice.choice.text }}</span>
                    </label>
                  }
                </div>
              </fieldset>

              <div class="min-h-6" aria-live="polite">
                @if (feedback === 'incorrect') {
                  <p class="text-sm font-semibold text-rose-300">Not quite. Review the article or hint, then try another answer.</p>
                } @else if (feedback === 'correct') {
                  <p class="text-sm font-semibold text-emerald-300">Correct. This is the explanation a reader will see.</p>
                }
              </div>

              @if (feedback === 'correct') {
                <section class="border border-emerald-500/40 bg-emerald-500/5 p-4 sm:p-5" aria-label="Answer explanation">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-300">Why this answer</h4>
                  <p class="mt-3 text-sm leading-7 text-zinc-200">{{ question.answer.explanation }}</p>
                  <div class="mt-4 border-t border-emerald-500/20 pt-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Source articles</p>
                    <ul class="mt-2 space-y-2">
                      @for (source of question.sourceArticles; track source.slug) {
                        <li>
                          <a
                            class="inline-flex min-h-11 items-center text-sm font-semibold text-cyan-300 underline decoration-cyan-700 underline-offset-4 hover:text-cyan-100"
                            [href]="source.url"
                            target="_blank"
                            rel="noopener"
                          >
                            {{ source.title }}
                          </a>
                        </li>
                      }
                    </ul>
                  </div>
                </section>
              }

              <div class="flex flex-col justify-end gap-3 border-t border-zinc-800 pt-5 sm:flex-row">
                @if (feedback !== 'correct') {
                  <button
                    type="button"
                    class="min-h-11 border border-cyan-300 bg-cyan-300 px-5 text-sm font-bold text-zinc-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600"
                    [disabled]="!selectedChoiceId"
                    (click)="checkAnswer()"
                  >
                    Check answer
                  </button>
                } @else {
                  <button
                    type="button"
                    class="min-h-11 border border-cyan-300 bg-cyan-300 px-5 text-sm font-bold text-zinc-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                    (click)="advancePreview()"
                  >
                    {{ advanceActionLabel() }}
                  </button>
                }
              </div>
            </div>
          </article>
        </div>
      }
    </div>
  `,
})
export class DailyDiscoveryDraftPreviewComponent implements OnChanges {
  @Input({required: true}) quiz!: DailyDiscoveryExternalQuiz;
  @Output() readonly closePreview = new EventEmitter<void>();

  protected selectedQuestionIndex = 0;
  protected selectedChoiceId = '';
  protected feedback: PreviewFeedback = 'idle';
  protected hintVisible = false;
  protected previewComplete = false;
  protected testedQuestionCount = 0;

  private readonly testedQuestionIds = new Set<string>();

  ngOnChanges(): void {
    this.restartPreview();
  }

  protected activeQuestion(): DailyDiscoveryExternalQuestion | null {
    return this.quiz.questions[this.selectedQuestionIndex] ?? null;
  }

  protected displayChoices(question: DailyDiscoveryExternalQuestion) {
    return createDailyDiscoveryDisplayChoices(
      question.choices,
      `${this.quiz.quizDate}:${question.id}`,
    );
  }

  protected selectQuestion(index: number): void {
    if (!this.quiz.questions[index]) return;

    this.selectedQuestionIndex = index;
    this.selectedChoiceId = '';
    this.feedback = 'idle';
    this.hintVisible = false;
    this.previewComplete = false;
  }

  protected selectChoice(choiceId: string): void {
    if (this.feedback === 'correct') return;
    this.selectedChoiceId = choiceId;
    this.feedback = 'idle';
  }

  protected checkAnswer(): void {
    const question = this.activeQuestion();
    if (!question || !this.selectedChoiceId) return;

    this.feedback = this.selectedChoiceId === question.answer.correctChoiceId ? 'correct' : 'incorrect';

    if (this.feedback === 'correct') {
      this.testedQuestionIds.add(question.id);
      this.testedQuestionCount = this.testedQuestionIds.size;
    }
  }

  protected advancePreview(): void {
    if (this.feedback !== 'correct') return;

    if (this.selectedQuestionIndex >= this.quiz.questions.length - 1) {
      const untestedQuestionIndex = this.quiz.questions.findIndex(question => !this.testedQuestionIds.has(question.id));

      if (untestedQuestionIndex >= 0) {
        this.selectQuestion(untestedQuestionIndex);
        return;
      }

      this.previewComplete = true;
      return;
    }

    this.selectQuestion(this.selectedQuestionIndex + 1);
  }

  protected advanceActionLabel(): string {
    if (this.selectedQuestionIndex < this.quiz.questions.length - 1) {
      return 'Next question';
    }

    return this.testedQuestionCount === this.quiz.questions.length
      ? 'Finish preview'
      : 'Next untested question';
  }

  protected restartPreview(): void {
    this.testedQuestionIds.clear();
    this.testedQuestionCount = 0;
    this.selectQuestion(0);
  }

  protected formattedQuizDate(): string {
    const date = new Date(`${this.quiz.quizDate}T12:00:00Z`);

    return Number.isNaN(date.getTime())
      ? this.quiz.quizDate
      : new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/New_York',
      }).format(date);
  }

  protected questionTypeLabel(type: string): string {
    return type.split('_').map(value => this.titleCase(value)).join(' ');
  }

  protected titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
