import {NgClass} from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  inject,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {User} from 'firebase/auth';

import {AuthService} from '../../../../services/auth.service';
import {BlogPollResults} from '../../models/blog-poll.model';
import {BlogContentBlock, BlogPollOption} from '../../models/blog-post.model';
import {BlogPollService} from '../../services/blog-poll.service';

@Component({
  selector: 'app-blog-poll',
  imports: [NgClass, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isRenderable) {
      <section
        class="border border-slate-300 bg-white shadow-sm shadow-slate-950/5 dark:border-zinc-700 dark:bg-neutral-950 dark:shadow-black/20"
        [ngClass]="compact ? 'p-4' : 'p-5 sm:p-7'"
        [attr.aria-labelledby]="headingId"
      >
        <h3
          [id]="headingId"
          class="font-semibold text-slate-950 dark:text-zinc-50"
          [ngClass]="compact ? 'text-lg leading-6' : 'text-xl leading-7 sm:text-2xl'"
        >
          {{ block.data.question }}
        </h3>
        @if (block.data.description) {
          <p
            class="mt-2 text-slate-600 dark:text-zinc-400"
            [ngClass]="compact ? 'text-sm leading-6' : 'text-base leading-7'"
          >{{ block.data.description }}</p>
        }

        @if (loadingResults) {
          <p class="mt-5 border border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-zinc-800 dark:text-zinc-500" role="status">
            Loading poll…
          </p>
        } @else if (showResults && results?.resultsVisible) {
          <div class="mt-6 space-y-0 border border-slate-200 dark:border-zinc-800" aria-label="Poll results">
            @for (option of results?.options; track option.id) {
              <article class="border-b border-slate-200 p-4 last:border-b-0 dark:border-zinc-800">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="font-medium leading-6 text-slate-900 dark:text-zinc-100">{{ option.label }}</p>
                    @if (option.id === results?.selectedOptionId) {
                      <p class="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <span aria-hidden="true">✓</span> Your vote
                      </p>
                    }
                  </div>
                  <div class="shrink-0 text-right">
                    <p class="text-xl font-semibold leading-6 text-slate-950 dark:text-zinc-50">{{ formatPercent(option.percent) }}</p>
                    <p class="mt-1 text-sm text-slate-500 dark:text-zinc-500">{{ formatVoteCount(option.count) }}</p>
                  </div>
                </div>
                <div class="mt-3 h-2 overflow-hidden bg-slate-200 dark:bg-zinc-800" aria-hidden="true">
                  <span class="block h-full bg-cyan-600 dark:bg-cyan-300" [style.width.%]="option.percent"></span>
                </div>
              </article>
            }
            <footer class="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <p class="font-medium text-slate-800 dark:text-zinc-200">{{ formatResponseCount(results?.totalResponses ?? 0) }}</p>
              <button type="button" class="min-h-11 px-2 font-medium text-cyan-700 hover:text-cyan-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-100" (click)="hideResults()">
                Hide results
              </button>
            </footer>
          </div>
          <p class="mt-5 text-center text-sm text-slate-500 dark:text-zinc-500">Results update after each verified vote.</p>
        } @else {
          <form class="mt-6" (submit)="submitVote($event)">
            <fieldset class="space-y-3" [disabled]="submitting || readOnly">
              <legend class="sr-only">{{ block.data.question }}</legend>
              @for (option of pollOptions; track option.id) {
                <label
                  [class]="optionClass(option.id)"
                >
                  <input
                    type="radio"
                    [name]="inputName"
                    [value]="option.id"
                    [checked]="selectedOptionId === option.id"
                    class="h-5 w-5 shrink-0 accent-cyan-600 dark:accent-cyan-300"
                    (change)="selectOption(option.id)"
                  >
                  <span>{{ option.label }}</span>
                </label>
              }
            </fieldset>

            @if (readOnly) {
              <p class="mt-5 border border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400" role="status">
                Production preview only. Voting is disabled.
              </p>
            } @else if (currentUser) {
              <div class="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  class="min-h-11 flex-1 border border-cyan-600 bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 dark:border-cyan-300 dark:bg-cyan-300 dark:text-zinc-950 dark:hover:bg-cyan-200 dark:disabled:border-zinc-700 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                  [disabled]="!selectedOptionId || submitting || selectedOptionId === persistedOptionId"
                >
                  {{ submitting ? 'Saving vote…' : persistedOptionId ? 'Update vote' : 'Submit vote' }}
                </button>
                @if (results?.resultsVisible) {
                  <button type="button" class="min-h-11 border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-cyan-600 hover:text-cyan-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-cyan-300 dark:hover:text-cyan-100" (click)="revealResults()">
                    Show results
                  </button>
                }
              </div>
            } @else {
              <a
                routerLink="/login"
                [queryParams]="{redirectUrl: postPath}"
                class="mt-5 inline-flex min-h-11 w-full items-center justify-center border border-cyan-600 bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 dark:border-cyan-300 dark:bg-cyan-300 dark:text-zinc-950 dark:hover:bg-cyan-200"
              >
                Sign in to vote
              </a>
            }
          </form>

          @if (statusMessage) {
            <p class="mt-4 border border-emerald-500/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100" role="status">
              {{ statusMessage }}
            </p>
          }
        }

        @if (errorMessage) {
          <p class="mt-4 border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-900 dark:bg-red-950/25 dark:text-red-100" role="alert">
            {{ errorMessage }}
          </p>
        }
      </section>
    }
  `,
})
export class BlogPollComponent implements OnChanges {
  @Input({required: true}) block!: BlogContentBlock;
  @Input({required: true}) postId = '';
  @Input({required: true}) postSlug = '';
  @Input() compact = false;
  @Input() readOnly = false;

  protected currentUser: User | null = null;
  protected selectedOptionId: string | null = null;
  protected persistedOptionId: string | null = null;
  protected results: BlogPollResults | null = null;
  protected showResults = false;
  protected loadingResults = false;
  protected submitting = false;
  protected statusMessage = '';
  protected errorMessage = '';

  private readonly authService = inject(AuthService);
  private readonly pollService = inject(BlogPollService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private loadKey = '';

  constructor() {
    this.authService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => {
        this.currentUser = user;
        this.loadKey = '';
        void this.loadResultsIfNeeded();
        this.cdr.markForCheck();
      });
  }

  ngOnChanges(): void {
    this.loadKey = '';
    void this.loadResultsIfNeeded();
  }

  protected get isRenderable(): boolean {
    return !!this.block?.data.question?.trim() && this.pollOptions.length >= 2;
  }

  protected get pollOptions(): readonly BlogPollOption[] {
    return (this.block?.data.pollOptions ?? []).filter(option => option.id.trim() && option.label.trim());
  }

  protected get headingId(): string {
    return `blog-poll-${this.block.id}`;
  }

  protected get inputName(): string {
    return `poll-${this.block.id}`;
  }

  protected get postPath(): string {
    return this.postSlug ? `/blog/${this.postSlug}` : '/blog';
  }

  protected selectOption(optionId: string): void {
    this.selectedOptionId = optionId;
    this.statusMessage = '';
    this.errorMessage = '';
  }

  protected optionClass(optionId: string): string {
    const baseClass = 'flex min-h-14 cursor-pointer items-center gap-4 border px-4 py-3 text-base leading-6 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cyan-600 dark:focus-within:outline-cyan-300';
    return this.selectedOptionId === optionId
      ? `${baseClass} border-cyan-600 bg-cyan-50 text-cyan-950 dark:border-cyan-300 dark:bg-cyan-950 dark:text-cyan-50`
      : `${baseClass} border-slate-300 text-slate-900 dark:border-zinc-700 dark:text-zinc-100`;
  }

  protected hideResults(): void {
    this.showResults = false;
  }

  protected revealResults(): void {
    this.showResults = true;
  }

  protected async submitVote(event: Event): Promise<void> {
    event.preventDefault();

    if (this.readOnly || !this.currentUser || !this.selectedOptionId || this.submitting) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.statusMessage = '';

    try {
      const results = await this.pollService.submitVote({
        postId: this.postId,
        postSlug: this.postSlug,
        pollId: this.block.id,
        optionId: this.selectedOptionId,
      });
      this.results = results;
      this.persistedOptionId = results.selectedOptionId;
      this.selectedOptionId = results.selectedOptionId;
      this.showResults = results.resultsVisible;
      this.statusMessage = results.resultsVisible
        ? 'Vote recorded.'
        : 'Vote recorded. Results are private for this poll.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Unable to save your vote. Please try again.';
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }

  protected formatPercent(percent: number): string {
    return `${new Intl.NumberFormat('en-US', {maximumFractionDigits: 1}).format(percent)}%`;
  }

  protected formatVoteCount(count: number): string {
    return `${new Intl.NumberFormat('en-US').format(count)} ${count === 1 ? 'vote' : 'votes'}`;
  }

  protected formatResponseCount(count: number): string {
    return `${new Intl.NumberFormat('en-US').format(count)} ${count === 1 ? 'response' : 'responses'}`;
  }

  private async loadResultsIfNeeded(): Promise<void> {
    if (this.readOnly || !this.block || !this.postId || !this.postSlug) {
      return;
    }

    const visibility = this.block.data.pollResultsVisibility ?? 'afterVote';
    if (visibility !== 'always' && !this.currentUser) {
      return;
    }

    const key = `${this.postId}:${this.block.id}:${this.currentUser?.uid ?? 'anonymous'}`;
    if (this.loadKey === key) {
      return;
    }

    this.loadKey = key;
    this.loadingResults = true;
    this.errorMessage = '';

    try {
      const results = await this.pollService.getResults({
        postId: this.postId,
        postSlug: this.postSlug,
        pollId: this.block.id,
      });
      this.results = results;
      this.selectedOptionId = results.selectedOptionId;
      this.persistedOptionId = results.selectedOptionId;
      this.showResults = results.resultsVisible;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Unable to load poll results.';
    } finally {
      this.loadingResults = false;
      this.cdr.markForCheck();
    }
  }
}
