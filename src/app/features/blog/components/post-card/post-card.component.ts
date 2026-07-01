import {DatePipe} from '@angular/common';
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
    RouterLink,
    BlogTagListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="blog-post-row">
      <a [routerLink]="['/blog', post.slug]" class="blog-media-frame blog-post-image-frame group aspect-[4/3]">
        <img
          [src]="postImage(post)"
          [alt]="post.title + ' cover image'"
          class="blog-post-image-fill"
          loading="lazy"
        >
      </a>

      <div class="flex min-w-0 flex-col gap-3">
        <div class="site-meta-row">
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
})
export class BlogPostCardComponent {
  @Input({required: true}) post!: BlogPostSummary;
  @Input() showTags = true;

  protected readonly pathNames = PATH_NAMES;

  protected categorySlug(category: string): string {
    return createBlogCategorySlug(category);
  }

  protected postImage(post: BlogPostSummary): string {
    return post.thumbnailImage?.trim() || post.coverImage;
  }
}
