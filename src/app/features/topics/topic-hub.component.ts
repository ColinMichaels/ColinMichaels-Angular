import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogPostCardComponent} from '../blog/components/post-card/post-card.component';
import {BlogPostCardSkeletonComponent} from '../blog/components/post-card/blog-post-card-skeleton.component';
import {BlogPostSummary} from '../blog/models/blog-post.model';
import {BlogRepositoryService} from '../blog/services/blog-repository.service';
import {getBlogTaxonomyTerms} from '../blog/utils/blog-category-url.util';
import {getTopicHub, TOPIC_HUBS} from './topic-hubs.data';

function normalizeSearchValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Component({
  selector: 'app-topic-hub',
  imports: [
    BlogPostCardComponent,
    BlogPostCardSkeletonComponent,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="blog-page">
      <section class="mx-auto max-w-6xl">
        <header class="blog-section-rule blog-page-header">
          <nav class="blog-breadcrumb" aria-label="Topic navigation">
            <a routerLink="/" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Home</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <a [routerLink]="['/', pathNames.BLOG]" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Blog</a>
          </nav>
          <p class="eyebrow-sm eyebrow-cyan">{{ hub().eyebrow }}</p>
          <h1 class="blog-page-title mt-2">{{ hub().title }}</h1>
          <p class="blog-page-description">{{ hub().summary }}</p>
        </header>

        <section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div class="min-w-0">
            <div class="blog-section-rule">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p class="site-meta">Related writing</p>
                  <h2 class="mt-2 heading-subsection">Posts in this topic</h2>
                </div>
                <a [routerLink]="['/', pathNames.BLOG]" class="btn-link">View all posts</a>
              </div>
            </div>

            @if (loadError(); as error) {
              <div class="blog-section-rule blog-state-panel">
                <p class="blog-state-title">Unable to load topic posts.</p>
                <p class="mt-2 text-sm">{{ error }}</p>
              </div>
            } @else {
              @defer (when !isLoading()) {
                @for (post of topicPosts(); track post.id) {
                  <app-blog-post-card [post]="post"></app-blog-post-card>
                } @empty {
                  <div class="blog-section-rule blog-state-panel">
                    <p class="blog-state-title">No matching published posts yet.</p>
                    <p class="mt-2 text-sm">This hub is ready for future posts in the series.</p>
                  </div>
                }
              } @placeholder (minimum 300ms) {
                <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
                <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              }
            }
          </div>

          <aside class="site-card site-card-body lg:sticky lg:top-24">
            <p class="site-meta">Linkable asset</p>
            <h2 class="mt-3 heading-subsection">Checklist</h2>
            <ul class="mt-4 grid gap-3 text-sm leading-6 text-slate-600 dark:text-zinc-400">
              @for (item of hub().checklist; track item) {
                <li class="border-l-2 border-cyan-500 pl-3">{{ item }}</li>
              }
            </ul>

            <div class="blog-section-rule mt-6 pt-6">
              <p class="site-meta">Start here</p>
              <div class="mt-3 grid gap-3">
                @for (resource of hub().resources; track resource.href) {
                  <a [href]="resource.href" class="site-card-interactive block p-4">
                    <span class="block text-sm font-semibold text-slate-950 dark:text-zinc-50">{{ resource.label }}</span>
                    <span class="mt-1 block text-sm leading-6 text-slate-600 dark:text-zinc-400">{{ resource.description }}</span>
                  </a>
                }
              </div>
            </div>

            @if (hub().slug === 'recovery-planning') {
              <p class="mt-5 border-l-2 border-rose-500 pl-3 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                Health-related writing here is personal experience and organization help only, not medical advice.
              </p>
            }
          </aside>
        </section>
      </section>
    </main>
  `,
})
export class TopicHubComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly blogRepository = inject(BlogRepositoryService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly hub = computed(() => {
    const hubSlug = typeof this.route.snapshot.data['hubSlug'] === 'string'
      ? this.route.snapshot.data['hubSlug']
      : '';

    return getTopicHub(hubSlug) ?? TOPIC_HUBS[0];
  });
  protected readonly topicPosts = computed(() => (
    this.posts()
      .filter(post => this.postMatchesHub(post))
      .slice(0, 8)
  ));

  private postMatchesHub(post: BlogPostSummary): boolean {
    const searchableText = normalizeSearchValue([
      post.title,
      post.excerpt,
      post.slug,
      ...getBlogTaxonomyTerms(post),
      ...post.tags,
    ].join(' '));

    return this.hub().terms.some(term => searchableText.includes(normalizeSearchValue(term)));
  }
}
