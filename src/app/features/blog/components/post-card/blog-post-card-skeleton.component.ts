import {Component, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'app-blog-post-card-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="blog-post-row"
             aria-hidden="true">
      <div class="blog-media-frame overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
        <div class="aspect-[4/3] h-full w-full animate-pulse bg-zinc-200 dark:bg-zinc-800"></div>
      </div>
      <div class="flex min-w-0 flex-col gap-3">
        <div class="h-3 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800"></div>
        <div class="space-y-2">
          <div class="h-7 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800"></div>
          <div class="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800"></div>
          <div class="h-4 w-5/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800"></div>
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
