import {ChangeDetectionStrategy, Component, OnInit, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {
  faArrowUpRightFromSquare,
  faCircleCheck,
  faCloudArrowUp,
  faFileCode,
  faRotate,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import {AdminAlertComponent} from '../../shared/admin-alert.component';
import {AdminEditorActionBarComponent} from '../../shared/admin-editor-action-bar.component';
import {AdminPageHeaderComponent} from '../../shared/admin-page-header.component';
import {
  DAILY_DISCOVERY_DIFFICULTIES,
  DAILY_DISCOVERY_MAX_JSON_BYTES,
  DAILY_DISCOVERY_QUESTION_TYPES,
  createEditableQuizFromQuestionSet,
  getEasternDateKey,
  isValidDateKey,
  normalizeDailyDiscoveryQuiz,
  parseDailyDiscoveryQuizJson,
  requiresDraftApproval,
} from './daily-discovery-admin.adapter';
import {
  DailyDiscoveryAdminDryRunResult,
  DailyDiscoveryAdminQuestionSet,
  DailyDiscoveryExternalQuestion,
  DailyDiscoveryExternalQuiz,
} from './daily-discovery-admin.models';
import {DailyDiscoveryAdminService} from './daily-discovery-admin.service';
import {DailyDiscoveryDraftPreviewComponent} from './daily-discovery-draft-preview.component';

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Daily Discovery could not complete the request.';
  }

  return error.message
    .replace(/^FirebaseError:\s*/i, '')
    .replace(/^\[functions\/[a-z-]+\]\s*/i, '')
    .trim();
}

function getInputValue(event: Event): string {
  return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
    ? event.target.value
    : '';
}

function getSelectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}

