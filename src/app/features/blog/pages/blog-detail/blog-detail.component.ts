import {DatePipe, DecimalPipe, isPlatformBrowser} from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {map, switchMap} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogBlockRendererComponent} from '../../components/block-renderer/blog-block-renderer.component';
import {BlogShareActionsComponent} from '../../components/share-actions/blog-share-actions.component';
import {BlogTagListComponent} from '../../components/tag-list/tag-list.component';
import {BlogPostSummary} from '../../models/blog-post.model';
import {BlogOpenGraphService, BlogShareMetadata} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {getBlogTaxonomyTerms} from '../../utils/blog-category-url.util';
import {
  createBlogReadingStats,
  createBlogTableOfContents,
  hasMeaningfulPostUpdate
} from '../../utils/blog-reading.util';

@Component({
  selector: 'app-blog-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    BlogBlockRendererComponent,
    BlogShareActionsComponent,
    BlogTagListComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      @if (post()) {
        <div class="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 bg-transparent">
          <div class="h-full bg-cyan-300 transition-[width] duration-150" [style.width.%]="readingProgress()"></div>
        </div>
      }

      <article #articleElement class="mx-auto max-w-3xl">
        <nav class="mb-10 flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
          <a routerLink="/" class="hover:text-zinc-100">Home</a>
        </nav>

        @if (post(); as currentPost) {
          <header class="mb-10 space-y-5 border-b border-zinc-800 pb-8">
            <div class="flex flex-wrap gap-2 text-sm text-cyan-300">
              @for (category of currentPost.categories; track category) {
                <span>{{ category }}</span>
              }
            </div>
            <h1 class="text-4xl font-semibold leading-tight text-zinc-50 sm:text-5xl" [innerHTML]="currentPost.title"></h1>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
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
            <p class="text-lg leading-8 text-zinc-400" [innerHTML]="currentPost.excerpt"></p>
            @if (currentPost.tags.length > 0) {
              <app-blog-tag-list [tags]="currentPost.tags"></app-blog-tag-list>
            }
            @if (shareMetadata(); as share) {
              <app-blog-share-actions
                [title]="share.title"
                [excerpt]="share.description"
                [path]="pathNames.BLOG + '/' + currentPost.slug"
                [url]="share.url"
                variant="panel"
              ></app-blog-share-actions>
            }
            <img
              [src]="currentPost.coverImage"
              [alt]="currentPost.title + ' cover image'"
              class="aspect-[16/9] w-full rounded object-cover"
            >
          </header>

          @if (tableOfContents().length > 1) {
            <nav aria-labelledby="table-of-contents-heading" class="mb-10 border border-zinc-800 bg-zinc-900/60 p-5">
              <h2 id="table-of-contents-heading"
                  class="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
                Contents
              </h2>
              <ol class="mt-4 space-y-2 text-sm text-zinc-400">
                @for (item of tableOfContents(); track item.id) {
                  <li [class.pl-4]="item.level === 3">
                    <a [href]="createPostAnchorHref(currentPost.slug, item.id)" class="hover:text-cyan-200">
                      {{ item.text }}
                    </a>
                  </li>
                }
              </ol>
            </nav>
          }

          <app-blog-block-renderer
            [blocks]="currentPost.blocks"
            [fallbackAlt]="currentPost.title"
            [anchorPath]="createPostPath(currentPost.slug)"
          ></app-blog-block-renderer>

          <footer class="mt-14 border-t border-zinc-800 pt-8">
            @if (previousPost() || nextPost()) {
              <nav aria-label="Post navigation" class="grid gap-4 sm:grid-cols-2">
                @if (previousPost(); as previous) {
                  <a
                    [routerLink]="['/', pathNames.BLOG, previous.slug]"
                    class="group rounded border border-zinc-800 p-4 transition-colors hover:border-cyan-400 hover:bg-zinc-900"
                  >
                    <span class="block text-xs font-semibold uppercase tracking-wide text-zinc-500">Previous post</span>
                    <span class="mt-2 block text-base font-medium leading-6 text-zinc-100 group-hover:text-cyan-200"
                          [innerHTML]="previous.title"></span>
                  </a>
                } @else {
                  <span aria-hidden="true" class="hidden sm:block"></span>
                }

                @if (nextPost(); as next) {
                  <a
                    [routerLink]="['/', pathNames.BLOG, next.slug]"
                    class="group rounded border border-zinc-800 p-4 transition-colors hover:border-cyan-400 hover:bg-zinc-900 sm:text-right"
                  >
                    <span class="block text-xs font-semibold uppercase tracking-wide text-zinc-500">Next post</span>
                    <span class="mt-2 block text-base font-medium leading-6 text-zinc-100 group-hover:text-cyan-200"
                          [innerHTML]="next.title"></span>
                  </a>
                }
              </nav>
            }

            @if (suggestedPosts().length > 0) {
              <section aria-labelledby="suggested-posts-heading" class="mt-10">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wide text-cyan-300">Keep reading</p>
                    <h2 id="suggested-posts-heading" class="mt-1 text-2xl font-semibold text-zinc-50">Suggested
                      posts</h2>
                  </div>
                  <a [routerLink]="['/', pathNames.BLOG]" class="text-sm font-medium text-zinc-400 hover:text-cyan-200">
                    View all posts
                  </a>
                </div>
                <div class="mt-5 grid gap-4 md:grid-cols-3">
                  @for (suggestedPost of suggestedPosts(); track suggestedPost.id) {
                    <a
                      [routerLink]="['/', pathNames.BLOG, suggestedPost.slug]"
                      class="group flex min-h-full flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-900/70 transition-colors hover:border-cyan-400 hover:bg-zinc-900"
                    >
                      <span class="relative block overflow-hidden bg-zinc-900">
                        <img
                          [src]="suggestedPostImage(suggestedPost)"
                          [alt]="suggestedPost.title + ' thumbnail image'"
                          class="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-105"
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
                        <span class="text-xs text-zinc-500">
                          {{ suggestedPost.publishedAt ? (suggestedPost.publishedAt | date: 'MMM d, y') : (suggestedPost.updatedAt | date: 'MMM d, y') }}
                        </span>
                        <span class="mt-1 block text-lg font-semibold leading-6 text-zinc-100 group-hover:text-cyan-200"
                              [innerHTML]="suggestedPost.title"></span>
                        <span class="mt-2 line-clamp-3 block text-sm leading-6 text-zinc-400"
                              [innerHTML]="suggestedPost.excerpt"></span>
                      </span>
                    </a>
                  }
                </div>
              </section>
            }
          </footer>
        } @else if (loadError(); as error) {
          <section class="rounded border border-zinc-800 bg-zinc-900 p-6">
            <h1 class="text-2xl font-semibold text-zinc-50">Unable to load post</h1>
            <p class="mt-2 text-zinc-400">{{ error }}</p>
            <a routerLink="/blog" class="mt-5 inline-block text-cyan-300 hover:text-cyan-200">Back to blog</a>
          </section>
        } @else if (isLoading()) {
          <section class="rounded border border-zinc-800 bg-zinc-900 p-6">
            <h1 class="text-2xl font-semibold text-zinc-50">Loading post</h1>
            <p class="mt-2 text-zinc-400">Fetching the latest post data from Firestore.</p>
          </section>
        } @else {
          <section class="rounded border border-zinc-800 bg-zinc-900 p-6">
            <h1 class="text-2xl font-semibold text-zinc-50">Post not found</h1>
            <p class="mt-2 text-zinc-400">This post is unavailable or has not been published.</p>
            <a routerLink="/blog" class="mt-5 inline-block text-cyan-300 hover:text-cyan-200">Back to blog</a>
          </section>
        }
      </article>

      <footer class="mx-auto mt-16 max-w-5xl border-t border-zinc-800 pb-8 pt-8 text-sm text-zinc-400">
        <div class="grid gap-8 md:grid-cols-[1.25fr_1fr_1fr]">
          <section>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">ColinMichaels.com</p>
            <p class="mt-3 max-w-md leading-6">
              Projects, writing, media, and notes on frontend engineering, recovery, and creative systems.
            </p>
          </section>

          <nav aria-label="Footer navigation">
            <h2 class="text-sm font-semibold text-zinc-100">Explore</h2>
            <div class="mt-3 grid gap-2">
              <a routerLink="/" class="hover:text-cyan-200">Home</a>
              <a [routerLink]="['/', pathNames.BLOG]" class="hover:text-cyan-200">Blog</a>
              <a [routerLink]="['/', pathNames.LABS]" class="hover:text-cyan-200">Labs</a>
              <a [routerLink]="['/', pathNames.OS_LOGIN]" class="hover:text-cyan-200">OS</a>
            </div>
          </nav>

          <nav aria-label="Footer utilities">
            <h2 class="text-sm font-semibold text-zinc-100">Resources</h2>
            <div class="mt-3 grid gap-2">
              <a href="/sitemap.xml" class="hover:text-cyan-200">Sitemap</a>
              <a
                href="https://github.com/ColinMichaels"
                rel="noreferrer"
                target="_blank"
                class="hover:text-cyan-200"
              >
                GitHub
              </a>
              <a
                href="https://forms.gle/kfsZYFRzJcQYfruw9"
                rel="noreferrer"
                target="_blank"
                class="hover:text-cyan-200"
              >
                Report a Bug
              </a>
            </div>
          </nav>
        </div>

        <div
          class="mt-8 flex flex-col gap-2 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {{ currentYear }} Colin Michaels. All rights reserved.</p>
          <p>Built with Angular and Firebase.</p>
        </div>
      </footer>
    </main>
  `,
})
export class BlogDetailComponent {
  @ViewChild('articleElement') private articleElement?: ElementRef<HTMLElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly openGraph = inject(BlogOpenGraphService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly pathNames = PATH_NAMES;
  protected readonly slug = toSignal(
    this.route.paramMap.pipe(map(params => params.get('slug') ?? '')),
    {initialValue: this.route.snapshot.paramMap.get('slug') ?? ''}
  );
  protected readonly post = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('slug') ?? ''),
      switchMap(slug => this.blogRepository.getPublishedPostBySlug$(slug))
    ),
    {initialValue: undefined}
  );
  protected readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly shareMetadata = signal<BlogShareMetadata | null>(null);
  protected readonly readingProgress = signal(0);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly readingStats = computed(() => {
    const post = this.post();

    return post ? createBlogReadingStats(post) : null;
  });
  protected readonly tableOfContents = computed(() => {
    const post = this.post();

    return post ? createBlogTableOfContents(post.blocks) : [];
  });
  protected readonly showUpdatedDate = computed(() => {
    const post = this.post();

    return post ? hasMeaningfulPostUpdate(post) : false;
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
      .filter(post => post.slug !== currentPost.slug && this.getSharedTaxonomyCount(post, currentPost) > 0)
      .sort((left, right) => (
        this.getSharedTaxonomyCount(right, currentPost) - this.getSharedTaxonomyCount(left, currentPost)
        || this.getPostDate(right).localeCompare(this.getPostDate(left))
      ))
      .slice(0, 3);
  });

  constructor() {
    effect(() => {
      const post = this.post();

      if (post) {
        this.shareMetadata.set(this.openGraph.applyBlogPost(post));
        this.readingProgress.set(0);
        return;
      }

      this.shareMetadata.set(null);

      if (!this.isLoading() && !this.loadError()) {
        this.openGraph.applyMissingBlogPost(this.slug());
      }
    });
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  protected updateReadingProgress(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const article = this.articleElement?.nativeElement;

    if (!article) {
      this.readingProgress.set(0);
      return;
    }

    const rect = article.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const readableDistance = Math.max(1, rect.height - viewportHeight);
    const readDistance = Math.min(readableDistance, Math.max(0, -rect.top));

    this.readingProgress.set(Math.round((readDistance / readableDistance) * 100));
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
    return post.thumbnailImage?.trim() || post.coverImage;
  }

  protected createPostPath(slug: string): string {
    return `/${this.pathNames.BLOG}/${slug}`;
  }

  protected createPostAnchorHref(slug: string, headingId: string): string {
    return `${this.createPostPath(slug)}#${headingId}`;
  }
}
