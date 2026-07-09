import {DOCUMENT, isPlatformBrowser, NgClass} from '@angular/common';
import {ChangeDetectionStrategy, Component, Input, PLATFORM_ID, inject} from '@angular/core';

import {BlogTableOfContentsItem} from '../../utils/blog-reading.util';

@Component({
  selector: 'app-blog-table-of-contents',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block mb-10 xl:sticky xl:top-6 xl:mb-0 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto',
  },
  template: `
    <nav
      aria-labelledby="table-of-contents-heading"
      class="rounded border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-950/10 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:shadow-black/20"
    >
      <h2
        id="table-of-contents-heading"
        class="border-b border-slate-200 pb-3 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:border-zinc-800 dark:text-cyan-300"
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
})
export class BlogTableOfContentsComponent {
  @Input() items: readonly BlogTableOfContentsItem[] = [];
  @Input() postPath = '';
  @Input() activeHeadingId: string | null = null;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly activeLinkClass = 'border-cyan-600 bg-cyan-50 text-cyan-800 font-medium dark:border-cyan-300 dark:bg-cyan-300/10 dark:text-cyan-100';
  protected readonly inactiveLinkClass = 'border-slate-200 dark:border-zinc-800';

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
    this.document.defaultView?.history.pushState(null, '', this.createAnchorHref(headingId));
    target.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
}
