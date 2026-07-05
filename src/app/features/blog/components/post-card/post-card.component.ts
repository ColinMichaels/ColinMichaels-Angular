import {DatePipe, NgStyle} from '@angular/common';
import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogPostSummary} from '../../models/blog-post.model';
import {createBlogCategorySlug} from '../../utils/blog-category-url.util';
import {BlogTagListComponent} from '../tag-list/tag-list.component';

@Component({
  selector: 'app-blog-post-card',
  imports: [
    DatePipe,
    NgStyle,
    RouterLink,
    BlogTagListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="blog-post-row"
      [class.blog-post-row-topic]="topicLabel"
      [ngStyle]="topicStyle"
    >
      <a [routerLink]="['/blog', post.slug]" class="blog-media-frame blog-post-image-frame group aspect-[16/9]">
        <img
          [src]="postImage(post)"
          [alt]="post.title + ' cover image'"
          class="blog-post-image-fill"
          loading="lazy"
        >
      </a>

      <div class="flex min-w-0 flex-col gap-3">
        <div class="site-meta-row">
          @if (topicLabel) {
            <span class="blog-post-topic-label">{{ topicLabel }}</span>
          }
          <span>{{ post.publishedAt ? (post.publishedAt | date: 'MMM d, y') : (post.updatedAt | date: 'MMM d, y') }}</span>
          @for (category of post.categories; track category) {
            <span aria-hidden="true">/</span>
            <a
              [routerLink]="['/', pathNames.BLOG, 'category', categorySlug(category)]"
              class="font-medium hover:text-cyan-700 dark:hover:text-cyan-300"
            >
              {{ category }}
            </a>
          }
        </div>

        <div class="space-y-2">
          <h2 class="heading-subsection">
            <a [routerLink]="['/blog', post.slug]"
               class="hover:text-cyan-700 dark:hover:text-cyan-300">{{ post.title }}</a>
          </h2>
          <p class="max-w-2xl text-body">{{ post.excerpt }}</p>
        </div>

        @if (showTags) {
          <app-blog-tag-list [tags]="post.tags"></app-blog-tag-list>
        }
      </div>
    </article>
  `,
  styles: [`
    .blog-post-row-topic {
      position: relative;
      margin-inline: -0.75rem;
      padding-inline: 0.75rem;
      border-top-color: rgb(var(--blog-topic-accent-rgb) / 0.26);
      background:
        linear-gradient(90deg, rgb(var(--blog-topic-accent-rgb) / 0.09), transparent 42%),
        linear-gradient(180deg, rgb(var(--blog-topic-accent-rgb) / 0.045), transparent 70%);
    }

    .blog-post-row-topic .blog-media-frame {
      border-color: rgb(var(--blog-topic-accent-rgb) / 0.28);
      box-shadow: 0 14px 32px rgb(var(--blog-topic-accent-rgb) / 0.1);
    }

    .blog-post-topic-label {
      border: 1px solid rgb(var(--blog-topic-accent-rgb) / 0.3);
      background: rgb(var(--blog-topic-accent-rgb) / 0.1);
      color: color-mix(in srgb, var(--blog-topic-accent) 58%, #0f172a);
      font-weight: 700;
      letter-spacing: 0.16em;
      line-height: 1;
      padding: 0.3rem 0.45rem;
    }

    .blog-post-row-topic :is(.site-meta-row a, .heading-subsection a):hover {
      color: color-mix(in srgb, var(--blog-topic-accent) 68%, #0f172a);
    }

    :host-context(.dark) .blog-post-row-topic {
      background:
        linear-gradient(90deg, rgb(var(--blog-topic-accent-rgb) / 0.12), transparent 44%),
        linear-gradient(180deg, rgb(var(--blog-topic-accent-rgb) / 0.06), transparent 68%);
    }

    :host-context(.dark) .blog-post-row-topic .blog-media-frame {
      border-color: rgb(var(--blog-topic-accent-rgb) / 0.32);
      box-shadow: 0 18px 38px rgb(var(--blog-topic-accent-rgb) / 0.08);
    }

    :host-context(.dark) .blog-post-topic-label {
      border-color: rgb(var(--blog-topic-accent-rgb) / 0.36);
      background: rgb(var(--blog-topic-accent-rgb) / 0.14);
      color: var(--blog-topic-accent-strong);
    }

    :host-context(.dark) .blog-post-row-topic :is(.site-meta-row a, .heading-subsection a):hover {
      color: var(--blog-topic-accent-strong);
    }
  `],
})
export class BlogPostCardComponent {
  @Input({required: true}) post!: BlogPostSummary;
  @Input() showTags = true;
  @Input() topicLabel: string | null = null;
  @Input() topicAccent: string | null = null;
  @Input() topicAccentStrong: string | null = null;
  @Input() topicAccentRgb: string | null = null;

  protected readonly pathNames = PATH_NAMES;

  protected categorySlug(category: string): string {
    return createBlogCategorySlug(category);
  }

  protected postImage(post: BlogPostSummary): string {
    return post.thumbnailImage?.trim() || post.coverImage;
  }

  protected get topicStyle(): Record<string, string> | null {
    if (!this.topicLabel || !this.topicAccent || !this.topicAccentStrong || !this.topicAccentRgb) {
      return null;
    }

    return {
      '--blog-topic-accent': this.topicAccent,
      '--blog-topic-accent-strong': this.topicAccentStrong,
      '--blog-topic-accent-rgb': this.topicAccentRgb,
    };
  }
}
