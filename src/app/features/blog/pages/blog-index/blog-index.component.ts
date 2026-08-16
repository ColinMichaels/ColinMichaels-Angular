import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogArticleLibraryService} from '../../services/blog-article-library.service';
import {ContinueReadingShelfComponent} from '../../components/continue-reading-shelf.component';
import {BlogNextReadComponent} from '../../components/next-read/blog-next-read.component';
import {BlogPostListingComponent} from '../../components/post-listing/blog-post-listing.component';
import {ArticleLibraryControlComponent} from '../../components/article-library-control/article-library-control.component';
import {OfflineArticlesControlComponent} from '../../components/offline-articles-control/offline-articles-control.component';
import {BlogPostRailComponent} from '../../components/post-rail/blog-post-rail.component';
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
import {YouTubeLatestVideosComponent} from '../../../youtube/components/latest-videos/youtube-latest-videos.component';
import {
  BLOG_ARCHIVE_VIEW_OPTIONS,
  parseBlogArchiveView,
  resolveBlogArchiveListingLayout,
} from '../../utils/blog-archive-view.util';
import {DailyDiscoveryRailComponent} from '../../../daily-discovery/components/daily-discovery-rail.component';
import {
  createBlogCategorySlug,
  createBlogCategoryTitle,
  createBlogTagTaxonomyRoute,
  getBlogTaxonomyTerms,
  parseBlogCategoryFilterSlugs,
} from '../../utils/blog-category-url.util';
import {BlogTopicGuideComponent} from '../../components/topic-guide/blog-topic-guide.component';

type BlogTagRouteKind = ReturnType<typeof createBlogTagTaxonomyRoute>['kind'];

interface PopularTopicFilter {
  slug: string;
  title: string;
  count: number;
}

interface PopularTagFilter {
  slug: string;
  label: string;
  kind: BlogTagRouteKind;
  count: number;
}

const MAX_POPULAR_TOPICS = 6;
const MAX_POPULAR_TAGS = 10;

