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
import {createBlogCategoryTitle, createBlogTagSlug} from '../../utils/blog-category-url.util';

@Component({
  selector: 'app-blog-tag',
  imports: [
    RouterLink,
    BlogCategoryNavComponent,
    BlogPostCardComponent,
    BlogPostCardSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <section class="mx-auto max-w-5xl">
        <header class="blog-section-rule blog-page-header">
          <nav class="blog-breadcrumb" aria-label="Blog navigation">
            <a [routerLink]="['/', pathNames.BLOG]" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Blog</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <span class="text-slate-900 dark:text-zinc-200">Tag</span>
          </nav>
          <p class="eyebrow-sm eyebrow-cyan">Tagged posts</p>
          <h1 class="blog-page-title mt-2">{{ tagTitle() }}</h1>
          <div class="mt-6">
            <app-blog-category-nav></app-blog-category-nav>
          </div>
        </header>

        <section>
          @if (loadError(); as error) {
            <div class="blog-section-rule blog-state-panel">
              <p class="blog-state-title">Unable to load blog posts from
                Firestore.</p>
              <p class="mt-2 text-sm">{{ error }}</p>
            </div>
          } @else {
            @defer (when !isLoading()) {
              <p class="blog-section-rule blog-results-summary">
                Showing {{ filteredPosts().length }} published post{{ filteredPosts().length === 1 ? '' : 's' }}
                tagged <span class="font-medium text-cyan-700 dark:text-cyan-300">{{ tagTitle() }}</span>.
              </p>

              @for (post of filteredPosts(); track post.id) {
                <app-blog-post-card [post]="post"></app-blog-post-card>
              } @empty {
                <div class="blog-section-rule blog-state-panel">
                  <p class="blog-state-title">No published posts with this tag.</p>
                  <p class="mt-2 text-sm">
                    This tag may not exist yet, or its posts may still be drafts.
                  </p>
                  <a [routerLink]="['/', pathNames.BLOG]"
                     class="site-inline-link mt-5 inline-block">
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
export class BlogTagComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly openGraph = inject(BlogOpenGraphService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});

  private readonly tagParam = toSignal(
    this.route.paramMap.pipe(map(params => params.get('tag') ?? '')),
    {initialValue: this.route.snapshot.paramMap.get('tag') ?? ''}
  );

  protected readonly tagSlugValue = computed(() => createBlogTagSlug(this.tagParam()));

  private readonly matchedTag = computed(() => {
    const tags = this.posts().flatMap(post => post.tags);
    return tags.find(tag => createBlogTagSlug(tag) === this.tagSlugValue()) ?? null;
  });

  protected readonly tagTitle = computed(() => (
    this.matchedTag() ?? createBlogCategoryTitle(this.tagParam())
  ));

  protected readonly filteredPosts = computed(() => (
    this.posts().filter(post =>
      post.tags.some(tag => createBlogTagSlug(tag) === this.tagSlugValue())
    )
  ));

  constructor() {
    effect(() => {
      if (this.isLoading()) {
        return;
      }

      this.openGraph.applyBlogTag(this.tagTitle(), this.filteredPosts().length);
    });
  }
}
