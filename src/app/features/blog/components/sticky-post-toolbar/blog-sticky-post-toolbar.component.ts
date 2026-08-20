import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';

import {BlogShareEvent} from '../../services/blog-engagement.service';
import {BlogShareActionsComponent} from '../share-actions/blog-share-actions.component';

@Component({
  selector: 'app-blog-sticky-post-toolbar',
  imports: [BlogShareActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sticky z-40 -mx-2 block min-w-0 w-[calc(100%+1rem)] max-w-none self-start sm:mx-0 sm:w-auto sm:max-w-full',
  },
  template: `
    <nav
      aria-label="Post reading shortcuts"
      class="relative h-full rounded-none border border-slate-200/90 bg-white/95 shadow-lg shadow-slate-950/10 backdrop-blur-xl dark:border-zinc-700/90 dark:bg-neutral-950/95 dark:shadow-black/30 sm:rounded"
    >
      <div
        class="grid h-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 px-2 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-3">
        <img
          [src]="imageUrl"
          alt=""
          aria-hidden="true"
          class="h-8 w-10 shrink-0 rounded border border-slate-200 bg-slate-100 object-cover dark:border-zinc-700 dark:bg-zinc-900 sm:h-11 sm:w-16"
          decoding="async"
          width="64"
          height="44"
        >

        <div class="min-w-0">
          <p
            class="truncate text-xs font-semibold leading-5 text-slate-950 dark:text-zinc-100 sm:text-sm"
            [title]="title"
          >
            {{ title }}
          </p>
          <span
            class="block text-[0.625rem] font-semibold uppercase leading-3 tracking-[0.14em] text-cyan-700 dark:text-cyan-300"
            aria-hidden="true"
          >
            {{ readingProgress }}% read
          </span>
        </div>

        <div class="flex min-w-0 shrink-0 items-center justify-end gap-1">
          <app-blog-share-actions
            [title]="shareTitle || title"
            [excerpt]="excerpt"
            [path]="sharePath"
            [url]="shareUrl"
            [trackingEnabled]="trackingEnabled"
            utmCampaign="reader_share"
            [utmContent]="shareUtmContent"
            variant="toolbar"
            label="Share"
            groupLabel="Share this post"
            linkLabel="post"
            (shared)="shared.emit($event)"
          ></app-blog-share-actions>

          @if (showLibraryControls) {
            <span class="ml-1 flex items-center gap-1 border-l border-slate-200 pl-1 dark:border-zinc-700" aria-label="Personal article lists">
              <button
                type="button"
                class="article-library-toggle inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:border-rose-500 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-white disabled:cursor-wait disabled:opacity-70 dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-rose-300 dark:hover:bg-transparent dark:hover:text-rose-200 dark:focus:ring-cyan-300 dark:focus:ring-offset-zinc-900"
                [attr.aria-label]="favorite ? 'Remove from favorites' : 'Add to favorites'"
                [attr.aria-pressed]="favorite"
                [attr.title]="favorite ? 'Favorited' : 'Favorite'"
                [disabled]="libraryBusy"
                (click)="favoriteToggled.emit()"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" [attr.fill]="favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"></path>
                </svg>
              </button>
              <button
                type="button"
                class="article-library-toggle inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:border-amber-500 hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-white disabled:cursor-wait disabled:opacity-70 dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-amber-300 dark:hover:bg-transparent dark:hover:text-amber-200 dark:focus:ring-cyan-300 dark:focus:ring-offset-zinc-900"
                [attr.aria-label]="readLater ? 'Remove from read later' : 'Add to read later'"
                [attr.aria-pressed]="readLater"
                [attr.title]="readLater ? 'Saved for later' : 'Read later'"
                [disabled]="libraryBusy"
                (click)="readLaterToggled.emit()"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" [attr.fill]="readLater ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21L12 17.5 6.5 21V4.5Z"></path>
                </svg>
              </button>
            </span>
          }

          @if (showOfflineControl) {
            <span class="ml-1 border-l border-slate-200 pl-1 dark:border-zinc-700">
              <button
                type="button"
                class="offline-toggle inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:border-cyan-600 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-white disabled:cursor-wait disabled:opacity-70 dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-cyan-300 dark:hover:bg-transparent dark:hover:text-cyan-200 dark:focus:ring-cyan-300 dark:focus:ring-offset-zinc-900"
                [attr.aria-label]="offlineUpdateAvailable ? 'Update offline copy' : (offlineSaved ? 'Remove offline copy' : 'Save post for offline reading')"
                [attr.aria-pressed]="offlineSaved"
                [attr.title]="offlineUpdateAvailable ? 'Update saved copy' : (offlineSaved ? 'Saved offline' : 'Save offline')"
                [disabled]="offlineBusy"
                (click)="offlineToggled.emit()"
              >
                @if (offlineBusy) {
                  <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M20 12a8 8 0 1 1-5.5-7.6"></path>
                  </svg>
                } @else if (offlineUpdateAvailable) {
                  <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 7v5h-5M4 17v-5h5"></path>
                    <path d="M18.2 9A7 7 0 0 0 6.7 6.2L4 9M5.8 15A7 7 0 0 0 17.3 17.8L20 15"></path>
                  </svg>
                } @else {
                  <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3v11m0 0 5-5m-5 5L7 9M5 19h14"></path>
                  </svg>
                }
              </button>
            </span>
          }

          @if (showComments) {
            <span class="ml-1 border-l border-slate-200 pl-1 dark:border-zinc-700">
              <a
                [href]="commentsHref"
                class="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:border-cyan-600 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-white dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-cyan-300 dark:hover:bg-transparent dark:hover:text-cyan-200 dark:focus:ring-cyan-300 dark:focus:ring-offset-zinc-900"
                aria-label="Jump to comments"
                title="Jump to comments"
                (click)="jumpToComments($event)"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M7 18.2 3.8 20l.8-3.7A8 8 0 1 1 7 18.2Z"></path>
                  <path d="M8.5 10h7M8.5 13.5h4.5"></path>
                </svg>
              </a>
            </span>
          }

          @if (showScrollTop()) {
            <span class="ml-1 border-l border-slate-200 pl-1 dark:border-zinc-700">
              <button
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:border-cyan-600 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-white dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-cyan-300 dark:hover:bg-transparent dark:hover:text-cyan-200 dark:focus:ring-cyan-300 dark:focus:ring-offset-zinc-900"
                aria-label="Scroll to top of post"
                title="Scroll to top"
                (click)="scrollToPostTop()"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="m6.5 11.5 5.5-5 5.5 5"></path>
                  <path d="M12 6.5V18"></path>
                </svg>
              </button>
            </span>
          }
        </div>
      </div>

      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-slate-200/80 dark:bg-zinc-800"
        role="progressbar"
        aria-label="Article reading progress"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-valuenow]="readingProgress"
        data-reading-progress
      >
        <div
          class="h-full bg-cyan-600 transition-[width] duration-150 motion-reduce:transition-none dark:bg-cyan-300"
          [style.width.%]="readingProgress"
        ></div>
      </div>
    </nav>
  `,
  styles: `
    :host {
      height: var(--blog-sticky-toolbar-height);
      top: calc(var(--site-header-sticky-height) + env(safe-area-inset-top));
    }

    .offline-toggle[aria-pressed='true'] {
      background: rgb(207 250 254);
      border-color: rgb(8 145 178);
      color: rgb(21 94 117);
    }

    :host-context(.dark) .offline-toggle[aria-pressed='true'] {
      background: rgb(24 24 27);
      border-color: rgb(103 232 249 / 0.7);
      color: rgb(165 243 252);
    }

    .article-library-toggle[aria-pressed='true'] {
      background: rgb(236 254 255);
      border-color: rgb(8 145 178);
      color: rgb(21 94 117);
    }

    :host-context(.dark) .article-library-toggle[aria-pressed='true'] {
      background: rgb(24 24 27);
      border-color: rgb(103 232 249 / 0.7);
      color: rgb(165 243 252);
    }
  `,
})
export class BlogStickyPostToolbarComponent implements AfterViewInit, OnDestroy {
  @Input({required: true}) title = '';
  @Input({required: true}) imageUrl = '';
  @Input({required: true}) sharePath = '';
  @Input() shareTitle = '';
  @Input() excerpt = '';
  @Input() shareUrl = '';
  @Input() shareUtmContent = '';
  @Input() trackingEnabled = false;
  @Input() showComments = true;
  @Input() showLibraryControls = false;
  @Input() favorite = false;
  @Input() readLater = false;
  @Input() libraryBusy = false;
  @Input() showOfflineControl = false;
  @Input() offlineSaved = false;
  @Input() offlineBusy = false;
  @Input() offlineUpdateAvailable = false;
  @Input() readingProgress = 0;
  @Input() commentsTargetId = 'blog-comments';
  @Input() scrollTopTargetId = 'blog-post-top';
  @Output() shared = new EventEmitter<BlogShareEvent>();
  @Output() favoriteToggled = new EventEmitter<void>();
  @Output() readLaterToggled = new EventEmitter<void>();
  @Output() offlineToggled = new EventEmitter<void>();