@Component({
  selector: 'app-blog-index',
  imports: [
    RouterLink,
    ContinueReadingShelfComponent,
    BlogNextReadComponent,
    ArticleLibraryControlComponent,
    DailyDiscoveryRailComponent,
    BlogPostRailComponent,
    OfflineArticlesControlComponent,
    BlogTopicGuideComponent,
    BlogPostListingComponent,
    YouTubeLatestVideosComponent,
    SitePaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <h1 class="sr-only">Blog</h1>
      <section class="site-layout site-layout-wide blog-index-shell">
        <section class="blog-index-controls" aria-label="Browse posts">
          <div class="blog-topic-filters" aria-label="Popular topic filters">
            <p class="blog-topic-filters__label">Most popular topics</p>
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
          </div>

          <div class="blog-index-display-controls">
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

            <div class="blog-index-feed-links" aria-label="Blog feeds">
              <a href="/feed.xml" class="site-inline-link">RSS</a>
              <a href="/feed.json" class="site-inline-link">JSON feed</a>
            </div>
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
            @if (activeTopic(); as topic) {
              <app-blog-topic-guide [topic]="topic"></app-blog-topic-guide>
            }

            @if (sidebarNextReadPost(); as nextReadPost) {
              <app-blog-next-read [post]="nextReadPost" [compact]="true"></app-blog-next-read>
            }

            <app-daily-discovery-rail></app-daily-discovery-rail>

            <app-article-library-control surface="menu"></app-article-library-control>

            <app-offline-articles-control surface="menu"></app-offline-articles-control>

            <app-continue-reading-shelf surface="blog" [maxRecords]="3"></app-continue-reading-shelf>

            @if (sidebarPopularTags().length > 0) {
              <section class="blog-index-sidebar-panel" aria-label="Popular tags">
                <p class="blog-index-sidebar-panel__heading">Popular tags</p>
                <div class="blog-index-sidebar-tags">
                  @for (tag of sidebarPopularTags(); track tag.slug) {
                    <a
                      [routerLink]="['/', pathNames.BLOG, tag.kind, tag.slug]"
                      class="blog-tag-chip blog-index-sidebar-tags__chip"
                    >
                      {{ tag.label }}
                      <span class="blog-index-sidebar-tags__count">{{ tag.count }}</span>
                    </a>
                  }
                </div>
              </section>
            }

            @if (sidebarSuggestedPosts().length > 0) {
              <app-blog-post-rail
                class="blog-index-sidebar-rail"
                [suggestedPosts]="sidebarSuggestedPosts()"
                [postTitle]="'Suggested reading'"
              ></app-blog-post-rail>
            }

            <app-youtube-latest-videos
              class="mt-4"
              [maxResults]="2"
              sectionId="blog-index-youtube"
              heading="Latest from Colin Michaels"
              description="Watch what I’m testing, building, and flying now."
              analyticsSourceComponent="blog_index_youtube"
              [compact]="true"
            ></app-youtube-latest-videos>
          </aside>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .blog-index-controls {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem 2rem;
      margin: 0.35rem 0 1.75rem;
      padding-bottom: 1.1rem;
      border-bottom: 1px solid var(--site-border);
    }

    .blog-topic-filters {
      min-width: 0;
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
      gap: 0.62rem;
    }

    .blog-index-display-controls {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.85rem;
      flex: 0 0 auto;
    }

    .blog-index-feed-links {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      white-space: nowrap;
    }

    .blog-topic-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      border: 1px solid var(--site-border);
      border-radius: 999px;
      background: var(--site-panel);
      color: var(--site-text);
      padding: 0.46rem 0.86rem;
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

    .blog-index-shell {
      max-width: min(94rem, calc(100vw - (var(--site-gutter) * 2)));
    }

    .blog-index-sidebar-panel {
      border: 1px solid var(--site-border);
      background: color-mix(in srgb, var(--site-panel) 66%, var(--site-panel-soft));
      border-radius: var(--site-radius-surface, 0.75rem);
      padding: 0.95rem;
    }

    .blog-index-sidebar-panel__heading {
      margin: 0 0 0.65rem;
      font-size: 0.72rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--site-muted);
      font-weight: 700;
      font-family: var(--font-accent);
    }

    .blog-index-sidebar-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .blog-index-sidebar-tags__chip {
      align-items: center;
      border-radius: 999px;
      font-size: 0.71rem;
      line-height: 1.15;
      min-height: 1.95rem;
      padding-inline: 0.72rem;
      text-transform: none;
      letter-spacing: 0.03em;
      gap: 0.35rem;
    }

    .blog-index-sidebar-tags__count {
      display: inline-flex;
      min-width: 1.22rem;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: color-mix(in srgb, var(--site-accent-strong) 22%, transparent);
      color: var(--site-accent-strong);
      font-weight: 700;
      font-size: 0.62rem;
      padding: 0.08rem 0.35rem;
    }

    .blog-index-sidebar-panel + app-blog-post-rail,
    .blog-index-sidebar-panel + .blog-index-sidebar-rail {
      border-top: 0;
    }

    .blog-index-main-column {
      min-width: 0;
    }

    .blog-index-sidebar {
      min-width: 0;
      display: grid;
      align-content: start;
      gap: 1.5rem;
    }

    @media (min-width: 1024px) {
      .blog-index-content {
        grid-template-columns: minmax(0, 1fr) minmax(19rem, 22rem);
        gap: clamp(1.5rem, 2.6vw, 2.25rem);
      }

      .blog-index-sidebar {
        position: sticky;
        top: 1rem;
      }
    }

    @media (max-width: 63.99rem) {
      .blog-index-controls {
        align-items: start;
        flex-direction: column;
      }

      .blog-index-display-controls {
        justify-content: space-between;
        width: 100%;
      }
    }

    @media (max-width: 39.99rem) {
      .blog-index-display-controls {
        align-items: start;
        flex-direction: column;
      }
    }

    .blog-index-sidebar app-blog-post-rail,
    .blog-index-sidebar app-article-library-control,
    .blog-index-sidebar app-offline-articles-control,
    .blog-index-sidebar app-daily-discovery-rail,
    .blog-index-sidebar app-youtube-latest-videos,
    .blog-index-sidebar app-blog-topic-guide,
    .blog-index-sidebar app-blog-next-read,
    .blog-index-sidebar app-continue-reading-shelf {
      width: 100%;
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
  protected readonly sidebarSuggestedPosts = computed(() => {
    const nextReadSlug = this.sidebarNextReadPost()?.slug;

    return this.posts().filter(post => post.slug !== nextReadSlug).slice(0, 4);
  });
  protected readonly sidebarPopularTags = computed((): readonly PopularTagFilter[] => {
    const tagCounts = new Map<string, {label: string; routeKind: BlogTagRouteKind; count: number}>();

    for (const post of this.posts()) {
      for (const rawTag of post.tags) {
        const trimmed = rawTag.trim();

        if (!trimmed) {
          continue;
        }

        const route = createBlogTagTaxonomyRoute(trimmed);
        const routeKey = `${route.kind}:${route.slug}`;
        const previous = tagCounts.get(routeKey);

        if (previous) {
          previous.count += 1;
          continue;
        }

        tagCounts.set(routeKey, {
          label: route.kind === 'category' ? createBlogCategoryTitle(route.slug) : trimmed,
          routeKind: route.kind,
          count: 1,
        });
      }
    }

    return Array.from(tagCounts.entries())
      .map(([key, value]) => {
        const [routeKind, slug] = key.split(':', 2);

        return {
          slug,
          label: value.label,
          kind: routeKind as BlogTagRouteKind,
          count: value.count,
        };
      })
      .sort((left, right) => (
        right.count - left.count
        || left.label.localeCompare(right.label, undefined, {sensitivity: 'base'})
      ))
      .slice(0, MAX_POPULAR_TAGS);
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
