import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCode, faMagnifyingGlass, faRss} from '@fortawesome/free-solid-svg-icons';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogCategoryNavComponent} from '../../components/category-nav/blog-category-nav.component';
import {BlogPostCardSkeletonComponent} from '../../components/post-card/blog-post-card-skeleton.component';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';

@Component({
  selector: 'app-blog-index',
  imports: [
    RouterLink,
    FontAwesomeModule,
    BlogCategoryNavComponent,
    BlogPostCardSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-5xl">
        <header class="mb-10 border-b border-zinc-800 pb-8">
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 class="text-4xl font-semibold text-zinc-50 sm:text-5xl">Blog</h1>
              <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Notes on frontend engineering, Angular architecture, Firebase, CMS workflows, and web systems.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <a
                [routerLink]="['/', pathNames.BLOG, 'search']"
                class="inline-flex min-h-10 items-center gap-2 border border-cyan-400 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
              >
                <fa-icon [icon]="faMagnifyingGlass"></fa-icon>
                Search
              </a>
              <a
                href="/feed.xml"
                class="inline-flex h-10 w-10 items-center justify-center border border-zinc-700 text-zinc-300 hover:border-cyan-300 hover:text-cyan-200"
                aria-label="Open RSS feed"
                title="RSS feed"
              >
                <fa-icon [icon]="faRss"></fa-icon>
              </a>
              <a
                href="/feed.json"
                class="inline-flex h-10 w-10 items-center justify-center border border-zinc-700 text-zinc-300 hover:border-cyan-300 hover:text-cyan-200"
                aria-label="Open JSON Feed"
                title="JSON Feed"
              >
                <fa-icon [icon]="faCode"></fa-icon>
              </a>
            </div>
          </div>
          <app-blog-category-nav></app-blog-category-nav>
        </header>

        <section>
          @if (loadError(); as error) {
            <div class="border-t border-zinc-800 py-8">
              <p class="text-lg font-medium text-zinc-100">Unable to load blog posts from Firestore.</p>
              <p class="mt-2 text-sm text-zinc-400">{{ error }}</p>
            </div>
          } @else {
            @defer (when !isLoading()) {
              @for (post of posts(); track post.id) {
                <app-blog-post-card [post]="post"></app-blog-post-card>
              } @empty {
                <p class="border-t border-zinc-800 py-8 text-zinc-400">
                  No published posts yet.
                </p>
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
export class BlogIndexComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly openGraph = inject(BlogOpenGraphService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly faCode = faCode;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faRss = faRss;
  protected readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});

  constructor() {
    this.openGraph.applyBlogIndex();
  }
}
