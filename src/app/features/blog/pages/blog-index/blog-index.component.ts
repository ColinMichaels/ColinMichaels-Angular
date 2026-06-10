import {Component, inject, ChangeDetectionStrategy} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {BlogPostCardComponent} from '../../components/post-card/post-card.component';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {createBlogCategorySlug} from '../../utils/blog-category-url.util';
import {PATH_NAMES} from '../../../../app-route-paths';

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
          </div>

          <div class="flex flex-wrap gap-2 md:justify-end">
            <a
              [routerLink]="['/', pathNames.BLOG]"
              [class]="activeCategoryClass"
              aria-current="page"
            >
              All
            </a>
            @for (category of categories(); track category) {
              <a
                [routerLink]="['/', pathNames.BLOG, 'category', categorySlug(category)]"
                [class]="inactiveCategoryClass"
              >
                {{ category }}
              </a>
            }
          </div>
        </header>

        <section>
          @if (loadError(); as error) {
            <div class="border-t border-zinc-800 py-8">
              <p class="text-lg font-medium text-zinc-100">Unable to load blog posts from Firestore.</p>
              <p class="mt-2 text-sm text-zinc-400">{{ error }}</p>
            </div>
          } @else if (isLoading()) {
            <p class="border-t border-zinc-800 py-8 text-zinc-400">
              Loading posts from Firestore.
            </p>
          } @else {
          @for (post of posts(); track post.id) {
              <app-blog-post-card [post]="post"></app-blog-post-card>
            } @empty {
              <p class="border-t border-zinc-800 py-8 text-zinc-400">
                No published posts yet.
              </p>
            }
          }
        </section>
      </section>
    </main>
  `,
})
export class BlogIndexComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly openGraph = inject(BlogOpenGraphService);

  protected readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  protected readonly categories = toSignal(this.blogRepository.getCategories$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly pathNames = PATH_NAMES;
  protected readonly activeCategoryClass = 'rounded border border-cyan-300 bg-cyan-400 px-3 py-2 text-sm font-medium text-zinc-950';
  protected readonly inactiveCategoryClass = 'rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-300 hover:text-cyan-200';

  constructor() {
    this.openGraph.applyBlogIndex();
  }

  protected categorySlug(category: string): string {
    return createBlogCategorySlug(category);
  }
}