@Component({
  selector: 'app-daily-discovery-admin-page',
  standalone: true,
  imports: [
    AdminAlertComponent,
    AdminEditorActionBarComponent,
    AdminPageHeaderComponent,
    DailyDiscoveryDraftPreviewComponent,
    FontAwesomeModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 lg:px-10 lg:py-10">
      <section class="mx-auto max-w-[96rem] space-y-5">
        <app-admin-page-header
          eyebrow="Site content"
          title="Daily Discovery"
          description="Upload a dated question file, review and edit each interaction, validate it against published posts, then create or safely replace the private set."
        >
          <div adminPageHeaderActions class="contents">
            <a
              routerLink="/"
              target="_blank"
              rel="noopener"
              class="inline-flex min-h-11 items-center justify-center gap-2 border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 transition hover:border-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <fa-icon [icon]="openIcon"></fa-icon>
              Open homepage
            </a>
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center gap-2 border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 transition hover:border-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:text-zinc-600"
              [disabled]="loadingSet()"
              (click)="refreshDate()"
            >
              <fa-icon [icon]="refreshIcon" [class.animate-spin]="loadingSet()"></fa-icon>
              {{ loadingSet() ? 'Refreshing...' : 'Refresh date' }}
            </button>
          </div>
        </app-admin-page-header>

        <section
          class="grid border border-zinc-800 bg-zinc-900/40 sm:grid-cols-2 xl:grid-cols-[1.25fr_1.2fr_.65fr_.65fr_.65fr]"
          aria-label="Daily Discovery date and stored set"
        >
          <label class="grid min-h-24 gap-2 border-b border-zinc-800 p-4 sm:border-r xl:border-b-0">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Eastern date</span>
            <input
              type="date"
              class="min-h-11 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:text-zinc-600"
              [value]="dateKey()"
              [disabled]="draftQuiz() !== null || loadingSet()"
              (change)="changeDate($event)"
            >
          </label>

          <div class="grid min-h-24 gap-2 border-b border-zinc-800 p-4 xl:border-b-0 xl:border-r">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Existing set</span>
            <span class="self-center text-sm font-semibold" [class.text-cyan-300]="existingSet()?.exists" [class.text-zinc-400]="!existingSet()?.exists">
              {{ existingStatusLabel() }}
            </span>
          </div>

          <div class="grid min-h-20 gap-2 border-b border-r border-zinc-800 p-4 sm:min-h-24 xl:border-b-0">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Revision</span>
            <span class="self-center text-xl font-semibold text-zinc-100">{{ existingRevisionLabel() }}</span>
          </div>
          <div class="grid min-h-20 gap-2 border-b border-zinc-800 p-4 sm:min-h-24 xl:border-b-0 xl:border-r">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Questions</span>
            <span class="self-center text-xl font-semibold text-zinc-100">{{ questionCount() }}</span>
          </div>
          <div class="grid min-h-20 gap-2 p-4 sm:min-h-24 sm:col-span-2 xl:col-span-1">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Sources</span>
            <span class="self-center text-xl font-semibold text-zinc-100">{{ sourceCount() }}</span>
          </div>
        </section>

        @if (errorMessage(); as error) {
          <app-admin-alert [message]="error"></app-admin-alert>
        }

        @if (successMessage(); as success) {
          <div class="flex items-start gap-3 border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-100" role="status">
            <fa-icon class="mt-0.5 text-emerald-300" [icon]="successIcon"></fa-icon>
            <p>{{ success }}</p>
          </div>
        }

        <section class="grid min-h-[42rem] gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <aside class="min-w-0 border border-zinc-800 bg-zinc-900/45" aria-label="Question set workflow">
            <section class="border-b border-zinc-800 p-4">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-sm font-semibold text-zinc-100">1. Upload dated JSON</h2>
                @if (draftQuiz()) {
                  <button type="button" class="min-h-9 text-xs font-semibold text-zinc-400 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" (click)="clearDraft()">
                    Clear draft
                  </button>
                }
              </div>

              <input
                #fileInput
                type="file"
                class="sr-only"
                accept=".json,application/json"
                (change)="selectFile($event)"
              >
              <button
                type="button"
                class="mt-3 flex min-h-32 w-full flex-col items-center justify-center gap-2 border border-dashed px-4 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                [class.border-cyan-300]="dragActive()"
                [class.bg-cyan-300/5]="dragActive()"
                [class.border-zinc-600]="!dragActive()"
                [disabled]="fileBusy()"
                (click)="fileInput.click()"
                (dragenter)="activateDrop($event)"
                (dragover)="activateDrop($event)"
                (dragleave)="deactivateDrop($event)"
                (drop)="dropFile($event)"
              >
                <fa-icon class="text-2xl text-cyan-300" [icon]="uploadIcon"></fa-icon>
                <span class="text-sm font-semibold text-zinc-100">{{ fileBusy() ? 'Reading JSON...' : 'Drop JSON file here' }}</span>
                <span class="text-xs text-zinc-500">or click to browse · max {{ maxJsonKilobytes }} KiB</span>
              </button>

              @if (draftFileName()) {
                <div class="mt-3 flex min-w-0 items-center gap-3 border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                  <fa-icon class="text-cyan-300" [icon]="fileIcon"></fa-icon>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-zinc-200">{{ draftFileName() }}</p>
                    <p class="text-xs text-zinc-500">{{ draftQuiz()?.questions?.length ?? 0 }} questions loaded</p>
                  </div>
                </div>
              }

              <button
                type="button"
                class="mt-3 flex min-h-11 w-full items-center justify-between border border-zinc-700 px-3 text-left text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                [attr.aria-expanded]="pasteOpen()"
                (click)="pasteOpen.set(!pasteOpen())"
              >
                Paste JSON
                <span aria-hidden="true">{{ pasteOpen() ? '−' : '+' }}</span>
              </button>

              @if (pasteOpen()) {
                <label class="mt-3 grid gap-2">
                  <span class="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Question JSON</span>
                  <textarea
                    rows="8"
                    class="w-full resize-y border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
                    placeholder="Paste the complete dated quiz object"
                    [value]="pastedJson()"
                    (input)="pastedJson.set(inputValue($event))"
                  ></textarea>
                </label>
                <button
                  type="button"
                  class="mt-3 min-h-11 w-full border border-cyan-400 px-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                  (click)="importPastedJson()"
                >
                  Load pasted JSON
                </button>
              }
            </section>

            <section class="border-b border-zinc-800 p-4">
              <h2 class="text-sm font-semibold text-zinc-100">2. Existing set summary</h2>
              @if (existingSet(); as set) {
                @if (set.exists) {
                  <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                    <dt class="text-zinc-500">Date</dt><dd class="text-zinc-200">{{ set.dateKey }}</dd>
                    <dt class="text-zinc-500">Revision</dt><dd class="text-zinc-200">{{ set.revision }}</dd>
                    <dt class="text-zinc-500">Mode</dt><dd class="truncate text-zinc-200" [title]="set.generationMode">{{ set.generationMode || 'automatic' }}</dd>
                    <dt class="text-zinc-500">Questions</dt><dd class="text-zinc-200">{{ set.questions.length }}</dd>
                  </dl>
                  <button
                    type="button"
                    class="mt-3 min-h-10 w-full border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-zinc-600"
                    [disabled]="!canEditExisting() || draftQuiz() !== null"
                    (click)="editExistingSet()"
                  >
                    {{ canEditExisting() ? 'Load existing into editor' : 'Upload JSON to replace this automatic set' }}
                  </button>
                } @else {
                  <p class="mt-3 text-sm leading-6 text-zinc-500">No stored question set exists for this date.</p>
                }
              } @else {
                <p class="mt-3 text-sm text-zinc-500">Loading set status...</p>
              }
            </section>

            @if (draftQuiz(); as quiz) {
              <section class="border-b border-zinc-800 p-4">
                <h2 class="text-sm font-semibold text-zinc-100">3. Draft details</h2>
                <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  <dt class="text-zinc-500">Quiz date</dt><dd class="text-zinc-200">{{ quiz.quizDate }}</dd>
                  <dt class="text-zinc-500">Input status</dt><dd class="text-zinc-200">{{ quiz.status }}</dd>
                  <dt class="text-zinc-500">Upload status</dt><dd class="text-zinc-200">{{ quiz.uploadStatus }}</dd>
                  <dt class="text-zinc-500">Validation</dt>
                  <dd [class.text-emerald-300]="validationResult()" [class.text-zinc-500]="!validationResult()">
                    {{ validationResult() ? 'Passed' : 'Not validated' }}
                  </dd>
                </dl>

                @if (draftNeedsApproval()) {
                  <label class="mt-4 flex cursor-pointer items-start gap-3 border border-amber-500/40 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100">
                    <input type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-cyan-300" [checked]="approveDraft()" (change)="approveDraft.set(checkboxValue($event))">
                    <span>I reviewed this draft/manual-review file and approve it for saving.</span>
                  </label>
                }

                @if (requiresLiveConfirmation()) {
                  <label class="mt-3 flex cursor-pointer items-start gap-3 border border-cyan-500/40 bg-cyan-500/5 p-3 text-xs leading-5 text-cyan-100">
                    <input type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-cyan-300" [checked]="confirmLiveReplacement()" (change)="confirmLiveReplacement.set(checkboxValue($event))">
                    <span>I understand this will replace today’s live revision {{ existingRevisionLabel() }} while preserving its ordered question IDs.</span>
                  </label>
                }

                <button type="button" class="mt-3 min-h-10 w-full border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 hover:border-cyan-300 hover:text-cyan-200" (click)="downloadDraft()">
                  Download edited JSON
                </button>
                <button
                  type="button"
                  class="mt-2 min-h-10 w-full border border-cyan-500/60 bg-cyan-500/5 px-3 text-xs font-semibold text-cyan-200 hover:border-cyan-300 hover:bg-cyan-300 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  (click)="previewOpen.set(true)"
                >
                  Preview reader experience
                </button>
              </section>

              <section class="p-4">
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-sm font-semibold text-zinc-100">4. Questions</h2>
                  <span class="text-xs text-zinc-500">{{ quiz.questions.length }}</span>
                </div>
                <div class="mt-3 flex gap-2 overflow-x-auto pb-2 xl:block xl:space-y-1 xl:overflow-visible" aria-label="Draft question index">
                  @for (question of quiz.questions; track question.id; let index = $index) {
                    <button
                      type="button"
                      class="flex min-h-11 min-w-11 items-center gap-3 border px-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 xl:w-full"
                      [class.border-cyan-300]="selectedQuestionIndex() === index"
                      [class.bg-cyan-300/10]="selectedQuestionIndex() === index"
                      [class.text-cyan-100]="selectedQuestionIndex() === index"
                      [class.border-zinc-800]="selectedQuestionIndex() !== index"
                      [class.text-zinc-400]="selectedQuestionIndex() !== index"
                      (click)="selectedQuestionIndex.set(index)"
                    >
                      <span class="w-5 shrink-0 text-center font-semibold">{{ index + 1 }}</span>
                      <span class="hidden min-w-0 flex-1 truncate xl:block">{{ question.prompt }}</span>
                      @if (validationResult()) {
                        <fa-icon class="hidden text-emerald-400 xl:block" [icon]="successIcon"></fa-icon>
                      }
                    </button>
                  }
                </div>
              </section>
            }
          </aside>

          <section class="min-w-0 border border-zinc-800 bg-zinc-900/35">
            @if (previewOpen() && draftQuiz(); as previewQuiz) {
              <app-daily-discovery-draft-preview
                [quiz]="previewQuiz"
                (closePreview)="previewOpen.set(false)"
              ></app-daily-discovery-draft-preview>
            } @else if (activeQuestion(); as question) {
              <header class="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-5">
                <div>
                  <h2 class="text-sm font-semibold text-zinc-100">Editing question {{ selectedQuestionIndex() + 1 }} of {{ draftQuiz()?.questions?.length }}</h2>
                  <p class="mt-1 text-xs text-zinc-500">{{ question.id }}</p>
                </div>
                <span class="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">Multiple choice</span>
              </header>

              <div class="space-y-5 p-4 sm:p-5">
                <section class="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_13rem_11rem]">
                  <label class="grid gap-2">
                    <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Prompt</span>
                    <textarea rows="3" class="w-full border border-zinc-700 bg-zinc-950 p-3 text-sm leading-6 text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300" [value]="question.prompt" (input)="updateQuestionText('prompt', $event)"></textarea>
                  </label>
                  <label class="grid content-start gap-2">
                    <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Type</span>
                    <select class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300" [value]="question.type" (change)="updateQuestionSelect('type', $event)">
                      @for (type of questionTypes; track type) { <option [value]="type">{{ questionTypeLabel(type) }}</option> }
                    </select>
                  </label>
                  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <label class="grid content-start gap-2">
                      <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Difficulty</span>
                      <select class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300" [value]="question.difficulty" (change)="updateQuestionSelect('difficulty', $event)">
                        @for (difficulty of difficulties; track difficulty) { <option [value]="difficulty">{{ titleCase(difficulty) }}</option> }
                      </select>
                    </label>
                    <label class="grid content-start gap-2">
                      <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Seconds</span>
                      <input type="number" min="10" max="300" class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300" [value]="question.estimatedSeconds" (input)="updateEstimatedSeconds($event)">
                    </label>
                  </div>
                </section>

                <label class="grid gap-2">
                  <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Hint</span>
                  <textarea rows="2" class="w-full border border-zinc-700 bg-zinc-950 p-3 text-sm leading-6 text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300" [value]="question.hint" (input)="updateQuestionText('hint', $event)"></textarea>
                </label>

                <fieldset>
                  <div class="flex flex-wrap items-end justify-between gap-3">
                    <legend class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Choices · select the correct answer</legend>
                    <button type="button" class="min-h-9 text-xs font-semibold text-cyan-300 hover:text-cyan-100 disabled:text-zinc-600" [disabled]="question.choices.length >= 6" (click)="addChoice()">Add choice</button>
                  </div>
                  <div class="mt-2 space-y-2">
                    @for (choice of question.choices; track choice.id; let choiceIndex = $index) {
                      <div class="grid grid-cols-[2.75rem_2.75rem_minmax(0,1fr)_auto] items-center border border-zinc-800 bg-zinc-950">
                        <label class="grid min-h-11 place-items-center border-r border-zinc-800" [title]="'Mark choice ' + choice.id + ' correct'">
                          <input type="radio" [name]="'correct-' + question.id" class="h-4 w-4 accent-cyan-300" [checked]="question.answer.correctChoiceId === choice.id" (change)="setCorrectChoice(choice.id)">
                          <span class="sr-only">Mark choice {{ choice.id }} correct</span>
                        </label>
                        <span class="grid min-h-11 place-items-center border-r border-zinc-800 text-sm font-semibold uppercase text-zinc-400">{{ choice.id }}</span>
                        <input type="text" class="min-h-11 min-w-0 bg-transparent px-3 text-sm text-zinc-100 outline-none focus:bg-zinc-900" [value]="choice.text" (input)="updateChoiceText(choiceIndex, $event)">
                        <button type="button" class="min-h-11 px-3 text-xs font-semibold text-zinc-500 hover:text-rose-300 disabled:text-zinc-800" [disabled]="question.choices.length <= 2" (click)="removeChoice(choiceIndex)">Remove</button>
                      </div>
                    }
                  </div>
                </fieldset>

                <label class="grid gap-2">
                  <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Explanation</span>
                  <textarea rows="3" class="w-full border border-zinc-700 bg-zinc-950 p-3 text-sm leading-6 text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300" [value]="question.answer.explanation" (input)="updateExplanation($event)"></textarea>
                </label>

                <section class="space-y-3 border-t border-zinc-800 pt-5">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 class="text-sm font-semibold text-zinc-100">Source articles</h3>
                      <p class="mt-1 text-xs text-zinc-500">Published Firestore posts remain authoritative for titles and document ids.</p>
                    </div>
                    <button type="button" class="min-h-9 text-xs font-semibold text-cyan-300 hover:text-cyan-100 disabled:text-zinc-600" [disabled]="question.sourceArticles.length >= 3" (click)="addSource()">Add source</button>
                  </div>

                  @for (source of question.sourceArticles; track $index; let sourceIndex = $index) {
                    <article class="grid gap-3 border border-zinc-800 bg-zinc-950 p-3 lg:grid-cols-2">
                      <label class="grid gap-2">
                        <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Source slug</span>
                        <input type="text" class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300" [value]="source.slug" (input)="updateSourceText(sourceIndex, 'slug', $event)">
                      </label>
                      <label class="grid gap-2">
                        <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Generated title</span>
                        <input type="text" class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300" [value]="source.title" (input)="updateSourceText(sourceIndex, 'title', $event)">
                      </label>
                      <label class="grid gap-2 lg:col-span-2">
                        <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Evidence</span>
                        <textarea rows="3" class="w-full border border-zinc-700 bg-zinc-950 p-3 text-sm leading-6 text-zinc-100 outline-none focus:border-cyan-300" [value]="source.evidence" (input)="updateSourceText(sourceIndex, 'evidence', $event)"></textarea>
                      </label>
                      <div class="flex flex-wrap items-center justify-between gap-3 text-xs lg:col-span-2">
                        <a [href]="source.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-100">
                          Open source
                          <fa-icon [icon]="openIcon"></fa-icon>
                        </a>
                        <button type="button" class="min-h-9 font-semibold text-zinc-500 hover:text-rose-300 disabled:text-zinc-800" [disabled]="question.sourceArticles.length <= 1" (click)="removeSource(sourceIndex)">Remove source</button>
                      </div>
                    </article>
                  }
                </section>

                @if (validationResult(); as validation) {
                  <div class="flex items-start gap-3 border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-100" role="status">
                    <fa-icon class="mt-0.5 text-emerald-300" [icon]="successIcon"></fa-icon>
                    <p><strong>Validation passed.</strong> {{ validation.questionCount }} questions and {{ validation.publishedSourceCount }} published sources are ready for revision {{ validation.nextRevision }}.</p>
                  </div>
                } @else if (draftQuiz()) {
                  <div class="flex items-start gap-3 border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                    <fa-icon class="mt-0.5 text-amber-300" [icon]="warningIcon"></fa-icon>
                    <p>Validate after every edit. Saving stays locked until the current draft passes the server checks.</p>
                  </div>
                }
              </div>

              <app-admin-editor-action-bar [panel]="true" [busy]="mutationBusy()" [status]="actionStatus()">
                <div adminEditorActions class="contents">
                  <button type="button" class="min-h-11 border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-zinc-600" [disabled]="mutationBusy()" (click)="validateDraft()">
                    {{ validating() ? 'Validating...' : 'Validate draft' }}
                  </button>
                  <button type="button" class="min-h-11 border border-cyan-300 bg-cyan-300 px-5 text-sm font-bold text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600" [disabled]="!canSave()" (click)="saveDraft()">
                    {{ saving() ? 'Saving...' : saveButtonLabel() }}
                  </button>
                </div>
              </app-admin-editor-action-bar>
            } @else {
              <div class="grid min-h-[42rem] place-items-center p-8 text-center">
                <div class="max-w-md">
                  <fa-icon class="text-4xl text-zinc-700" [icon]="fileIcon"></fa-icon>
                  <h2 class="mt-5 text-2xl font-semibold text-zinc-100">Load a question draft</h2>
                  <p class="mt-3 text-sm leading-6 text-zinc-500">Upload or paste a dated generated JSON file. An existing imported multiple-choice set can also be loaded back into the editor.</p>
                </div>
              </div>
            }
          </section>
        </section>
      </section>
    </main>
  `,
})
export class DailyDiscoveryAdminPageComponent implements OnInit {
  private readonly dailyDiscoveryAdmin = inject(DailyDiscoveryAdminService);

  protected readonly questionTypes = DAILY_DISCOVERY_QUESTION_TYPES;
  protected readonly difficulties = DAILY_DISCOVERY_DIFFICULTIES;
  protected readonly maxJsonKilobytes = DAILY_DISCOVERY_MAX_JSON_BYTES / 1024;
  protected readonly uploadIcon = faCloudArrowUp;
  protected readonly fileIcon = faFileCode;
  protected readonly refreshIcon = faRotate;
  protected readonly openIcon = faArrowUpRightFromSquare;
  protected readonly successIcon = faCircleCheck;
  protected readonly warningIcon = faTriangleExclamation;
  protected readonly currentDateKey = getEasternDateKey();

  protected readonly dateKey = signal(this.currentDateKey);
  protected readonly existingSet = signal<DailyDiscoveryAdminQuestionSet | null>(null);
  protected readonly draftQuiz = signal<DailyDiscoveryExternalQuiz | null>(null);
  protected readonly draftFileName = signal('');
  protected readonly selectedQuestionIndex = signal(0);
  protected readonly validationResult = signal<DailyDiscoveryAdminDryRunResult | null>(null);
  protected readonly validatedSignature = signal('');
  protected readonly pastedJson = signal('');
  protected readonly pasteOpen = signal(false);
  protected readonly previewOpen = signal(false);
  protected readonly approveDraft = signal(false);
  protected readonly confirmLiveReplacement = signal(false);
  protected readonly loadingSet = signal(false);
  protected readonly fileBusy = signal(false);
  protected readonly dragActive = signal(false);
  protected readonly validating = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly activeQuestion = computed(() => (
    this.draftQuiz()?.questions[this.selectedQuestionIndex()] ?? null
  ));
  protected readonly draftNeedsApproval = computed(() => {
    const quiz = this.draftQuiz();
    return quiz ? requiresDraftApproval(quiz) : false;
  });
  protected readonly canEditExisting = computed(() => {
    const set = this.existingSet();
    return Boolean(set?.exists && createEditableQuizFromQuestionSet(set));
  });
  protected readonly requiresLiveConfirmation = computed(() => (
    this.dateKey() === this.currentDateKey && this.existingSet()?.exists === true
  ));
  protected readonly mutationBusy = computed(() => this.validating() || this.saving());
  protected readonly existingStatusLabel = computed(() => {
    const set = this.existingSet();

    if (!set) return this.loadingSet() ? 'Loading...' : 'Not loaded';
    if (!set.exists) return 'No stored set';
    if (set.dateKey === this.currentDateKey) return 'Live today';
    return set.dateKey > this.currentDateKey ? 'Scheduled future set' : 'Historical set';
  });
  protected readonly existingRevisionLabel = computed(() => {
    const set = this.existingSet();
    return set?.exists ? String(set.revision) : '—';
  });
  protected readonly questionCount = computed(() => {
    const draft = this.draftQuiz();
    const set = this.existingSet();

    return draft?.questions.length ?? (set?.exists ? set.questions.length : 0);
  });
  protected readonly sourceCount = computed(() => {
    const quiz = this.draftQuiz();

    if (quiz) {
      return new Set(quiz.questions.flatMap(question => question.sourceArticles.map(source => source.slug))).size;
    }

    const set = this.existingSet();
    return set?.exists ? set.sourcePostIds.length : 0;
  });
  protected readonly saveButtonLabel = computed(() => {
    const set = this.existingSet();
    return set?.exists ? `Replace revision ${set.revision}` : 'Create set';
  });
  protected readonly actionStatus = computed(() => {
    if (this.saving()) return 'Saving the trusted question set...';
    if (this.validating()) return 'Checking JSON and published article sources...';
    if (this.validationResult()) return 'Validation passed. The current draft is ready for its guarded save.';
    return 'Validate the current draft before saving.';
  });
  protected readonly canSave = computed(() => {
    const quiz = this.draftQuiz();

    return Boolean(
      quiz
      && this.validationResult()
      && this.validatedSignature() === JSON.stringify(normalizeDailyDiscoveryQuiz(quiz))
      && (!this.draftNeedsApproval() || this.approveDraft())
      && (!this.requiresLiveConfirmation() || this.confirmLiveReplacement())
      && !this.mutationBusy()
      && this.dateKey() >= this.currentDateKey
    );
  });

  ngOnInit(): void {
    void this.loadDate(this.dateKey());
  }

  protected inputValue(event: Event): string {
    return getInputValue(event);
  }

  protected checkboxValue(event: Event): boolean {
    return event.target instanceof HTMLInputElement && event.target.checked;
  }

  protected async changeDate(event: Event): Promise<void> {
    const nextDate = getInputValue(event);

    if (!isValidDateKey(nextDate)) {
      this.errorMessage.set('Choose a valid Eastern calendar date.');
      return;
    }

    this.dateKey.set(nextDate);
    await this.loadDate(nextDate);
  }

  protected async refreshDate(): Promise<void> {
    await this.loadDate(this.dateKey());
  }

  protected async selectFile(event: Event): Promise<void> {
    const input = event.target;
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;

    if (file) {
      await this.importFile(file);
    }
    if (input instanceof HTMLInputElement) {
      input.value = '';
    }
  }

  protected activateDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  protected deactivateDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  protected async dropFile(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files?.[0];

    if (file) {
      await this.importFile(file);
    }
  }

  protected async importPastedJson(): Promise<void> {
    await this.importJson(this.pastedJson(), 'Pasted Daily Discovery JSON');
  }

  protected clearDraft(): void {
    this.draftQuiz.set(null);
    this.draftFileName.set('');
    this.pastedJson.set('');
    this.selectedQuestionIndex.set(0);
    this.approveDraft.set(false);
    this.confirmLiveReplacement.set(false);
    this.previewOpen.set(false);
    this.clearValidation();
    this.successMessage.set('Draft cleared. The stored set was not changed.');
  }

  protected editExistingSet(): void {
    const set = this.existingSet();

    if (!set?.exists) {
      return;
    }

    const editable = createEditableQuizFromQuestionSet(set);

    if (!editable) {
      this.errorMessage.set('This automatic title-gap set cannot be converted into a multiple-choice editing draft. Upload a complete JSON file to replace it.');
      return;
    }

    this.draftQuiz.set(editable);
    this.draftFileName.set(`Existing revision ${set.revision}`);
    this.selectedQuestionIndex.set(0);
    this.approveDraft.set(false);
    this.confirmLiveReplacement.set(false);
    this.previewOpen.set(false);
    this.clearValidation();
    this.errorMessage.set('');
    this.successMessage.set('Existing questions loaded into a local draft. Nothing changes until validation and save succeed.');
  }

  protected updateQuestionText(field: 'prompt' | 'hint', event: Event): void {
    this.updateQuestion(question => ({...question, [field]: getInputValue(event)}));
  }

  protected updateQuestionSelect(field: 'type' | 'difficulty', event: Event): void {
    this.updateQuestion(question => ({...question, [field]: getSelectValue(event)} as DailyDiscoveryExternalQuestion));
  }

  protected updateEstimatedSeconds(event: Event): void {
    const value = Number(getInputValue(event));
    this.updateQuestion(question => ({...question, estimatedSeconds: Number.isFinite(value) ? value : 60}));
  }

  protected updateChoiceText(choiceIndex: number, event: Event): void {
    this.updateQuestion(question => ({
      ...question,
      choices: question.choices.map((choice, index) => (
        index === choiceIndex ? {...choice, text: getInputValue(event)} : choice
      )),
    }));
  }

  protected setCorrectChoice(choiceId: string): void {
    this.updateQuestion(question => ({
      ...question,
      answer: {...question.answer, correctChoiceId: choiceId},
    }));
  }

  protected addChoice(): void {
    this.updateQuestion(question => {
      if (question.choices.length >= 6) return question;
      const usedIds = new Set(question.choices.map(choice => choice.id));
      const id = 'abcdef'.split('').find(candidate => !usedIds.has(candidate))
        ?? `option-${question.choices.length + 1}`;

      return {...question, choices: [...question.choices, {id, text: ''}]};
    });
  }

  protected removeChoice(choiceIndex: number): void {
    this.updateQuestion(question => {
      if (question.choices.length <= 2) return question;
      const removed = question.choices[choiceIndex];
      const choices = question.choices.filter((_, index) => index !== choiceIndex);
      const correctChoiceId = removed?.id === question.answer.correctChoiceId
        ? choices[0].id
        : question.answer.correctChoiceId;

      return {...question, choices, answer: {...question.answer, correctChoiceId}};
    });
  }

  protected updateExplanation(event: Event): void {
    this.updateQuestion(question => ({
      ...question,
      answer: {...question.answer, explanation: getInputValue(event)},
    }));
  }

  protected updateSourceText(
    sourceIndex: number,
    field: 'slug' | 'title' | 'evidence',
    event: Event
  ): void {
    this.updateQuestion(question => ({
      ...question,
      sourceArticles: question.sourceArticles.map((source, index) => {
        if (index !== sourceIndex) return source;
        const next = {...source, [field]: getInputValue(event)};
        return field === 'slug'
          ? {...next, url: `https://colinmichaels.com/blog/${next.slug.trim()}`}
          : next;
      }),
    }));
  }

  protected addSource(): void {
    this.updateQuestion(question => question.sourceArticles.length >= 3 ? question : ({
      ...question,
      sourceArticles: [...question.sourceArticles, {
        title: '',
        slug: '',
        url: 'https://colinmichaels.com/blog/',
        evidence: '',
      }],
    }));
  }

  protected removeSource(sourceIndex: number): void {
    this.updateQuestion(question => question.sourceArticles.length <= 1 ? question : ({
      ...question,
      sourceArticles: question.sourceArticles.filter((_, index) => index !== sourceIndex),
    }));
  }

  protected async validateDraft(): Promise<void> {
    const quiz = this.draftQuiz();
    const set = this.existingSet();
    if (!quiz) return;

    const normalized = normalizeDailyDiscoveryQuiz(quiz);
    this.draftQuiz.set(normalized);
    this.validating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const result = await this.dailyDiscoveryAdmin.saveQuestionSet({
        operation: set?.exists ? 'replace' : 'create',
        requestId: this.createRequestId(),
        ...(set?.exists ? {expectedRevision: set.revision} : {}),
        approveDraft: this.approveDraft(),
        confirmLiveReplacement: this.confirmLiveReplacement(),
        dryRun: true,
        quiz: normalized,
      });

      if (!result.dryRun) {
        throw new Error('The validation request returned an unexpected write result.');
      }

      this.validationResult.set(result);
      this.validatedSignature.set(JSON.stringify(normalized));
      this.successMessage.set(`Validation passed for ${result.questionCount} questions and ${result.publishedSourceCount} published sources.`);
    } catch (error) {
      this.clearValidation();
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.validating.set(false);
    }
  }

  protected async saveDraft(): Promise<void> {
    const quiz = this.draftQuiz();
    const set = this.existingSet();

    if (!quiz || !this.canSave()) return;

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const result = await this.dailyDiscoveryAdmin.saveQuestionSet({
        operation: set?.exists ? 'replace' : 'create',
        requestId: this.createRequestId(),
        ...(set?.exists ? {expectedRevision: set.revision} : {}),
        approveDraft: this.approveDraft(),
        confirmLiveReplacement: this.confirmLiveReplacement(),
        dryRun: false,
        quiz: normalizeDailyDiscoveryQuiz(quiz),
      });

      if (result.dryRun) {
        throw new Error('The save request returned a validation result without writing.');
      }

      const success = `${result.operation === 'create' ? 'Created' : 'Replaced'} ${result.dateKey} at revision ${result.revision}.`;
      this.draftQuiz.set(null);
      this.draftFileName.set('');
      this.pastedJson.set('');
      this.approveDraft.set(false);
      this.confirmLiveReplacement.set(false);
      this.previewOpen.set(false);
      this.clearValidation();
      await this.loadDate(result.dateKey);
      this.successMessage.set(success);
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected downloadDraft(): void {
    const quiz = this.draftQuiz();
    if (!quiz) return;

    const blob = new Blob([JSON.stringify(normalizeDailyDiscoveryQuiz(quiz), null, 2)], {type: 'application/json'});
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `daily-discovery-${quiz.quizDate}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  protected questionTypeLabel(type: string): string {
    return type.split('_').map(this.titleCase).join(' ');
  }

  protected titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private async importFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.errorMessage.set('Choose a .json Daily Discovery file.');
      return;
    }
    if (file.size > DAILY_DISCOVERY_MAX_JSON_BYTES) {
      this.errorMessage.set('The JSON file is larger than the 512 KiB upload limit.');
      return;
    }

    this.fileBusy.set(true);
    try {
      await this.importJson(await file.text(), file.name);
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.fileBusy.set(false);
    }
  }

  private async importJson(text: string, fileName: string): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const quiz = parseDailyDiscoveryQuizJson(text);
      this.dateKey.set(quiz.quizDate);
      await this.loadDate(quiz.quizDate);
      this.draftQuiz.set(quiz);
      this.draftFileName.set(fileName);
      this.selectedQuestionIndex.set(0);
      this.approveDraft.set(false);
      this.confirmLiveReplacement.set(false);
      this.previewOpen.set(false);
      this.clearValidation();
      this.successMessage.set(`${quiz.questions.length} questions loaded. Review the draft, then validate it against published posts.`);
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    }
  }

  private async loadDate(dateKey: string): Promise<void> {
    this.loadingSet.set(true);
    this.errorMessage.set('');

    try {
      this.existingSet.set(await this.dailyDiscoveryAdmin.getQuestionSet(dateKey));
    } catch (error) {
      this.existingSet.set(null);
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.loadingSet.set(false);
    }
  }

  private updateQuestion(update: (question: DailyDiscoveryExternalQuestion) => DailyDiscoveryExternalQuestion): void {
    const quiz = this.draftQuiz();
    const index = this.selectedQuestionIndex();
    const question = quiz?.questions[index];

    if (!quiz || !question) return;

    this.draftQuiz.set({
      ...quiz,
      questions: quiz.questions.map((candidate, candidateIndex) => (
        candidateIndex === index ? update(candidate) : candidate
      )),
    });
    this.clearValidation();
  }

  private clearValidation(): void {
    this.validationResult.set(null);
    this.validatedSignature.set('');
  }

  private createRequestId(): string {
    return typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `daily-discovery-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
  }
}
