import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCode, faRss} from '@fortawesome/free-solid-svg-icons';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogCategoryNavComponent} from '../../components/category-nav/blog-category-nav.component';
import {BlogPostListingComponent} from '../../components/post-listing/blog-post-listing.component';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {TopicHubRepositoryService} from '../../../topics/services/topic-hub-repository.service';
import {postMatchesTopicHub} from '../../../topics/utils/topic-post-matching.util';
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
import {
  createBlogCategorySlug,
  getBlogTaxonomyTerms,
  parseBlogCategoryFilterSlugs,
} from '../../utils/blog-category-url.util';

@Component({
  selector: 'app-blog-index',
  imports: [
    RouterLink,
    FontAwesomeModule,
    BlogCategoryNavComponent,
    BlogPostListingComponent,
    SitePaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <section class="mx-auto max-w-5xl">
        <header class="blog-section-rule blog-page-header">
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 class="blog-page-title">Blog</h1>
            </div>
            <div class="flex flex-wrap gap-2">
              <a
                href="/feed.xml"
                class="blog-action-icon"
                aria-label="Open RSS feed"
                title="RSS feed"
              >
                <fa-icon [icon]="faRss"></fa-icon>
              </a>
              <a
                href="/feed.json"
                class="blog-action-icon"
                aria-label="Open JSON Feed"
                title="JSON Feed"
              >
                <fa-icon [icon]="faCode"></fa-icon>
              </a>
            </div>
          </div>
          <div class="blog-archive-toolbar">
            <app-blog-category-nav [selectedSlugs]="selectedCategorySlugs()"></app-blog-category-nav>

            <app-site-pagination
              [totalItems]="posts().length"
              [routeCommands]="['/', pathNames.BLOG]"
              fragment="blog-post-list"
              itemLabel="posts"
              [showSummary]="false"
              [showPageNavigation]="false"
              [viewOptions]="archiveViewOptions"
              [activeView]="archiveView()"
              defaultView="image-title"
              viewAriaLabel="Blog post view options"
            ></app-site-pagination>
          </div>
        </header>

        <section id="blog-post-list">
          @if (!isLoading() && !loadError() && activeTopic(); as topic) {
            <p class="blog-section-rule blog-results-summary">
              Showing {{ posts().length }} published post{{ posts().length === 1 ? '' : 's' }}
              in <span class="font-medium text-cyan-700 dark:text-cyan-300">{{ topic.title }}</span>.
              <a [routerLink]="['/', pathNames.BLOG]" class="site-inline-link ml-2">Clear topic</a>
            </p>
          }

          <app-blog-post-listing
            [posts]="paginatedPosts()"
            [layout]="listingLayout()"
            [loading]="isLoading()"
            [error]="loadError()"
            [appearance]="activeTopicAppearance()"
            [emptyTitle]="activeTopic() ? 'No published posts in this topic yet' : 'No published posts yet'"
            emptyMessage="Published writing will appear here as it becomes available."
            regionLabel="Published blog posts"
          ></app-blog-post-listing>

          <app-site-pagination
            [currentPage]="currentPage()"
            [totalItems]="posts().length"
            [pageSize]="postsPageSize"
            [routeCommands]="['/', pathNames.BLOG]"
            fragment="blog-post-list"
            itemLabel="posts"
            itemLabelSingular="post"
            ariaLabel="Blog posts pagination"
            [showViewOptions]="false"
          ></app-site-pagination>
        </section>
      </section>
    </main>
  `,
})
export class BlogIndexComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);
  private readonly openGraph = inject(BlogOpenGraphService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly postsPageSize = DEFAULT_PAGINATION_PAGE_SIZE;
  protected readonly archiveViewOptions = BLOG_ARCHIVE_VIEW_OPTIONS;
  protected readonly faCode = faCode;
  protected readonly faRss = faRss;
  private readonly allPosts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});
  private readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  private readonly topicSlug = toSignal(
    this.route.queryParamMap.pipe(map(params => params.get('topic') ?? '')),
    {initialValue: this.route.snapshot.queryParamMap.get('topic') ?? ''}
  );
  private readonly requestedPage = toSignal(
    this.route.queryParamMap.pipe(map(params => parsePaginationPage(params.get('page')))),
    {initialValue: parsePaginationPage(this.route.snapshot.queryParamMap.get('page'))}
  );
  private readonly requestedView = toSignal(
    this.route.queryParamMap.pipe(map(params => params.get('view'))),
    {initialValue: this.route.snapshot.queryParamMap.get('view')}
  );
  private readonly requestedCategories = toSignal(
    this.route.queryParamMap.pipe(map(params => params.get('categories'))),
    {initialValue: this.route.snapshot.queryParamMap.get('categories')}
  );
  protected readonly selectedCategorySlugs = computed(() => (
    parseBlogCategoryFilterSlugs(this.requestedCategories())
  ));
  protected readonly archiveView = computed(() => parseBlogArchiveView(this.requestedView(), 'image-title'));
  protected readonly listingLayout = computed(() => resolveBlogArchiveListingLayout(this.archiveView()));
  protected readonly activeTopic = computed(() => (
    this.topicHubs().find(topic => topic.slug === this.topicSlug()) ?? null
  ));
  protected readonly posts = computed(() => {
    const topic = this.activeTopic();
    const categorySlugs = this.selectedCategorySlugs();

    return this.allPosts().filter(post => {
      if (topic && !postMatchesTopicHub(post, topic)) {
        return false;
      }

      if (!categorySlugs.length) {
        return true;
      }

      const postCategorySlugs = new Set(
        getBlogTaxonomyTerms(post).map(createBlogCategorySlug)
      );
      return categorySlugs.every(slug => postCategorySlugs.has(slug));
    });
  });
  protected readonly totalPages = computed(() => getPaginationPageCount(this.posts().length, this.postsPageSize));
  protected readonly currentPage = computed(() => clampPaginationPage(this.requestedPage(), this.totalPages()));
  protected readonly paginatedPosts = computed(() => paginateItems(
    this.posts(),
    this.currentPage(),
    this.postsPageSize
  ));
  protected readonly activeTopicAppearance = computed(() => {
    const topic = this.activeTopic();

    return topic
      ? {
          label: topic.theme.shortLabel,
          accent: topic.theme.accent,
          accentStrong: topic.theme.accentStrong,
          accentRgb: topic.theme.accentRgb,
        }
      : null;
  });

  constructor() {
    this.openGraph.applyBlogIndex();
  }
}
