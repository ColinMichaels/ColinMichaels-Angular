import {ChangeDetectionStrategy, Component, Input, inject} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {BlogPostSummary} from '../../models/blog-post.model';

@Component({
  selector: 'app-blog-next-read',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
  template: `
    @if (post) {
      <aside
        class="mt-10 overflow-hidden rounded-2xl border border-cyan-700/25 bg-cyan-50/70 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/[0.06]"
        aria-labelledby="blog-next-read-heading"
        data-testid="blog-next-read"
      >
        <a
          [routerLink]="['/', pathNames.BLOG, post.slug]"
          class="group grid gap-5 p-5 transition-colors hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600 dark:hover:bg-cyan-300/[0.08] sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:p-6"
          (click)="trackSelection()"
        >
          <img
            [src]="post.coverImage"
            [alt]="post.title + ' preview image'"
            class="aspect-video h-full max-h-28 w-full rounded-xl object-cover sm:aspect-square"
            width="320"
            height="180"
            loading="lazy"
            decoding="async"
          >
          <span class="min-w-0">
            <span class="eyebrow-sm eyebrow-cyan">Continue this thread</span>
            <span id="blog-next-read-heading" class="mt-2 block text-xl font-semibold leading-snug text-slate-950 group-hover:text-cyan-900 dark:text-zinc-50 dark:group-hover:text-cyan-100">
              {{ post.title }}
            </span>
            <span class="mt-2 line-clamp-2 block text-sm leading-6 text-slate-600 dark:text-zinc-400">
              {{ post.excerpt }}
            </span>
            <span class="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-cyan-800 dark:text-cyan-200">
              Read the related story <span aria-hidden="true" class="ml-1">→</span>
            </span>
          </span>
        </a>
      </aside>
    }
  `,
})
export class BlogNextReadComponent {
  @Input({required: true}) post: BlogPostSummary | null = null;

  protected readonly pathNames = PATH_NAMES;
  private readonly analytics = inject(SiteAnalyticsService);

  protected trackSelection(): void {
    if (this.post) {
      this.analytics.trackContentSelection(this.post, 'related_reading');
    }
  }
}
