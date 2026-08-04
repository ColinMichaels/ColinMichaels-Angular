import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {
  clampPaginationPage,
  DEFAULT_PAGINATION_PAGE_SIZE,
  getPaginationPageCount,
  paginateItems,
  parsePaginationPage,
} from '../../../../shared/pagination/pagination.util';
import {SitePaginationComponent} from '../../../../shared/pagination/site-pagination.component';
import {
  BLOG_ARCHIVE_VIEW_OPTIONS,
  parseBlogArchiveView,
  resolveBlogArchiveListingLayout,
} from '../../utils/blog-archive-view.util';
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
    SitePaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <section class="site-layout site-layout-reading">
        <header class="blog-section-rule blog-page-header blog-category-page-header">
          <h1 class="blog-page-title blog-category-page-title">{{ categoryTitle() }}</h1>

          <div class="blog-archive-toolbar">
            <app-blog-category-nav [activeSlug]="categorySlugValue()"></app-blog-category-nav>

            <app-site-pagination
              [totalItems]="filteredPosts().length"
              [routeCommands]="['/', pathNames.BLOG, 'category', categorySlugValue()]"
              fragment="category-post-list"
              itemLabel="posts"
              [showSummary]="false"
              [showPageNavigation]="false"
              [viewOptions]="archiveViewOptions"
              [activeView]="archiveView()"
              defaultView="grid"
              [viewAriaLabel]="categoryTitle() + ' post view options'"
            ></app-site-pagination>
          </div>
        </header>

        <section id="category-post-list">
          @if (!isLoading() && !loadError()) {
            <p class="blog-section-rule blog-results-summary">
              Showing {{ filteredPosts().length }} published post{{ filteredPosts().length === 1 ? '' : 's' }}
              in <span class="font-medium text-cyan-700 dark:text-cyan-300">{{ categoryTitle() }}</span>.
            </p>
          }

          <app-blog-post-listing
            [posts]="paginatedPosts()"
            [layout]="listingLayout()"
            [loading]="isLoading()"
            [error]="loadError()"
            emptyTitle="No published posts in this category"
            emptyMessage="This category may not exist yet, or its posts may still be drafts."
            [regionLabel]="categoryTitle() + ' posts'"
          ></app-blog-post-listing>

          <app-site-pagination
            [currentPage]="currentPage()"
            [totalItems]="filteredPosts().length"
            [pageSize]="postsPageSize"
            [routeCommands]="['/', pathNames.BLOG, 'category', categorySlugValue()]"
            fragment="category-post-list"
            itemLabel="posts"
            itemLabelSingular="post"
            [ariaLabel]="categoryTitle() + ' posts pagination'"
            [showViewOptions]="false"
          ></app-site-pagination>

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
  protected readonly postsPageSize = DEFAULT_PAGINATION_PAGE_SIZE;
  protected readonly archiveViewOptions = BLOG_ARCHIVE_VIEW_OPTIONS;
  protected readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});

  private readonly categoryParam = toSignal(
    this.route.paramMap.pipe(map(params => params.get('category') ?? '')),
    {initialValue: this.route.snapshot.paramMap.get('category') ?? ''}
  );
  private readonly requestedPage = toSignal(
    this.route.queryParamMap.pipe(map(params => parsePaginationPage(params.get('page')))),
    {initialValue: parsePaginationPage(this.route.snapshot.queryParamMap.get('page'))}
  );
  private readonly requestedView = toSignal(
    this.route.queryParamMap.pipe(map(params => params.get('view'))),
    {initialValue: this.route.snapshot.queryParamMap.get('view')}
  );
  protected readonly archiveView = computed(() => parseBlogArchiveView(this.requestedView(), 'grid'));
  protected readonly listingLayout = computed(() => resolveBlogArchiveListingLayout(this.archiveView()));

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
  protected readonly totalPages = computed(() => getPaginationPageCount(
    this.filteredPosts().length,
    this.postsPageSize
  ));
  protected readonly currentPage = computed(() => clampPaginationPage(this.requestedPage(), this.totalPages()));
  protected readonly paginatedPosts = computed(() => paginateItems(
    this.filteredPosts(),
    this.currentPage(),
    this.postsPageSize
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
