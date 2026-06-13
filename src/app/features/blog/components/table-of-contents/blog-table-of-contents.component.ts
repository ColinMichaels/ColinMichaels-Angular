import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {ChangeDetectionStrategy, Component, Input, PLATFORM_ID, inject} from '@angular/core';

import {BlogTableOfContentsItem} from '../../utils/blog-reading.util';

@Component({
  selector: 'app-blog-table-of-contents',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class: 'block mb-10 xl:sticky xl:top-6 xl:mb-0 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto',
  },
  template: `
    <nav
      aria-labelledby="table-of-contents-heading"
      class="rounded border border-zinc-800/80 bg-zinc-900/80 p-4 shadow-2xl shadow-black/20 backdrop-blur"
    >
      <h2
        id="table-of-contents-heading"
        class="border-b border-zinc-800 pb-3 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300"
      >
        Contents
      </h2>
      <ol class="mt-4 space-y-1.5 text-sm text-zinc-400">
        @for (item of items; track item.id) {
          <li [class.pl-4]="item.level === 3">
            <a
              [href]="createAnchorHref(item.id)"
              [attr.aria-current]="item.id === activeHeadingId ? 'location' : null"
              class="block border-l-2 px-3 py-1.5 transition-colors hover:border-cyan-300/60 hover:bg-zinc-800/40 hover:text-cyan-200"
              [class.border-cyan-300]="item.id === activeHeadingId"
              [class.border-zinc-800]="item.id !== activeHeadingId"
              [class.bg-cyan-300/10]="item.id === activeHeadingId"
            [class.text-cyan-100]="item.id === activeHeadingId"
            [class.font-medium]="item.id === activeHeadingId"
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
