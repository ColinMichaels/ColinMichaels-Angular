import {DOCUMENT, isPlatformBrowser, NgClass} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  inject,
} from '@angular/core';

import {BlogTableOfContentsItem} from '../../utils/blog-reading.util';

@Component({
  selector: 'app-blog-table-of-contents',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block xl:sticky',
  },
  template: `
    <nav
      data-toc-scroller
      aria-labelledby="table-of-contents-heading"
      class="contents-scroller rounded border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-950/10 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:shadow-black/20"
    >
      <h2
        id="table-of-contents-heading"
        class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 pb-3 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-cyan-300"
      >
        Contents
      </h2>
      <ol class="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-zinc-400">
        @for (item of items; track item.id) {
          <li [class.pl-4]="item.level === 3">
            <a
              [href]="createAnchorHref(item.id)"
              [attr.aria-current]="item.id === activeHeadingId ? 'location' : null"
              class="block border-l-2 px-3 py-1.5 transition-colors hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-800 dark:hover:border-cyan-300/60 dark:hover:bg-zinc-800/40 dark:hover:text-cyan-200"
              [ngClass]="item.id === activeHeadingId ? activeLinkClass : inactiveLinkClass"
              (click)="scrollToHeading($event, item.id)"
            >
              {{ item.text }}
            </a>
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    @media (min-width: 1280px) {
      :host {
        top: calc(var(--site-header-sticky-height) + 1rem);
      }

      .contents-scroller {
        max-height: calc(100dvh - var(--site-header-sticky-height) - 2rem);
        overflow-y: auto;
        scrollbar-gutter: stable;
      }
    }
  `,
})
export class BlogTableOfContentsComponent implements OnDestroy {
  @Input() items: readonly BlogTableOfContentsItem[] = [];
  @Input() postPath = '';
  @Output() headingSelected = new EventEmitter<string>();

  @Input()
  set activeHeadingId(value: string | null) {
    this.currentActiveHeadingId = value;
    this.queueActiveLinkIntoView();
  }

  get activeHeadingId(): string | null {
    return this.currentActiveHeadingId;
  }

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private currentActiveHeadingId: string | null = null;
  private activeLinkFrame: number | undefined;
  private headingScrollFrame: number | undefined;
  protected readonly activeLinkClass = 'border-cyan-600 bg-cyan-50 text-cyan-800 font-medium dark:border-cyan-300 dark:bg-cyan-300/10 dark:text-cyan-100';
  protected readonly inactiveLinkClass = 'border-slate-200 dark:border-zinc-800';

  ngOnDestroy(): void {
    const view = this.document.defaultView;

    if (view && this.activeLinkFrame !== undefined) {
      view.cancelAnimationFrame(this.activeLinkFrame);
    }

    if (view && this.headingScrollFrame !== undefined) {
      view.cancelAnimationFrame(this.headingScrollFrame);
    }
  }

  protected createAnchorHref(headingId: string): string {
    const normalizedPath = this.postPath.trim().replace(/\/+$/, '');

    return normalizedPath ? `${normalizedPath}#${headingId}` : `#${headingId}`;
  }

  protected scrollToHeading(event: MouseEvent, headingId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = this.document.getElementById(headingId);

    if (!target) {
      return;
    }

    event.preventDefault();
    const view = this.document.defaultView;

    if (!view) {
      return;
    }

    view.history.pushState(null, '', this.createAnchorHref(headingId));
    this.headingSelected.emit(headingId);

    if (this.headingScrollFrame !== undefined) {
      view.cancelAnimationFrame(this.headingScrollFrame);
    }

    this.headingScrollFrame = view.requestAnimationFrame(() => {
      this.headingScrollFrame = view.requestAnimationFrame(() => {
        this.headingScrollFrame = undefined;
        const reduceMotion = this.document.documentElement.classList.contains('reader-motion-reduce')
          || view.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const scrollMarginTop = Number.parseFloat(view.getComputedStyle(target).scrollMarginTop) || 0;
        const targetTop = Math.max(0, this.getDocumentTop(target, view) - scrollMarginTop);

        view.scrollTo({top: targetTop, behavior: reduceMotion ? 'auto' : 'smooth'});
      });
    });
  }

  private getDocumentTop(target: HTMLElement, view: Window): number {
    const inlinePosition = target.style.position;

    try {
      target.style.position = 'static';
      return target.getBoundingClientRect().top + view.scrollY;
    } finally {
      target.style.position = inlinePosition;
    }
  }

  private queueActiveLinkIntoView(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const view = this.document.defaultView;

    if (!view) {
      return;
    }

    if (this.activeLinkFrame !== undefined) {
      view.cancelAnimationFrame(this.activeLinkFrame);
    }

    this.activeLinkFrame = view.requestAnimationFrame(() => {
      this.activeLinkFrame = undefined;
      this.keepActiveLinkVisible();
    });
  }

  private keepActiveLinkVisible(): void {
    const scroller = this.host.nativeElement.querySelector<HTMLElement>('[data-toc-scroller]');
    const activeLink = scroller?.querySelector<HTMLElement>('[aria-current="location"]');

    if (!scroller || !activeLink || scroller.scrollHeight <= scroller.clientHeight) {
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const activeLinkRect = activeLink.getBoundingClientRect();
    const centeredTop = scroller.scrollTop
      + activeLinkRect.top
      - scrollerRect.top
      - ((scroller.clientHeight - activeLinkRect.height) / 2);
    const reduceMotion = this.document.documentElement.classList.contains('reader-motion-reduce')
      || this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;

    scroller.scrollTo({
      top: Math.max(0, centeredTop),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }
}
