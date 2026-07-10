import {DatePipe, DecimalPipe, isPlatformBrowser, NgClass} from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {FirebaseError} from 'firebase/app';
import {catchError, finalize, map, of, switchMap} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {AuthService} from '../../../../services/auth.service';
import {CMS_ACCESS_ROLES} from '../../../../shared/user-account/user-account.model';
import {PwaNetworkService} from '../../../../shared/pwa/pwa-network.service';
import {BlogBlockRendererComponent} from '../../components/block-renderer/blog-block-renderer.component';
import {BlogCommentsComponent} from '../../components/comments/blog-comments.component';
import {BlogShareActionsComponent} from '../../components/share-actions/blog-share-actions.component';
import {BlogStickyPostToolbarComponent} from '../../components/sticky-post-toolbar/blog-sticky-post-toolbar.component';
import {BlogTableOfContentsComponent} from '../../components/table-of-contents/blog-table-of-contents.component';
import {BlogTagListComponent} from '../../components/tag-list/tag-list.component';
import {BlogPost, BlogPostSummary} from '../../models/blog-post.model';
import {BlogEngagementService, BlogShareEvent} from '../../services/blog-engagement.service';
import {BlogArticleLibraryService} from '../../services/blog-article-library.service';
import {BlogOpenGraphService, BlogShareMetadata} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {OfflineBlogPostService, selectReadableBlogPost} from '../../services/offline-blog-post.service';
import {getBlogTaxonomyTerms} from '../../utils/blog-category-url.util';
import {resolveBlogPostImage} from '../../utils/blog-image-url.util';
import {AuthorBioComponent} from '../../../../shared/author/author-bio.component';
import {COLIN_AUTHOR_PROFILE} from '../../../../shared/author/author-profile.data';
import {
  createBlogReadingStats,
  createBlogTableOfContents,
  hasMeaningfulPostUpdate
} from '../../utils/blog-reading.util';

const HEALTH_CONTENT_TERMS = [
  'cardiac',
  'cardiology',
  'health',
  'heart surgery',
  'hospital',
  'insurance',
  'medical',
  'medication',
  'open heart',
  'procedure',
  'recovery',
] as const;

function normalizeHealthTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Component({
  selector: 'app-blog-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    NgClass,
    BlogBlockRendererComponent,
    BlogCommentsComponent,
    BlogShareActionsComponent,
    BlogStickyPostToolbarComponent,
    BlogTableOfContentsComponent,
    BlogTagListComponent,
    AuthorBioComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <article class="mx-auto max-w-7xl">
        @if (post(); as currentPost) {
          <div
            class="mx-auto grid max-w-4xl gap-10 xl:items-start"
            [ngClass]="hasTableOfContents() ? 'xl:max-w-7xl xl:grid-cols-[minmax(0,1fr)_20rem]' : 'xl:max-w-5xl'"
          >
            <div class="min-w-0 xl:col-start-1 xl:row-start-1">
              <header
                id="blog-post-top"
                class="blog-section-rule blog-page-header scroll-mt-20 space-y-6 focus:outline-none"
                tabindex="-1"
              >
                <h1
                  class="text-4xl font-semibold leading-tight text-slate-950 dark:text-zinc-50 sm:text-5xl">{{ currentPost.title }}</h1>
                <div class="blog-post-meta-row">
                  <span>
                    By
                    <a routerLink="/" [fragment]="authorProfile.profileFragment"
                       class="font-medium text-slate-800 hover:text-cyan-800 dark:text-zinc-300 dark:hover:text-cyan-200">
                      {{ currentPost.author.name }}
                    </a>
                  </span>
                  <span>
                    Posted {{ currentPost.publishedAt ? (currentPost.publishedAt | date: 'MMM d, y') : (currentPost.updatedAt | date: 'MMM d, y') }}
                  </span>
                  @if (showUpdatedDate()) {
                    <span>
                      Updated {{ currentPost.updatedAt | date: 'MMM d, y' }}
                    </span>
                  }
                  @if (readingStats(); as stats) {
                    <span>{{ stats.readingMinutes }} min read</span>
                    <span>{{ stats.wordCount | number }} words</span>
                  }
                </div>
                <div class="flex flex-wrap gap-2 text-cyan-800 dark:text-cyan-200">
                  @for (category of currentPost.categories; track category) {
                    <span class="blog-category-badge">
                      {{ category }}
                    </span>
                  }
                </div>
                <p class="text-lg leading-8 text-slate-600 dark:text-zinc-400">{{ currentPost.excerpt }}</p>
                @if (isPreviewRoute()) {
                  <div
                    class="border border-amber-500/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-100">
                    Draft preview. This temporary link is rendering unpublished CMS content.
                  </div>
                }
                @if (isOfflineCopy()) {
                  <div
                    class="border border-cyan-300 bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-950 dark:border-cyan-300/35 dark:bg-cyan-300/10 dark:text-cyan-100"
                    role="status"
                  >
                    You are reading a saved offline copy from {{ offlineRecord()?.savedAt | date: 'MMM d, y, h:mm a' }}.
                    Comments, embeds, and remotely hosted media may need a connection.
                  </div>
                }
                @if (showHealthDisclaimer()) {
                  <div
                    class="border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-950 dark:border-rose-300/30 dark:bg-rose-300/10 dark:text-rose-100">
                    {{ authorProfile.healthDisclaimer }} Confirm medical, medication, recovery, and insurance decisions
                    with qualified professionals.
                  </div>
                }
                @if (canEditPost()) {
                  <a
                    [routerLink]="['/', pathNames.ADMIN, pathNames.ADMIN_CMS, currentPost.slug, 'edit']"
                    class="inline-flex rounded border border-amber-600/60 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-500 hover:text-white dark:border-amber-300/50 dark:bg-amber-300/10 dark:text-amber-100 dark:hover:border-amber-200 dark:hover:bg-amber-300/20 dark:hover:text-white"
                  >
                    Edit post
                  </a>
                }
                <img
                  [src]="currentPost.coverImage"
                  [alt]="currentPost.title + ' cover image'"
                  class="blog-media-frame aspect-[16/9] max-h-[70vh] w-full object-contain shadow-xl dark:shadow-black/25"
                  data-site-preload-image
                  decoding="async"
                  fetchpriority="high"
                  loading="eager"
                  width="1200"
                  height="675"
                >
              </header>
            </div>

            @if (shareMetadata(); as share) {
              <app-blog-sticky-post-toolbar
                class="xl:col-start-1 xl:row-start-2"
                [title]="currentPost.title"
                [imageUrl]="currentPost.coverImage"
                [excerpt]="share.description"
                [sharePath]="createSharePath(currentPost.slug)"
                [shareTitle]="share.title"
                [shareUrl]="isPreviewRoute() ? '' : share.url"
                [trackingEnabled]="isSignedIn() && !isPreviewRoute()"
                [showComments]="!isPreviewRoute() && !isOfflineCopy()"
                [showLibraryControls]="!isPreviewRoute() && articleLibrary.supported()"
                [favorite]="articleLibraryRecord()?.favorite ?? false"
                [readLater]="articleLibraryRecord()?.readLater ?? false"
                [libraryBusy]="libraryActionBusy()"
                [showOfflineControl]="!isPreviewRoute() && offlinePosts.supported()"
                [offlineSaved]="isArticleSaved()"
                [offlineBusy]="offlineActionBusy()"
                [offlineUpdateAvailable]="offlineUpdateAvailable()"
                [readingProgress]="displayReadingProgress()"
                (shared)="recordShare(currentPost, $event)"
                (favoriteToggled)="toggleFavorite(currentPost)"
                (readLaterToggled)="toggleReadLater(currentPost)"
                (offlineToggled)="toggleOfflineArticle(currentPost)"
              ></app-blog-sticky-post-toolbar>
            }

            @if (hasTableOfContents()) {
              @defer (when hasTableOfContents()) {
                <aside class="min-w-0 xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:self-stretch">
                  <app-blog-table-of-contents
                    [items]="tableOfContents()"
                    [postPath]="createCurrentPostPath(currentPost.slug)"
                    [activeHeadingId]="activeContentSectionId()"
                    (headingSelected)="activeContentSectionId.set($event)"
                  ></app-blog-table-of-contents>
                </aside>
              }
            }

            <div class="min-w-0 xl:col-start-1 xl:row-start-3">
              <div #readingContent data-reading-content>
                <app-blog-block-renderer
                  [blocks]="currentPost.blocks"
                  [fallbackAlt]="currentPost.title"
                  [anchorPath]="createCurrentPostPath(currentPost.slug)"
                  [activeHeadingId]="activeContentSectionId()"
                ></app-blog-block-renderer>
              </div>

              <footer class="blog-section-rule mt-14">
                @if (previousPost() || nextPost()) {
                  <nav aria-label="Post navigation" class="grid gap-4 sm:grid-cols-2">
                    @if (previousPost(); as previous) {
                      <a
                        [routerLink]="['/', pathNames.BLOG, previous.slug]"
                        class="site-card-interactive group p-4"
                      >
                        <span class="site-meta block">Previous post</span>
                        <span
                          class="mt-2 block text-base font-medium leading-6 text-slate-950 group-hover:text-cyan-800 dark:text-zinc-100 dark:group-hover:text-cyan-200">{{ previous.title }}</span>
                      </a>
                    } @else {
                      <span aria-hidden="true" class="hidden sm:block"></span>
                    }

                    @if (nextPost(); as next) {
                      <a
                        [routerLink]="['/', pathNames.BLOG, next.slug]"
                        class="site-card-interactive group p-4 sm:text-right"
                      >
                        <span class="site-meta block">Next post</span>
                        <span
                          class="mt-2 block text-base font-medium leading-6 text-slate-950 group-hover:text-cyan-800 dark:text-zinc-100 dark:group-hover:text-cyan-200">{{ next.title }}</span>
                      </a>
                    }
                  </nav>
                }

                @if (currentPost.tags.length > 0 || shareMetadata()) {
                  <section class="blog-section-rule mt-10 grid gap-4">
                    @if (currentPost.tags.length > 0) {
                      <app-blog-tag-list [tags]="currentPost.tags"></app-blog-tag-list>
                    }
                    @if (shareMetadata(); as share) {
                      <app-blog-share-actions
                        [title]="share.title"
                        [excerpt]="share.description"
                        [path]="createSharePath(currentPost.slug)"
                        [url]="isPreviewRoute() ? '' : share.url"
                        [trackingEnabled]="isSignedIn() && !isPreviewRoute()"
                        variant="panel"
                        (shared)="recordShare(currentPost, $event)"
                      ></app-blog-share-actions>
                    }
                  </section>
                }

                @if (!isPreviewRoute() && !isOfflineCopy()) {
                  <div id="blog-comments" class="scroll-mt-44 focus:outline-none" tabindex="-1">
                    @defer (on viewport) {
                      <app-blog-comments [post]="currentPost"></app-blog-comments>
                    } @placeholder {
                      <section aria-labelledby="blog-comments-placeholder-heading" class="blog-section-rule mt-10">
                        <div class="grid gap-2">
                          <p class="eyebrow-sm eyebrow-cyan">Discussion</p>
                          <h2 id="blog-comments-placeholder-heading"
                              class="text-2xl font-semibold text-slate-950 dark:text-zinc-50">Comments</h2>
                        </div>
                        <div class="mt-6 grid gap-4" aria-hidden="true">
                          <div class="site-skeleton-card h-28"></div>
                          <div class="site-skeleton-card h-24"></div>
                        </div>
                      </section>
                    }
                  </div>
                }

                @defer (on viewport) {
                  <section class="blog-section-rule mt-10">
                    <app-author-bio></app-author-bio>
                  </section>
                } @placeholder {
                  <section class="blog-section-rule mt-10" aria-hidden="true">
                    <div class="site-skeleton-card h-40"></div>
                  </section>
                }

                @if (suggestedPosts().length > 0) {
                  <section aria-labelledby="suggested-posts-heading" class="blog-section-rule mt-10">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p class="eyebrow-sm eyebrow-cyan">Keep
                          reading</p>
                        <h2 id="suggested-posts-heading"
                            class="mt-1 text-2xl font-semibold text-slate-950 dark:text-zinc-50">Suggested
                          posts</h2>
                      </div>
                      <a [routerLink]="['/', pathNames.BLOG]"
                         class="text-sm font-medium text-slate-600 hover:text-cyan-800 dark:text-zinc-400 dark:hover:text-cyan-200">
                        View all posts
                      </a>
                    </div>
                    <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      @for (suggestedPost of suggestedPosts(); track suggestedPost.id) {
                        <a
                          [routerLink]="['/', pathNames.BLOG, suggestedPost.slug]"
                          class="site-card-interactive group flex min-h-full flex-col overflow-hidden"
                        >
                          <span
                            class="blog-image-reveal blog-post-image-frame relative block aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-zinc-900">
                            <img
                              [src]="suggestedPostImage(suggestedPost)"
                              [alt]="suggestedPost.title + ' thumbnail image'"
                              class="blog-post-image-fill"
                              loading="lazy"
                            >
                            <span
                              class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/92 to-transparent px-3 pb-3 pt-8">
                              <span
                                class="inline-flex rounded border border-cyan-300/70 bg-zinc-950/70 px-2 py-1 text-xs font-semibold text-cyan-100">
                                Read related post
                              </span>
                            </span>
                          </span>
                          <span class="flex flex-1 min-w-0 flex-col p-4">
                            <span class="text-xs text-slate-500 dark:text-zinc-500">
                              {{ suggestedPost.publishedAt ? (suggestedPost.publishedAt | date: 'MMM d, y') : (suggestedPost.updatedAt | date: 'MMM d, y') }}
                            </span>
                            <span
                              class="mt-1 block text-lg font-semibold leading-6 text-slate-950 group-hover:text-cyan-800 dark:text-zinc-100 dark:group-hover:text-cyan-200">{{ suggestedPost.title }}</span>
                            <span
                              class="mt-2 line-clamp-3 block text-sm leading-6 text-slate-600 dark:text-zinc-400">{{ suggestedPost.excerpt }}</span>
                          </span>
                        </a>
                      }
                    </div>
                  </section>
                }
              </footer>
            </div>
          </div>
        } @else if (loadError(); as error) {
          <section
            class="blog-section-rule site-card p-6">
            <h1 class="heading-subsection">Unable to load post</h1>
            <p class="mt-2 text-body">{{ error }}</p>
            <a routerLink="/blog"
               class="site-inline-link mt-5 inline-block">Back
              to blog</a>
          </section>
        } @else if (isLoading()) {
          <section
            class="blog-section-rule site-card p-6">
            <h1 class="heading-subsection">Loading post</h1>
            <p class="mt-2 text-body">Fetching the latest post data from Firestore.</p>
          </section>
        } @else {
          <section
            class="blog-section-rule site-card p-6">
            <h1 class="heading-subsection">Post not found</h1>
            <p class="mt-2 text-body">This post is unavailable or has not been published.</p>
            <a routerLink="/blog"
               class="site-inline-link mt-5 inline-block">Back
              to blog</a>
          </section>
        }
      </article>

      <footer class="blog-section-rule mx-auto mt-16 max-w-5xl pb-8 text-sm text-slate-600 dark:text-zinc-400">
        <div class="grid gap-8 md:grid-cols-[1.25fr_1fr_1fr]">
          <section>
            <p class="site-meta">
              ColinMichaels.com</p>
            <p class="mt-3 max-w-md leading-6">
              Projects, writing, media, and notes on frontend engineering, recovery, and creative systems.
            </p>
          </section>

          <nav aria-label="Footer navigation">
            <h2 class="text-sm font-semibold text-slate-950 dark:text-zinc-100">Explore</h2>
            <div class="mt-3 grid gap-2">
              <a [routerLink]="['/', pathNames.BLOG]" class="hover:text-cyan-800 dark:hover:text-cyan-200">All Posts</a>
              <a [routerLink]="['/', pathNames.OS_MAIN]" class="hover:text-cyan-800 dark:hover:text-cyan-200">OS</a>
            </div>
          </nav>

          <nav aria-label="Footer utilities">
            <h2 class="text-sm font-semibold text-slate-950 dark:text-zinc-100">Resources</h2>
            <div class="mt-3 grid gap-2">
              <a href="/sitemap.xml" class="hover:text-cyan-800 dark:hover:text-cyan-200">Sitemap</a>
              <a
                href="https://github.com/ColinMichaels"
                rel="noreferrer"
                target="_blank"
                class="hover:text-cyan-800 dark:hover:text-cyan-200"
              >
                GitHub
              </a>
              <a
                href="https://forms.gle/kfsZYFRzJcQYfruw9"
                rel="noreferrer"
                target="_blank"
                class="hover:text-cyan-800 dark:hover:text-cyan-200"
              >
                Report a Bug
              </a>
            </div>
          </nav>
        </div>

        <div
          class="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {{ currentYear }} Colin Michaels. All rights reserved.</p>
          <p>Built with Angular and Firebase.</p>
        </div>
      </footer>

      @if (readerActionMessage()) {
        <div
          class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-[120] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-cyan-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-800 shadow-2xl shadow-slate-950/20 dark:border-cyan-300/40 dark:bg-neutral-950 dark:text-zinc-100"
          role="status"
          aria-live="polite"
        >
          {{ readerActionMessage() }}
        </div>
      }
    </main>
  `,
})
export class BlogDetailComponent {
  @ViewChild('readingContent') private readingContentElement?: ElementRef<HTMLElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly engagementService = inject(BlogEngagementService);
  private readonly blogRepository = inject(BlogRepositoryService);
  protected readonly articleLibrary = inject(BlogArticleLibraryService);
  protected readonly offlinePosts = inject(OfflineBlogPostService);
  private readonly openGraph = inject(BlogOpenGraphService);
  private readonly network = inject(PwaNetworkService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private actionFeedbackTimer: ReturnType<typeof setTimeout> | undefined;
  private progressPersistenceTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingProgress: {post: BlogPostSummary; progressPercent: number} | undefined;

  protected readonly pathNames = PATH_NAMES;
  protected readonly authorProfile = COLIN_AUTHOR_PROFILE;
  protected readonly slug = toSignal(
    this.route.paramMap.pipe(map(params => params.get('slug') ?? '')),
    {initialValue: this.route.snapshot.paramMap.get('slug') ?? ''}
  );
  protected readonly previewToken = toSignal(
    this.route.paramMap.pipe(map(params => params.get('previewToken') ?? '')),
    {initialValue: this.route.snapshot.paramMap.get('previewToken') ?? ''}
  );
  protected readonly isPreviewRoute = computed(() => this.previewToken().length > 0);
  protected readonly previewLoading = signal(false);
  protected readonly previewLoadError = signal<string | null>(null);
  protected readonly remotePost = toSignal(
    this.route.paramMap.pipe(
      switchMap(params => {
        const previewToken = params.get('previewToken') ?? '';

        if (previewToken) {
          this.previewLoading.set(true);
          this.previewLoadError.set(null);

          return this.blogRepository.getPreviewPostByToken$(previewToken).pipe(
            catchError(error => {
              this.previewLoadError.set(this.describePreviewError(error));
              return of(undefined);
            }),
            finalize(() => this.previewLoading.set(false))
          );
        }

        return this.blogRepository.getPublishedPostBySlug$(params.get('slug') ?? '');
      })
    ),
    {initialValue: undefined}
  );
  protected readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  private readonly repositoryLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  private readonly repositoryLoadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly offlineRecord = computed(() => (
    this.isPreviewRoute()
      ? undefined
      : this.offlinePosts.records().find(record => record.post.slug === this.slug())
  ));
  protected readonly post = computed(() => {
    return selectReadableBlogPost(
      this.remotePost(),
      this.offlineRecord(),
      this.network.offline(),
      this.repositoryLoadError()
    );
  });
  protected readonly isOfflineCopy = computed(() => (
    Boolean(this.post()) && !this.remotePost() && Boolean(this.offlineRecord())
  ));
  protected readonly isArticleSaved = computed(() => this.offlinePosts.hasSavedSlug(this.slug()));
  protected readonly articleLibraryRecord = computed(() => (
    this.isPreviewRoute() ? undefined : this.articleLibrary.getRecord(this.slug())
  ));
  protected readonly offlineUpdateAvailable = computed(() => {
    const remotePost = this.remotePost();
    const offlineRecord = this.offlineRecord();
    return Boolean(
      remotePost
      && offlineRecord
      && remotePost.updatedAt !== offlineRecord.sourceUpdatedAt
    );
  });
  protected readonly offlineActionBusy = signal(false);
  protected readonly libraryActionBusy = signal(false);
  protected readonly readerActionMessage = signal<string | null>(null);
  protected readonly isLoading = computed(() => {
    if (this.isPreviewRoute()) {
      return this.previewLoading();
    }

    return this.network.offline() && this.offlinePosts.ready()
      ? false
      : this.repositoryLoading();
  });
  protected readonly loadError = computed(() => {
    if (this.isPreviewRoute()) {
      return this.previewLoadError();
    }

    if (this.network.offline() && this.offlinePosts.ready() && !this.offlineRecord()) {
      return 'This post is not saved for offline reading. Reconnect, open the post, and use Save offline first.';
    }

    return this.repositoryLoadError();
  });
  protected readonly canEditPost = toSignal(
    this.authService.getRoleAuthorization(CMS_ACCESS_ROLES, true).pipe(
      map(authorization => authorization.isAuthorized)
    ),
    {initialValue: false}
  );
  protected readonly isSignedIn = toSignal(this.authService.isAuthenticated(), {initialValue: false});
  protected readonly shareMetadata = signal<BlogShareMetadata | null>(null);
  protected readonly readingProgress = signal(0);
  protected readonly displayReadingProgress = computed(() => Math.max(
    this.readingProgress(),
    this.articleLibraryRecord()?.progressPercent ?? 0
  ));
  protected readonly activeContentSectionId = signal<string | null>(null);
  protected readonly currentYear = new Date().getFullYear();
  private readonly recordedReadPostIds = new Set<string>();
  protected readonly readingStats = computed(() => {
    const post = this.post();

    return post ? createBlogReadingStats(post) : null;
  });
  protected readonly tableOfContents = computed(() => {
    const post = this.post();

    return post ? createBlogTableOfContents(post.blocks) : [];
  });
  protected readonly hasTableOfContents = computed(() => this.tableOfContents().length > 1);
  protected readonly showUpdatedDate = computed(() => {
    const post = this.post();

    return post ? hasMeaningfulPostUpdate(post) : false;
  });
  protected readonly showHealthDisclaimer = computed(() => {
    const post = this.post();

    if (!post) {
      return false;
    }

    const searchableText = normalizeHealthTerm([
      post.title,
      post.excerpt,
      ...getBlogTaxonomyTerms(post),
      ...post.tags,
    ].join(' '));

    return HEALTH_CONTENT_TERMS.some(term => searchableText.includes(normalizeHealthTerm(term)));
  });
  protected readonly currentPostIndex = computed(() => (
    this.posts().findIndex(post => post.slug === this.slug())
  ));
  protected readonly previousPost = computed(() => {
    const index = this.currentPostIndex();

    return index >= 0 ? this.posts()[index + 1] : undefined;
  });
  protected readonly nextPost = computed(() => {
    const index = this.currentPostIndex();

    return index > 0 ? this.posts()[index - 1] : undefined;
  });
  protected readonly suggestedPosts = computed(() => {
    const currentPost = this.post();

    if (!currentPost) {
      return [];
    }

    return this.posts()
      .map(post => ({post, count: this.getSharedTaxonomyCount(post, currentPost)}))
      .filter(({post, count}) => post.slug !== currentPost.slug && count > 0)
      .sort((left, right) => (
        right.count - left.count
        || this.getPostDate(right.post).localeCompare(this.getPostDate(left.post))
      ))
      .map(({post}) => post)
      .slice(0, 3);
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.actionFeedbackTimer) {
        clearTimeout(this.actionFeedbackTimer);
      }

      if (this.progressPersistenceTimer) {
        clearTimeout(this.progressPersistenceTimer);
      }

      if (this.pendingProgress) {
        void this.articleLibrary.updateProgress(
          this.pendingProgress.post,
          this.pendingProgress.progressPercent
        );
      }
    });

    effect(() => {
      const post = this.post();

      if (post) {
        this.shareMetadata.set(this.openGraph.applyBlogPost(post));
        this.readingProgress.set(0);
        this.activeContentSectionId.set(this.tableOfContents()[0]?.id ?? null);
        this.queueReadingStateRefresh();
        if (!this.isPreviewRoute() && !this.isOfflineCopy()) {
          void this.recordPostRead(post);
        }
        return;
      }

      this.shareMetadata.set(null);
      this.activeContentSectionId.set(null);

      if (!this.isLoading() && !this.loadError() && this.offlinePosts.ready()) {
        this.openGraph.applyMissingBlogPost(this.slug() || 'preview');
      }
    });
  }

  protected async toggleOfflineArticle(post: BlogPost): Promise<void> {
    if (this.offlineActionBusy() || this.isPreviewRoute()) {
      return;
    }

    this.offlineActionBusy.set(true);

    try {
      if (this.offlineUpdateAvailable()) {
        await this.offlinePosts.save(post);
        this.showReaderFeedback('Offline copy updated with the latest article text.');
      } else if (this.offlinePosts.hasSavedSlug(post.slug)) {
        await this.offlinePosts.remove(post.slug);
        this.showReaderFeedback('Offline copy removed from this device.');
      } else {
        await this.offlinePosts.save(post);
        this.showReaderFeedback('Post downloaded for offline reading. Local article images were prepared when available.');
      }
    } catch (error) {
      this.showReaderFeedback(error instanceof Error
        ? error.message
        : 'The offline copy could not be updated.');
    } finally {
      this.offlineActionBusy.set(false);
    }
  }

  protected async toggleFavorite(post: BlogPostSummary): Promise<void> {
    if (this.libraryActionBusy() || this.isPreviewRoute()) {
      return;
    }

    this.libraryActionBusy.set(true);

    try {
      const favorite = !(this.articleLibraryRecord()?.favorite ?? false);
      await this.articleLibrary.setFavorite(post, favorite);
      this.showReaderFeedback(favorite ? 'Added to favorites.' : 'Removed from favorites.');
    } catch {
      this.showReaderFeedback('Favorites could not be updated on this device.');
    } finally {
      this.libraryActionBusy.set(false);
    }
  }

  protected async toggleReadLater(post: BlogPostSummary): Promise<void> {
    if (this.libraryActionBusy() || this.isPreviewRoute()) {
      return;
    }

    this.libraryActionBusy.set(true);

    try {
      const readLater = !(this.articleLibraryRecord()?.readLater ?? false);
      await this.articleLibrary.setReadLater(post, readLater);
      this.showReaderFeedback(readLater ? 'Saved to read later.' : 'Removed from read later.');
    } catch {
      this.showReaderFeedback('Read later could not be updated on this device.');
    } finally {
      this.libraryActionBusy.set(false);
    }
  }

  private showReaderFeedback(message: string): void {
    if (this.actionFeedbackTimer) {
      clearTimeout(this.actionFeedbackTimer);
    }

    this.readerActionMessage.set(message);
    this.actionFeedbackTimer = setTimeout(() => {
      this.readerActionMessage.set(null);
      this.actionFeedbackTimer = undefined;
    }, 4500);
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  protected updateReadingProgress(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const readingContent = this.readingContentElement?.nativeElement;

    if (!readingContent) {
      this.readingProgress.set(0);
      return;
    }

    const rect = readingContent.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const stickyStackHeight = this.getStickyReadingStackHeight();
    const readableViewportHeight = Math.max(1, viewportHeight - stickyStackHeight);
    const readableDistance = Math.max(1, rect.height - readableViewportHeight);
    const readDistance = Math.min(readableDistance, Math.max(0, stickyStackHeight - rect.top));

    const progressPercent = Math.round((readDistance / readableDistance) * 100);
    this.readingProgress.set(progressPercent);
    this.scheduleProgressPersistence(progressPercent);
    this.updateActiveContentSection();
  }

  private scheduleProgressPersistence(progressPercent: number): void {
    const post = this.post();

    if (!post || this.isPreviewRoute() || progressPercent <= 0) {
      return;
    }

    if (progressPercent <= (this.articleLibraryRecord()?.progressPercent ?? 0)) {
      return;
    }

    this.pendingProgress = {post, progressPercent};

    if (this.progressPersistenceTimer) {
      clearTimeout(this.progressPersistenceTimer);
    }

    if (progressPercent >= 95) {
      this.progressPersistenceTimer = undefined;
      const pending = this.pendingProgress;
      this.pendingProgress = undefined;
      void this.articleLibrary.updateProgress(pending.post, pending.progressPercent);
      return;
    }

    this.progressPersistenceTimer = setTimeout(() => {
      const pending = this.pendingProgress;
      this.pendingProgress = undefined;
      this.progressPersistenceTimer = undefined;

      if (pending) {
        void this.articleLibrary.updateProgress(pending.post, pending.progressPercent);
      }
    }, 650);
  }

  private getSharedTaxonomyCount(post: BlogPostSummary, currentPost: BlogPostSummary): number {
    const currentTerms = new Set(getBlogTaxonomyTerms(currentPost).map(term => term.toLowerCase()));

    return getBlogTaxonomyTerms(post)
      .filter(term => currentTerms.has(term.toLowerCase()))
      .length;
  }

  private getPostDate(post: BlogPostSummary): string {
    return post.publishedAt ?? post.updatedAt;
  }

  protected suggestedPostImage(post: BlogPostSummary): string {
    return resolveBlogPostImage(post);
  }

  protected createCurrentPostPath(slug: string): string {
    const previewToken = this.previewToken();

    return previewToken
      ? `/${this.pathNames.BLOG}/preview/${previewToken}`
      : `/${this.pathNames.BLOG}/${slug}`;
  }

  protected createSharePath(slug: string): string {
    return this.createCurrentPostPath(slug).replace(/^\//, '');
  }

  protected recordShare(post: BlogPostSummary, event: BlogShareEvent): void {
    if (this.isPreviewRoute()) {
      return;
    }

    void this.engagementService.recordPostShare({
      postId: post.id,
      postSlug: post.slug,
      provider: event.provider,
      ...(event.shareId ? {shareId: event.shareId} : {}),
    }).catch(() => {
      // Sharing should never block outbound share actions or copy feedback.
    });
  }

  private async recordPostRead(post: BlogPostSummary): Promise<void> {
    if (this.recordedReadPostIds.has(post.id)) {
      return;
    }

    this.recordedReadPostIds.add(post.id);

    try {
      await this.engagementService.recordPostRead({
        postId: post.id,
        postSlug: post.slug,
      });
    } catch {
      // Anonymous readers and transient Function failures should not affect reading.
    }
  }

  private queueReadingStateRefresh(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.requestAnimationFrame(() => this.updateReadingProgress());
  }

  private updateActiveContentSection(): void {
    const contents = this.tableOfContents();

    if (contents.length === 0) {
      this.activeContentSectionId.set(null);
      return;
    }

    const activeStickyHeading = document.querySelector<HTMLElement>('[data-sticky-active]');
    const activeStickyHeadingHeight = activeStickyHeading?.getBoundingClientRect().height ?? 0;
    const scrollOffset = this.getStickyReadingStackHeight() + activeStickyHeadingHeight + 2;
    let activeHeadingId = contents[0].id;

    for (const item of contents) {
      const heading = document.getElementById(item.id);

      if (!heading) {
        continue;
      }

      if (heading.getBoundingClientRect().top <= scrollOffset) {
        activeHeadingId = item.id;
      } else {
        break;
      }
    }

    this.activeContentSectionId.set(activeHeadingId);
  }

  private getStickyReadingStackHeight(): number {
    const toolbar = document.querySelector<HTMLElement>('app-blog-sticky-post-toolbar');

    if (!toolbar) {
      return 0;
    }

    const toolbarTop = Number.parseFloat(window.getComputedStyle(toolbar).top) || 0;

    return toolbarTop + toolbar.getBoundingClientRect().height;
  }

  private describePreviewError(error: unknown): string {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'permission-denied':
          return 'This preview link is not accessible. It may have been revoked.';
        case 'not-found':
          return 'This preview link has expired or been revoked.';
        case 'unavailable':
          return 'Unable to load the draft preview: the service is temporarily unavailable.';
        default:
          return `Unable to load the draft preview: ${error.message}`;
      }
    }

    return error instanceof Error ? error.message : 'Unable to load the draft preview.';
  }
}
