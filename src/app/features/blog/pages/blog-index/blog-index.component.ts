import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';

import {BlogCategoryNavComponent} from '../../components/category-nav/blog-category-nav.component';
import {BlogPostCardComponent} from '../../components/post-card/post-card.component';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';

@Component({
  selector: 'app-blog-index',
  imports: [
    BlogCategoryNavComponent,
    BlogPostCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-5xl">
        <header class="mb-10 border-b border-zinc-800 pb-8">
          <h1 class="mb-6 text-4xl font-semibold text-zinc-50 sm:text-5xl">Blog</h1>
          <app-blog-category-nav></app-blog-category-nav>
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
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});

  constructor() {
    this.openGraph.applyBlogIndex();
  }
}
