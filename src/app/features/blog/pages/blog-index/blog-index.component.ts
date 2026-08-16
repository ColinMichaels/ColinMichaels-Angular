import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCode, faRss} from '@fortawesome/free-solid-svg-icons';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogArticleLibraryService} from '../../services/blog-article-library.service';
import {BlogCategoryNavComponent} from '../../components/category-nav/blog-category-nav.component';
import {ContinueReadingShelfComponent} from '../../components/continue-reading-shelf.component';
import {BlogNextReadComponent} from '../../components/next-read/blog-next-read.component';
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

interface PopularTopicFilter {
  slug: string;
  title: string;
  count: number;
}

const MAX_POPULAR_TOPICS = 6;

@Component({
  selector: 'app-blog-index',
  imports: [
    RouterLink,
    FontAwesomeModule,
    BlogCategoryNavComponent,
    ContinueReadingShelfComponent,
    BlogNextReadComponent,
    BlogPostListingComponent,
    SitePaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <section class="site-layout site-layout-wide">
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

        <section class="blog-topic-filters" aria-label="Popular topic filters">
          <p class="blog-topic-filters__label">Popular topics</p>
          <div class="blog-topic-filters__row">
            <a
              [routerLink]="['/', pathNames.BLOG]"
              [queryParams]="topicFilterQueryParams(null)"
              queryParamsHandling="merge"
              class="blog-topic-chip"
              [class.blog-topic-chip--active]="!topicSlug()"
              [attr.aria-current]="!topicSlug() ? 'page' : null"
            >
              All
              <span class="blog-topic-chip__count" [class.blog-topic-chip__count--active]="!topicSlug()">
                {{ allPosts().length }}
              </span>
            </a>

            @for (topic of popularTopics(); track topic.slug) {
              <a
                [routerLink]="['/', pathNames.BLOG]"
                [queryParams]="topicFilterQueryParams(topic.slug)"
                queryParamsHandling="merge"
                class="blog-topic-chip"
                [class.blog-topic-chip--active]="isActiveTopic(topic.slug)"
                [attr.aria-current]="isActiveTopic(topic.slug) ? 'page' : null"
              >
                {{ topic.title }}
                <span class="blog-topic-chip__count" [class.blog-topic-chip__count--active]="isActiveTopic(topic.slug)">
                  {{ topic.count }}
                </span>
              </a>
            } @empty {
              <span class="blog-topic-chip__empty" aria-hidden="true">No matching topic suggestions yet.</span>
            }
          </div>
        </section>

        <div class="blog-index-content">
          <section id="blog-post-list" class="blog-index-main-column">
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

          <aside class="blog-index-sidebar" aria-label="Reading suggestions">
            @if (sidebarNextReadPost(); as nextReadPost) {
              <app-blog-next-read [post]="nextReadPost"></app-blog-next-read>
            }

            <app-continue-reading-shelf surface="blog" [maxRecords]="3"></app-continue-reading-shelf>
          </aside>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .blog-topic-filters {
      margin: 0.35rem 0 1.75rem;
    }

    .blog-topic-filters__label {
      margin-bottom: 0.65rem;
      font-size: 0.74rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--site-muted);
      font-family: var(--font-accent);
    }

    .blog-topic-filters__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
    }

    .blog-topic-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      border: 1px solid var(--site-border);
      border-radius: 999px;
      background: var(--site-panel);
      color: var(--site-text);
      padding: 0.4rem 0.72rem;
      font-size: 0.82rem;
      font-weight: 600;
      line-height: 1.2;
      font-family: var(--font-accent);
      text-decoration: none;
      transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease, transform 160ms ease;
    }

    .blog-topic-chip:hover,
    .blog-topic-chip:focus-visible {
      border-color: var(--site-accent-strong);
      color: var(--site-accent-strong);
      background: var(--site-accent-soft);
      outline: none;
    }

    .blog-topic-chip:focus-visible {
      outline: 2px solid var(--site-accent-strong);
      outline-offset: 2px;
    }

    .blog-topic-chip--active {
      border-color: var(--site-accent-strong);
      color: #022c22;
      background: var(--site-accent);
      font-weight: 700;
    }

    .dark .blog-topic-chip--active {
      color: #0f172a;
    }

    .blog-topic-chip__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.3rem;
      border-radius: 999px;
      background: var(--site-border);
      color: inherit;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.09rem 0.35rem;
      line-height: 1;
    }

    .blog-topic-chip__count--active {
      background: rgb(255 255 255 / 0.4);
    }

    .blog-topic-chip__empty {
      color: var(--site-muted);
      font-size: 0.82rem;
      font-style: italic;
      margin-left: 0.2rem;
    }

    .blog-index-content {
      display: grid;
      gap: clamp(1.5rem, 3vw, 2.25rem);
      grid-template-columns: minmax(0, 1fr);
    }

    .blog-index-main-column {
      min-width: 0;
    }

    .blog-index-sidebar {
      min-width: 0;
      display: grid;
      gap: 1.1rem;
    }

    @media (min-width: 1024px) {
      .blog-index-content {
        grid-template-columns: minmax(0, 1fr) minmax(16rem, 20rem);
      }

      .blog-index-sidebar {
        position: sticky;
        top: 1rem;
      }
    }
  `],
})
export class BlogIndexComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);
  private readonly openGraph = inject(BlogOpenGraphService);
  private readonly articleLibrary = inject(BlogArticleLibraryService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly postsPageSize = DEFAULT_PAGINATION_PAGE_SIZE;
  protected readonly archiveViewOptions = BLOG_ARCHIVE_VIEW_OPTIONS;
  protected readonly faCode = faCode;
  protected readonly faRss = faRss;
  protected readonly allPosts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});
  private readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly topicSlug = toSignal(
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
  protected readonly popularTopics = computed((): readonly PopularTopicFilter[] => {
    const posts = this.allPosts();
    const topicHubs = this.topicHubs();

    if (!posts.length || !topicHubs.length) {
      return [];
    }

    return topicHubs
      .map(topic => ({
        slug: topic.slug,
        title: topic.title,
        count: posts.filter(post => postMatchesTopicHub(post, topic)).length,
      }))
      .filter(topic => topic.count > 0)
      .sort((left, right) => (
        right.count - left.count
        || left.title.localeCompare(right.title, undefined, {sensitivity: 'base'})
      ))
      .slice(0, MAX_POPULAR_TOPICS);
  });
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
  protected readonly sidebarNextReadPost = computed(() => {
    const postsBySlug = new Map(this.posts().map(post => [post.slug, post]));

    for (const record of this.articleLibrary.inProgress()) {
      const nextReadPost = postsBySlug.get(record.post.slug);

      if (nextReadPost) {
        return nextReadPost;
      }
    }

    return this.posts()[0] ?? null;
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

  protected isActiveTopic(topicSlug: string): boolean {
    return this.topicSlug() === topicSlug;
  }

  protected topicFilterQueryParams(topicSlug: string | null): {topic: string | null; page: null} {
    return {topic: topicSlug, page: null};
  }

  constructor() {
    this.openGraph.applyBlogIndex();
  }
}
