import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogCategoryNavComponent} from '../../components/category-nav/blog-category-nav.component';
import {BlogPostListingComponent} from '../../components/post-listing/blog-post-listing.component';
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
    BlogPostListingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <section class="mx-auto max-w-5xl">
        <header class="blog-section-rule blog-page-header">
          <h1 class="blog-page-title mb-6">{{ categoryTitle() }}</h1>
          <app-blog-category-nav [activeSlug]="categorySlugValue()"></app-blog-category-nav>
        </header>

        <section>
          @if (!isLoading() && !loadError()) {
            <p class="blog-section-rule blog-results-summary">
              Showing {{ filteredPosts().length }} published post{{ filteredPosts().length === 1 ? '' : 's' }}
              in <span class="font-medium text-cyan-700 dark:text-cyan-300">{{ categoryTitle() }}</span>.
            </p>
          }

          <app-blog-post-listing
            [posts]="filteredPosts()"
            layout="grid"
            [loading]="isLoading()"
            [error]="loadError()"
            emptyTitle="No published posts in this category"
            emptyMessage="This category may not exist yet, or its posts may still be drafts."
            [regionLabel]="categoryTitle() + ' posts'"
          ></app-blog-post-listing>

          @if (!isLoading() && !loadError() && filteredPosts().length === 0) {
            <a [routerLink]="['/', pathNames.BLOG]" class="site-inline-link mt-5 inline-block">
              View all posts
            </a>
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
