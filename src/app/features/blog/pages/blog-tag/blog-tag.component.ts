import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogCategoryNavComponent} from '../../components/category-nav/blog-category-nav.component';
import {BlogPostListingComponent} from '../../components/post-listing/blog-post-listing.component';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {createBlogCategoryTitle, createBlogTagSlug} from '../../utils/blog-category-url.util';

@Component({
  selector: 'app-blog-tag',
  imports: [
    RouterLink,
    BlogCategoryNavComponent,
    BlogPostListingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <section class="site-layout site-layout-reading">
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
          @if (!isLoading() && !loadError()) {
            <p class="blog-section-rule blog-results-summary">
              Showing {{ filteredPosts().length }} published post{{ filteredPosts().length === 1 ? '' : 's' }}
              tagged <span class="font-medium text-cyan-700 dark:text-cyan-300">{{ tagTitle() }}</span>.
            </p>
          }

          <app-blog-post-listing
            [posts]="filteredPosts()"
            layout="compact"
            [loading]="isLoading()"
            [error]="loadError()"
            [showTags]="false"
            emptyTitle="No published posts with this tag"
            emptyMessage="This tag may not exist yet, or its posts may still be drafts."
            [regionLabel]="tagTitle() + ' tagged posts'"
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
