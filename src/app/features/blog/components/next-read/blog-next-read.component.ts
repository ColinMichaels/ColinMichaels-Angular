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
        class="overflow-hidden rounded-2xl border border-cyan-700/25 bg-cyan-50/70 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/[0.06]"
        [class.mt-10]="!compact"
        [class.blog-next-read--compact]="compact"
        aria-labelledby="blog-next-read-heading"
        data-testid="blog-next-read"
      >
        <a
          [routerLink]="['/', pathNames.BLOG, post.slug]"
          class="blog-next-read__link group grid gap-5 p-5 transition-colors hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600 dark:hover:bg-cyan-300/[0.08] sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:p-6"
          (click)="trackSelection()"
        >
          <img
            [src]="post.coverImage"
            [alt]="post.title + ' preview image'"
            class="blog-next-read__media aspect-video h-full max-h-28 w-full rounded-xl object-cover sm:aspect-square"
            width="320"
            height="180"
            loading="lazy"
            decoding="async"
          >
          <span class="min-w-0">
            <span class="eyebrow-sm eyebrow-cyan">Continue this thread</span>
            <span id="blog-next-read-heading" class="blog-next-read__title mt-2 block text-xl font-semibold leading-snug text-slate-950 group-hover:text-cyan-900 dark:text-zinc-50 dark:group-hover:text-cyan-100">
              {{ post.title }}
            </span>
            <span class="blog-next-read__excerpt mt-2 line-clamp-2 block text-sm leading-6 text-slate-600 dark:text-zinc-400">
              {{ post.excerpt }}
            </span>
            <span class="blog-next-read__cta mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-cyan-800 dark:text-cyan-200">
              Read the related story <span aria-hidden="true" class="ml-1">→</span>
            </span>
          </span>
        </a>
      </aside>
    }
  `,
  styles: [`
    .blog-next-read--compact {
      border-radius: var(--site-radius-surface, 0.75rem);
    }

    .blog-next-read--compact .blog-next-read__link {
      grid-template-columns: minmax(5rem, 0.4fr) minmax(0, 1fr);
      align-items: start;
      gap: 0.9rem;
      padding: 1rem;
    }

    .blog-next-read--compact .blog-next-read__media {
      aspect-ratio: 1;
      max-height: none;
      border-radius: 0.6rem;
    }

    .blog-next-read--compact .blog-next-read__title {
      margin-top: 0.3rem;
      font-size: 1.05rem;
      line-height: 1.28;
    }

    .blog-next-read--compact .blog-next-read__excerpt {
      margin-top: 0.45rem;
      line-height: 1.45;
    }

    .blog-next-read--compact .blog-next-read__cta {
      min-height: 2rem;
      margin-top: 0.55rem;
    }
  `],
})
export class BlogNextReadComponent {
  @Input({required: true}) post: BlogPostSummary | null = null;
  @Input() compact = false;

  protected readonly pathNames = PATH_NAMES;
  private readonly analytics = inject(SiteAnalyticsService);

  protected trackSelection(): void {
    if (this.post) {
      this.analytics.trackContentSelection(this.post, 'related_reading');
    }
  }
}