  protected readonly showScrollTop = signal(false);

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private scrollTopObserver: IntersectionObserver | undefined;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = this.document.getElementById(this.scrollTopTargetId);
    const Observer = this.document.defaultView?.IntersectionObserver;

    if (!target) {
      return;
    }

    if (!Observer) {
      this.showScrollTop.set(true);
      return;
    }

    this.scrollTopObserver = new Observer(entries => {
      const [entry] = entries;

      if (entry) {
        this.showScrollTop.set(!entry.isIntersecting);
      }
    }, {
      rootMargin: '-64px 0px 0px',
      threshold: 0,
    });
    this.scrollTopObserver.observe(target);
  }

  ngOnDestroy(): void {
    this.scrollTopObserver?.disconnect();
  }

  protected get commentsHref(): string {
    return `#${this.commentsTargetId}`;
  }

  protected jumpToComments(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = this.document.getElementById(this.commentsTargetId);

    if (!target) {
      return;
    }

    event.preventDefault();
    this.document.defaultView?.history.pushState(null, '', this.commentsHref);
    const reduceMotion = this.document.documentElement.classList.contains('reader-motion-reduce')
      || this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;

    target.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'});
    target.focus({preventScroll: true});
  }

  protected scrollToPostTop(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = this.document.getElementById(this.scrollTopTargetId);
    const reduceMotion = this.document.documentElement.classList.contains('reader-motion-reduce')
      || this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!target) {
      this.document.defaultView?.scrollTo({top: 0, behavior: reduceMotion ? 'auto' : 'smooth'});
      return;
    }

    target.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'});
    target.focus({preventScroll: true});
  }
}
