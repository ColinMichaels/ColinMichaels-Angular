import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';

import {BlogPostSummary} from '../../models/blog-post.model';
import {BlogTagListComponent} from '../tag-list/tag-list.component';

@Component({
  selector: 'app-blog-post-card',
  imports: [
    RouterLink,
    BlogTagListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <article class="grid gap-4 border-t border-zinc-800 py-6 md:grid-cols-[220px_1fr]">
      <a [routerLink]="['/blog', post.slug]" class="block overflow-hidden rounded bg-zinc-900">
        <img
          [src]="post.coverImage"
          [alt]="post.title + ' cover image'"
          class="aspect-[4/3] h-full w-full object-cover"
        >
      </a>

      <div class="flex min-w-0 flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
          @for (category of post.categories; track category) {
            <span>{{ category }}</span>
          }
        </div>

        <div class="space-y-2">
          <h2 class="text-2xl font-semibold text-zinc-50">
            <a [routerLink]="['/blog', post.slug]" class="hover:text-cyan-300">
              {{ post.title }}
            </a>
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
}
