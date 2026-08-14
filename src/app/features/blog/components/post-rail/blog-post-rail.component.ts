import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, Input, inject} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogContentBlock, BlogPostSummary} from '../../models/blog-post.model';
import {BlogBlockRendererComponent} from '../block-renderer/blog-block-renderer.component';
import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';

@Component({
  selector: 'app-blog-post-rail',
  imports: [BlogBlockRendererComponent, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
  template: `
    <div class="space-y-8">
      @if (blocks.length > 0) {
        <section aria-labelledby="blog-post-rail-interactive-heading">
          <div class="mb-4 border-b border-slate-200 pb-3 dark:border-zinc-800">
            <p class="eyebrow-sm eyebrow-cyan">Join in</p>
            <h2 id="blog-post-rail-interactive-heading" class="mt-1 text-lg font-semibold text-slate-950 dark:text-zinc-50">
              On this post
            </h2>
          </div>
          <app-blog-block-renderer
            [blocks]="blocks"
            [fallbackAlt]="postTitle"
            [postId]="postId"
            [postSlug]="postSlug"
            [anchorPath]="postPath"
            displayMode="rail"
          ></app-blog-block-renderer>
        </section>
      }

      @if (suggestedPosts.length > 0) {
        <section aria-labelledby="blog-post-rail-suggested-heading">
          <div class="flex items-end justify-between gap-3 border-b border-slate-200 pb-3 dark:border-zinc-800">
            <div>
              <p class="eyebrow-sm eyebrow-cyan">Related to this story</p>
              <h2 id="blog-post-rail-suggested-heading" class="mt-1 text-lg font-semibold text-slate-950 dark:text-zinc-50">
                Read next
              </h2>
            </div>
            <a
              [routerLink]="['/', pathNames.BLOG]"
              class="min-h-11 shrink-0 content-center text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-cyan-100"
            >All posts</a>
          </div>

          <div class="divide-y divide-slate-200 dark:divide-zinc-800">
            @for (suggestedPost of suggestedPosts; track suggestedPost.id) {
              <a
                [routerLink]="['/', pathNames.BLOG, suggestedPost.slug]"
                class="group block min-h-24 py-4"
                (click)="trackSuggestedPost(suggestedPost)"
              >
                <span class="block text-xs text-slate-500 dark:text-zinc-500">
                  {{ suggestedPost.publishedAt ? (suggestedPost.publishedAt | date: 'MMM d, y') : (suggestedPost.updatedAt | date: 'MMM d, y') }}
                </span>
                <span class="mt-1 line-clamp-2 block text-sm font-semibold leading-5 text-slate-950 group-hover:text-cyan-800 dark:text-zinc-100 dark:group-hover:text-cyan-200">
                  {{ suggestedPost.title }}
                </span>
                <span class="mt-1 line-clamp-2 block text-xs leading-5 text-slate-600 dark:text-zinc-400">
                  {{ suggestedPost.excerpt }}
                </span>
              </a>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class BlogPostRailComponent {
  @Input() blocks: readonly BlogContentBlock[] = [];
  @Input() suggestedPosts: readonly BlogPostSummary[] = [];
  @Input() postId = '';
  @Input() postSlug = '';
  @Input() postTitle = 'Blog post';
  @Input() postPath = '';

  protected readonly pathNames = PATH_NAMES;
  private readonly analytics = inject(SiteAnalyticsService);

  protected trackSuggestedPost(post: BlogPostSummary): void {
    this.analytics.trackContentSelection(post, 'related_reading');
  }
}
