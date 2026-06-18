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
    <article class="grid gap-4 border-t border-zinc-800 py-6 md:grid-cols-[220px_1fr]">
      <a [routerLink]="['/blog', post.slug]" class="group block overflow-hidden rounded-md bg-zinc-900 shadow-md">
        <img
          [src]="post.coverImage"
          [alt]="post.title + ' cover image'"
          class="aspect-[4/3] h-full w-full object-cover transition duration-300 ease-in-out group-hover:scale-105 group-hover:brightness-110"
          loading="lazy"
        >
      </a>

      <div class="flex min-w-0 flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
          <span>{{ post.publishedAt ? (post.publishedAt | date: 'MMM d, y') : (post.updatedAt | date: 'MMM d, y') }}</span>
          @for (category of post.categories; track category) {
            <span aria-hidden="true">/</span>
            <a
              [routerLink]="['/', pathNames.BLOG, 'category', categorySlug(category)]"
              class="hover:text-cyan-300"
            >
              {{ category }}
            </a>
          }
        </div>

        <div class="space-y-2">
          <h2 class="text-2xl font-semibold text-zinc-50">
            <a [routerLink]="['/blog', post.slug]" class="hover:text-cyan-300">{{ post.title }}</a>
          </h2>
          <p class="max-w-2xl text-sm leading-6 text-zinc-400">{{ post.excerpt }}</p>
        </div>

        <app-blog-tag-list [tags]="post.tags"></app-blog-tag-list>
      </div>
    </article>
  `,
})
export class BlogPostCardComponent {
  @Input({required: true}) post!: BlogPostSummary;

  protected readonly pathNames = PATH_NAMES;

  protected categorySlug(category: string): string {
    return createBlogCategorySlug(category);
  }
}
