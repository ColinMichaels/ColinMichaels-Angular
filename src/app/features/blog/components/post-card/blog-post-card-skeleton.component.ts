import {Component, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'app-blog-post-card-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="blog-post-row"
             aria-hidden="true">
      <div class="blog-media-frame overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
        <div class="site-skeleton-block aspect-[4/3] h-full w-full"></div>
      </div>
      <div class="flex min-w-0 flex-col gap-3">
        <div class="site-skeleton-block h-3 w-28"></div>
        <div class="space-y-2">
          <div class="site-skeleton-block h-7 w-3/4"></div>
          <div class="site-skeleton-block h-4 w-full"></div>
          <div class="site-skeleton-block h-4 w-5/6"></div>
        </div>
        <div class="flex gap-2 pt-1">
          <div class="h-5 w-14 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80"></div>
          <div class="h-5 w-20 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80"></div>
        </div>
      </div>
    </article>
  `,
})
export class BlogPostCardSkeletonComponent {
}
