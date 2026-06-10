import {Component, computed, effect, inject, ChangeDetectionStrategy} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogPostCardComponent} from '../../components/post-card/post-card.component';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {createBlogCategorySlug, createBlogCategoryTitle} from '../../utils/blog-category-url.util';

@Component({
  selector: 'app-blog-category',
  imports: [
    RouterLink,
    BlogPostCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-5xl">
        <header class="mb-10 grid gap-6 border-b border-zinc-800 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div class="space-y-4">
            <h1 class="text-4xl font-semibold text-zinc-50 sm:text-5xl">{{ categoryTitle() }}</h1>
            <p class="max-w-2xl text-sm leading-6 text-zinc-400">
              Published posts filed under this category.
            </p>
          </div>

          <div class="flex flex-wrap gap-2 md:justify-end">
            <a
              [routerLink]="['/', pathNames.BLOG]"
              class="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-300 hover:text-cyan-200"
            >
              All
            </a>
            @for (category of categories(); track category) {
              <a
                [routerLink]="['/', pathNames.BLOG, 'category', categorySlug(category)]"
                [class]="isActiveCategory(category) ? activeCategoryClass : inactiveCategoryClass"
                [attr.aria-current]="isActiveCategory(category) ? 'page' : null"
              >
                {{ category }}
              </a>
            }
          </div>
        </header>

        <section>
          @if (loadError(); as error) {
            <div class="border-t border-zinc-800">
              <p class="text-lg font-medium text-zinc-100">Unable to load blog posts from Firestore.</p>
              <p class="mt-2 text-sm text-zinc-400">{{ error }}</p>
            </div>
          } @else if (isLoading()) {
            <p class="border-t border-zinc-800 py-8 text-zinc-400">
              Loading {{ categoryTitle() }} posts from Firestore.
            </p>
          } @else {
            <p class="border-t border-zinc-800 py-4 text-sm text-zinc-500">
              Showing {{ filteredPosts().length }} published post{{ filteredPosts().length === 1 ? '' : 's' }}
              in <span class="text-cyan-300">{{ categoryTitle() }}</span>.
            </p>

            @for (post of filteredPosts(); track post.id) {
              <app-blog-post-card [post]="post"></app-blog-post-card>
            } @empty {
              <div class="border-t border-zinc-800 py-8">
                <p class="text-lg font-medium text-zinc-100">No published posts in this category.</p>
                <p class="mt-2 text-sm text-zinc-400">
                  This category may not exist yet, or its posts may still be drafts.
                </p>
                <a [routerLink]="['/', pathNames.BLOG]" class="mt-5 inline-block text-cyan-300 hover:text-cyan-200">
                  View all posts
                </a>
              </div>
            }
          }
        </section>
      </section>
    </main>
  `,
})
export class BlogCategoryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly openGraph = inject(BlogOpenGraphService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  protected readonly categories = toSignal(this.blogRepository.getCategories$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly activeCategoryClass = 'rounded border border-cyan-300 bg-cyan-400 px-3 py-2 text-sm font-medium text-zinc-950';
  protected readonly inactiveCategoryClass = 'rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-300 hover:text-cyan-200';
  private readonly categoryParam = toSignal(
    this.route.paramMap.pipe(map(params => params.get('category') ?? '')),
    {initialValue: this.route.snapshot.paramMap.get('category') ?? ''}
  );
  private readonly categorySlugValue = computed(() => createBlogCategorySlug(this.categoryParam()));
  protected readonly matchedCategory = computed(() => (
    this.categories().find(category => createBlogCategorySlug(category) === this.categorySlugValue()) ?? null
  ));
  protected readonly categoryTitle = computed(() => (
    this.matchedCategory() ?? createBlogCategoryTitle(this.categoryParam())
  ));
  protected readonly filteredPosts = computed(() => (
    this.posts().filter(post => post.categories.some(category => createBlogCategorySlug(category) === this.categorySlugValue()))
  ));

  constructor() {
    effect(() => {
      this.openGraph.applyBlogCategory(this.categoryTitle());
    });
  }

  protected categorySlug(category: string): string {
    return createBlogCategorySlug(category);
  }

  protected isActiveCategory(category: string): boolean {
    return createBlogCategorySlug(category) === this.categorySlugValue();
  }
}
