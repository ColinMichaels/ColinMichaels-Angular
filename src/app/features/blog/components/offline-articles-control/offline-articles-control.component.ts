import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {OfflineBlogPostService} from '../../services/offline-blog-post.service';

@Component({
  selector: 'app-offline-articles-control',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (offlinePosts.records(); as records) {
      @if (records.length > 0 || surface === 'profile') {
        <section
          class="border-slate-200 px-1 pt-2 dark:border-zinc-800"
          [class.border-t]="surface === 'menu'"
          aria-labelledby="offline-articles-title"
        >
          <div class="flex items-center justify-between gap-3 px-2 pb-1.5">
            <h2 id="offline-articles-title" class="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">
              Saved offline
            </h2>
            <span class="text-[0.68rem] font-semibold text-cyan-700 dark:text-cyan-300">
              {{ records.length }} {{ records.length === 1 ? 'article' : 'articles' }}
            </span>
          </div>

          <div class="grid gap-1">
            @for (record of records; track record.post.id) {
              <div class="grid min-h-11 grid-cols-[minmax(0,1fr)_2.75rem] items-stretch rounded-lg border border-transparent transition hover:border-cyan-200 hover:bg-cyan-50 dark:hover:border-cyan-300/30 dark:hover:bg-zinc-900">
                <a
                  [routerLink]="['/', pathNames.BLOG, record.post.slug]"
                  class="min-w-0 px-2 py-2"
                  (click)="navigate.emit()"
                >
                  <span class="block truncate text-xs font-semibold text-slate-800 dark:text-zinc-200">{{ record.post.title }}</span>
                  <span class="mt-0.5 block text-[0.68rem] text-slate-500 dark:text-zinc-500">Available without a connection</span>
                </a>
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-r-lg text-slate-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:cursor-wait disabled:opacity-60 dark:text-zinc-500 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  [attr.aria-label]="'Remove ' + record.post.title + ' from offline reading'"
                  [disabled]="busySlug() === record.post.slug"
                  (click)="remove(record.post.slug)"
                >
                  @if (busySlug() === record.post.slug) {
                    <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <path d="M20 12a8 8 0 1 1-5.5-7.6"></path>
                    </svg>
                  } @else {
                    <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"></path>
                    </svg>
                  }
                </button>
              </div>
            } @empty {
              <p class="rounded-lg border border-dashed border-zinc-700 px-3 py-4 text-xs leading-5 text-zinc-400">
                No articles are downloaded for offline reading on this device.
              </p>
            }
          </div>

          @if (records.length > 1) {
            <button
              type="button"
              class="mt-1 min-h-10 w-full rounded-lg px-2 text-left text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:cursor-wait disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
              [disabled]="clearing()"
              (click)="clearAll()"
            >
              {{ clearing() ? 'Clearing saved articles…' : 'Clear all saved articles' }}
            </button>
          }

          @if (statusMessage()) {
            <p class="px-2 pb-1 pt-1 text-[0.7rem] leading-4 text-slate-600 dark:text-zinc-400" role="status" aria-live="polite">
              {{ statusMessage() }}
            </p>
          }
        </section>
      }
    }
  `,
})
export class OfflineArticlesControlComponent {
  @Input() surface: 'menu' | 'profile' = 'menu';
  @Output() navigate = new EventEmitter<void>();

  protected readonly offlinePosts = inject(OfflineBlogPostService);
  protected readonly pathNames = PATH_NAMES;
  protected readonly busySlug = signal<string | null>(null);
  protected readonly clearing = signal(false);
  protected readonly statusMessage = signal<string | null>(null);

  protected async remove(slug: string): Promise<void> {
    if (this.busySlug() || this.clearing()) {
      return;
    }

    this.busySlug.set(slug);
    this.statusMessage.set(null);

    try {
      await this.offlinePosts.remove(slug);
      this.statusMessage.set('Offline article removed.');
    } catch {
      this.statusMessage.set('The offline article could not be removed.');
    } finally {
      this.busySlug.set(null);
    }
  }

  protected async clearAll(): Promise<void> {
    if (this.clearing() || this.busySlug()) {
      return;
    }

    this.clearing.set(true);
    this.statusMessage.set(null);

    try {
      await this.offlinePosts.clearAll();
    } catch {
      this.statusMessage.set('Saved articles could not be cleared.');
    } finally {
      this.clearing.set(false);
    }
  }
}
