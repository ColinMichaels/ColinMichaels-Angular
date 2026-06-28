import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCode, faMagnifyingGlass, faRss} from '@fortawesome/free-solid-svg-icons';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogCategoryNavComponent} from '../../components/category-nav/blog-category-nav.component';
import {BlogPostCardComponent} from '../../components/post-card/post-card.component';
import {BlogPostCardSkeletonComponent} from '../../components/post-card/blog-post-card-skeleton.component';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';

@Component({
  selector: 'app-blog-index',
  imports: [
    RouterLink,
    FontAwesomeModule,
    BlogCategoryNavComponent,
    BlogPostCardComponent,
    BlogPostCardSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="blog-page">
      <section class="mx-auto max-w-5xl">
        <header class="blog-section-rule mb-10 border-b border-slate-200 pb-8 dark:border-zinc-800">
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 class="text-4xl font-semibold text-slate-950 dark:text-zinc-50 sm:text-5xl">Blog</h1>
              <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-zinc-400">
                Notes on frontend engineering, Angular architecture, Firebase, CMS workflows, and web systems.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <a
                [routerLink]="['/', pathNames.BLOG, 'search']"
                class="blog-action-primary"
              >
                <fa-icon [icon]="faMagnifyingGlass"></fa-icon>
                Search
              </a>
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
          <app-blog-category-nav></app-blog-category-nav>
        </header>

        <section>
          @if (loadError(); as error) {
            <div class="blog-section-rule py-8">
              <p class="text-lg font-medium text-slate-950 dark:text-zinc-100">Unable to load blog posts from Firestore.</p>
              <p class="mt-2 text-sm text-slate-600 dark:text-zinc-400">{{ error }}</p>
            </div>
          } @else {
            @defer (when !isLoading()) {
              @for (post of posts(); track post.id) {
                <app-blog-post-card [post]="post"></app-blog-post-card>
              } @empty {
                <p class="blog-section-rule py-8 text-slate-600 dark:text-zinc-400">
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
