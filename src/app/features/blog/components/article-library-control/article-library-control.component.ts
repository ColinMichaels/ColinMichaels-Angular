import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogArticleLibraryRecord, BlogArticleLibraryService} from '../../services/blog-article-library.service';

@Component({
  selector: 'app-article-library-control',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (library.records(); as records) {
      @if (records.length > 0 || surface === 'profile') {
        <section
          class="border-slate-200 px-1 pt-2 dark:border-zinc-800"
          [class.border-t]="surface === 'menu'"
          aria-labelledby="article-library-title"
        >
          <div class="flex items-center justify-between gap-3 px-2 pb-1.5">
            <h2 id="article-library-title" class="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">
              Your reading
            </h2>
            <span class="text-[0.68rem] font-semibold text-cyan-700 dark:text-cyan-300">
              {{ library.completed().length }} read · {{ library.inProgress().length }} in progress
            </span>
          </div>

          <div class="grid gap-1">
            @for (record of records; track record.post.slug) {
              <article class="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <a
                    [routerLink]="['/', pathNames.BLOG, record.post.slug]"
                    class="min-w-0 py-0.5"
                    (click)="navigate.emit()"
                  >
                    <span class="block truncate text-xs font-semibold text-slate-800 hover:text-cyan-800 dark:text-zinc-200 dark:hover:text-cyan-200">
                      {{ record.post.title }}
                    </span>
                    <span class="mt-1 block text-[0.68rem] font-medium text-slate-500 dark:text-zinc-500">
                      {{ readingLabel(record) }}
                    </span>
                  </a>

                  <div class="flex items-center gap-1" aria-label="Article list choices">
                    <button
                      type="button"
                      class="library-list-toggle inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition hover:bg-white hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-rose-300"
                      [class.is-active]="record.favorite"
                      [attr.aria-label]="record.favorite ? 'Remove ' + record.post.title + ' from favorites' : 'Add ' + record.post.title + ' to favorites'"
                      [attr.aria-pressed]="record.favorite"
                      [disabled]="isBusy(record.post.slug, 'favorite')"
                      (click)="toggleFavorite(record)"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" [attr.fill]="record.favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="library-list-toggle inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition hover:bg-white hover:text-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-amber-300"
                      [class.is-active]="record.readLater"
                      [attr.aria-label]="record.readLater ? 'Remove ' + record.post.title + ' from read later' : 'Add ' + record.post.title + ' to read later'"
                      [attr.aria-pressed]="record.readLater"
                      [disabled]="isBusy(record.post.slug, 'read-later')"
                      (click)="toggleReadLater(record)"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" [attr.fill]="record.readLater ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21L12 17.5 6.5 21V4.5Z"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                @if (record.progressPercent > 0) {
                  <div
                    class="mt-2 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800"
                    role="progressbar"
                    [attr.aria-label]="record.post.title + ' reading progress'"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    [attr.aria-valuenow]="record.progressPercent"
                  >
                    <div class="h-full rounded-full bg-cyan-600 dark:bg-cyan-300" [style.width.%]="record.progressPercent"></div>
                  </div>
                }
              </article>
            } @empty {
              <p class="rounded-lg border border-dashed border-zinc-700 px-3 py-4 text-xs leading-5 text-zinc-400">
                Articles you favorite, save for later, or start reading will appear here on this device.
              </p>
            }
          </div>

          @if (statusMessage()) {
            <p class="px-2 pb-1 pt-1 text-[0.7rem] leading-4 text-slate-600 dark:text-zinc-400" role="status" aria-live="polite">
              {{ statusMessage() }}
            </p>
          }
        </section>
      }
    }
  `,
  styles: `
    .library-list-toggle.is-active {
      color: rgb(14 116 144);
    }

    :host-context(.dark) .library-list-toggle.is-active {
      color: rgb(165 243 252);
    }
  `,
})
export class ArticleLibraryControlComponent {
  @Input() surface: 'menu' | 'profile' = 'menu';
  @Output() navigate = new EventEmitter<void>();

  protected readonly library = inject(BlogArticleLibraryService);
  protected readonly pathNames = PATH_NAMES;
  protected readonly busyAction = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);

  protected readingLabel(record: BlogArticleLibraryRecord): string {
    if (record.completedAt) {
      return 'Read';
    }

    if (record.progressPercent > 0) {
      return `${record.progressPercent}% read`;
    }

    if (record.readLater) {
      return 'Saved for later';
    }

    return 'Saved article';
  }

  protected isBusy(slug: string, action: 'favorite' | 'read-later'): boolean {
    return this.busyAction() === `${slug}:${action}`;
  }

  protected async toggleFavorite(record: BlogArticleLibraryRecord): Promise<void> {
    await this.updateListChoice(record, 'favorite');
  }

  protected async toggleReadLater(record: BlogArticleLibraryRecord): Promise<void> {
    await this.updateListChoice(record, 'read-later');
  }

  private async updateListChoice(
    record: BlogArticleLibraryRecord,
    action: 'favorite' | 'read-later'
  ): Promise<void> {
    if (this.busyAction()) {
      return;
    }

    this.busyAction.set(`${record.post.slug}:${action}`);
    this.statusMessage.set(null);

    try {
      if (action === 'favorite') {
        await this.library.setFavorite(record.post, !record.favorite);
        this.statusMessage.set(record.favorite ? 'Removed from favorites.' : 'Added to favorites.');
      } else {
        await this.library.setReadLater(record.post, !record.readLater);
        this.statusMessage.set(record.readLater ? 'Removed from read later.' : 'Added to read later.');
      }
    } catch {
      this.statusMessage.set('Your reading list could not be updated.');
    } finally {
      this.busyAction.set(null);
    }
  }
}
