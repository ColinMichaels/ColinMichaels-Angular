import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCode, faMagnifyingGlass, faRss} from '@fortawesome/free-solid-svg-icons';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogCategoryNavComponent} from '../../components/category-nav/blog-category-nav.component';
import {BlogPostCardComponent} from '../../components/post-card/post-card.component';
import {BlogPostCardSkeletonComponent} from '../../components/post-card/blog-post-card-skeleton.component';
import type {BlogPostSummary} from '../../models/blog-post.model';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {getBlogTaxonomyTerms} from '../../utils/blog-category-url.util';
import {TopicHubRepositoryService} from '../../../topics/services/topic-hub-repository.service';
import type {TopicHub} from '../../../topics/topic-hubs.data';

function normalizeSearchValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function postMatchesTopicHub(post: BlogPostSummary, topic: TopicHub): boolean {
  const searchableText = normalizeSearchValue([
    post.title,
    post.excerpt,
    post.slug,
    ...getBlogTaxonomyTerms(post),
    ...post.tags,
  ].join(' '));
  const searchableTokens = searchableText.split(' ');

  return topic.terms.some(term => {
    const normalizedTerm = normalizeSearchValue(term);

    return normalizedTerm.includes(' ')
      ? searchableText.includes(normalizedTerm)
      : searchableTokens.includes(normalizedTerm);
  });
}

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
        <header class="blog-section-rule blog-page-header">
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 class="blog-page-title">Blog</h1>
              <p class="blog-page-description">
                Notes on frontend engineering, Angular architecture, Firebase, CMS workflows, and web systems.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <a
                [routerLink]="['/', pathNames.SEARCH]"
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
            <div class="blog-section-rule blog-state-panel">
              <p class="blog-state-title">Unable to load blog posts from Firestore.</p>
              <p class="mt-2 text-sm">{{ error }}</p>
            </div>
          } @else {
            @defer (when !isLoading()) {
              @if (activeTopic(); as topic) {
                <p class="blog-section-rule blog-results-summary">
                  Showing {{ posts().length }} published post{{ posts().length === 1 ? '' : 's' }}
                  in <span class="font-medium text-cyan-700 dark:text-cyan-300">{{ topic.title }}</span>.
                  <a [routerLink]="['/', pathNames.BLOG]" class="site-inline-link ml-2">Clear topic</a>
                </p>
              }

              @for (post of posts(); track post.id) {
                <app-blog-post-card
                  [post]="post"
                  [topicLabel]="activeTopic()?.theme?.shortLabel ?? null"
                  [topicAccent]="activeTopic()?.theme?.accent ?? null"
                  [topicAccentStrong]="activeTopic()?.theme?.accentStrong ?? null"
                  [topicAccentRgb]="activeTopic()?.theme?.accentRgb ?? null"
                ></app-blog-post-card>
              } @empty {
                <p class="blog-section-rule blog-state-panel">
                  No published posts{{ activeTopic() ? ' in this topic yet.' : ' yet.' }}
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
  private readonly route = inject(ActivatedRoute);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);
  private readonly openGraph = inject(BlogOpenGraphService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly faCode = faCode;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
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
  protected readonly activeTopic = computed(() => (
    this.topicHubs().find(topic => topic.slug === this.topicSlug()) ?? null
  ));
  protected readonly posts = computed(() => {
    const topic = this.activeTopic();

    if (!topic) {
      return this.allPosts();
    }

    return this.allPosts().filter(post => postMatchesTopicHub(post, topic));
  });

  constructor() {
    this.openGraph.applyBlogIndex();
  }
}
