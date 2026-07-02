import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogCategoryNavComponent} from '../../components/category-nav/blog-category-nav.component';
import {BlogPostCardComponent} from '../../components/post-card/post-card.component';
import {BlogPostCardSkeletonComponent} from '../../components/post-card/blog-post-card-skeleton.component';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {
  createBlogCategorySlug,
  createBlogCategoryTitle,
  getBlogTaxonomyTerms
} from '../../utils/blog-category-url.util';

@Component({
  selector: 'app-blog-category',
  imports: [
    RouterLink,
    BlogCategoryNavComponent,
    BlogPostCardComponent,
    BlogPostCardSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="blog-page">
      <section class="mx-auto max-w-5xl">
        <header class="blog-section-rule blog-page-header">
          <h1 class="blog-page-title mb-6">{{ categoryTitle() }}</h1>
          <app-blog-category-nav [activeSlug]="categorySlugValue()"></app-blog-category-nav>
        </header>

        <section>
          @if (loadError(); as error) {
            <div class="blog-section-rule blog-state-panel">
              <p class="blog-state-title">Unable to load blog posts from Firestore.</p>
              <p class="mt-2 text-sm">{{ error }}</p>
            </div>
          } @else {
            @defer (when !isLoading()) {
              <p class="blog-section-rule blog-results-summary">
                Showing {{ filteredPosts().length }} published post{{ filteredPosts().length === 1 ? '' : 's' }}
                in <span class="font-medium text-cyan-700 dark:text-cyan-300">{{ categoryTitle() }}</span>.
              </p>

              @for (post of filteredPosts(); track post.id) {
                <app-blog-post-card [post]="post"></app-blog-post-card>
              } @empty {
                <div class="blog-section-rule blog-state-panel">
                  <p class="blog-state-title">No published posts in this category.</p>
                  <p class="mt-2 text-sm">
                    This category may not exist yet, or its posts may still be drafts.
                  </p>
                  <a [routerLink]="['/', pathNames.BLOG]" class="site-inline-link mt-5 inline-block">
                    View all posts
                  </a>
                </div>
              }
            } @placeholder (minimum 300ms) {
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
            } @loading (after 150ms; minimum 300ms) {
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
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
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});

  private readonly categoryParam = toSignal(
    this.route.paramMap.pipe(map(params => params.get('category') ?? '')),
    {initialValue: this.route.snapshot.paramMap.get('category') ?? ''}
  );

  protected readonly categorySlugValue = computed(() => createBlogCategorySlug(this.categoryParam()));

  private readonly matchedCategory = computed(() => {
    const categories = this.posts().flatMap(post => getBlogTaxonomyTerms(post));
    return categories.find(c => createBlogCategorySlug(c) === this.categorySlugValue()) ?? null;
  });

  protected readonly categoryTitle = computed(() => (
    this.matchedCategory() ?? createBlogCategoryTitle(this.categoryParam())
  ));

  protected readonly filteredPosts = computed(() => (
    this.posts().filter(post =>
      getBlogTaxonomyTerms(post).some(term => createBlogCategorySlug(term) === this.categorySlugValue())
    )
  ));

  constructor() {
    effect(() => {
      if (this.isLoading()) {
        return;
      }

      this.openGraph.applyBlogCategory(this.categoryTitle(), this.filteredPosts().length);
    });
  }
}
