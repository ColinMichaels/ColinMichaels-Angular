import {Component, inject, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';

import {BlogPostCardComponent} from '../../components/post-card/post-card.component';
import {BlogRepositoryService} from '../../services/blog-repository.service';

@Component({
  selector: 'app-blog-index',
  imports: [
    RouterLink,
    BlogPostCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-5xl">
        <nav class="mb-10 flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/" class="hover:text-zinc-100">Home</a>
          <a routerLink="/admin/cms" class="hover:text-zinc-100">Admin</a>
        </nav>

        <header class="mb-10 grid gap-6 border-b border-zinc-800 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div class="space-y-4">
            <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Journal</p>
            <h1 class="text-4xl font-semibold text-zinc-50 sm:text-5xl">Blog</h1>
            <p class="max-w-2xl text-base leading-7 text-zinc-400">
              Notes on frontend architecture, product systems, experiments, and publishing workflows.
            </p>
          </div>

          <div class="flex flex-wrap gap-2 md:justify-end">
            @for (category of categories; track category) {
              <span class="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-300">{{ category }}</span>
            }
          </div>
        </header>

        <section>
          @for (post of posts; track post.id) {
            <app-blog-post-card [post]="post"></app-blog-post-card>
          } @empty {
            <p class="border-t border-zinc-800 py-8 text-zinc-400">No published posts yet.</p>
          }
        </section>
      </section>
    </main>
  `,
})
export class BlogIndexComponent {
  private readonly blogRepository = inject(BlogRepositoryService);

  protected readonly posts = this.blogRepository.getPublishedPosts();
  protected readonly categories = this.blogRepository.getCategories();
}
