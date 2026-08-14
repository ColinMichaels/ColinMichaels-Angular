import {ChangeDetectionStrategy, Component, Input, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {
  BlogPostListingComponent,
  type BlogPostListingAppearance,
} from '../../features/blog/components/post-listing/blog-post-listing.component';
import {ContinueReadingShelfComponent} from '../../features/blog/components/continue-reading-shelf.component';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';
import {postMatchesHubTerms} from './home-blog-section.utils';

@Component({
  selector: 'app-home-latest-writing-section',
  imports: [
    RouterLink,
    BlogPostListingComponent,
    ContinueReadingShelfComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="blog" class="home-latest-section" aria-labelledby="home-latest-heading">
      <div class="home-latest-section__header">
        <div>
          <h2 id="home-latest-heading">{{ heading }}</h2>
          <p>Fresh perspectives on technology, creativity, recovery, and everyday life.</p>
        </div>
        <a [routerLink]="['/', pathNames.BLOG]" class="btn-link">
          Explore all articles
        </a>
      </div>

      <div class="home-latest-section__content">
        <app-blog-post-listing
          [posts]="publishedPosts()"
          layout="editorial"
          [headingLevel]="3"
          [loading]="!blogIsReady()"
          [error]="blogLoadError()"
          [appearanceByPostId]="appearanceByPostId()"
          [showTags]="false"
          [showReadLink]="true"
          readLinkLabel="Read the story"
          [excerptLineClamp]="3"
          emptyTitle="No published posts yet"
          emptyMessage="New writing will appear here as it becomes available."
          [regionLabel]="heading"
        ></app-blog-post-listing>

        <app-continue-reading-shelf surface="homeEditorial" [maxRecords]="1"/>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .home-latest-section {
      width: min(100%, 92rem);
      margin-inline: auto;
      padding: clamp(3.25rem, 6vw, 5.5rem) clamp(1rem, 4vw, 3rem);
    }

    .home-latest-section__header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1.5rem;
      margin-bottom: clamp(1.5rem, 3vw, 2.25rem);
    }

    .home-latest-section h2 {
      margin: 0;
      color: var(--site-heading);
      font-family: var(--font-editorial, Georgia, 'Times New Roman', serif);
      font-size: clamp(2.5rem, 3.4vw, 3.5rem);
      font-weight: 500;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    .home-latest-section__header p {
      max-width: 44rem;
      margin: 0.65rem 0 0;
      color: var(--site-muted);
      font-size: clamp(1rem, 1.3vw, 1.15rem);
      line-height: 1.55;
    }

    .home-latest-section__content {
      display: grid;
      gap: clamp(1.5rem, 3vw, 2rem);
      align-items: start;
    }

    app-continue-reading-shelf.is-empty {
      display: none;
    }

    @media (max-width: 39.99rem) {
      .home-latest-section__header {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `],
})
export class HomeLatestWritingSectionComponent {
  @Input() heading = 'More to read';
  @Input() startIndex = 0;
  @Input() maxPosts = 3;
  @Input() featuredFirst = true;
  @Input() excludePostId: string | null = null;

  private readonly blogPostFeed = inject(HomeBlogPostFeedService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = this.blogPostFeed.publishedPosts;
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly publishedPosts = computed(() => {
    const posts = this.allPublishedPosts()
      .filter(post => !this.excludePostId || post.id !== this.excludePostId)
      .slice(Math.max(0, this.startIndex));
    const featuredPost = posts.find(post => post.featured);
    const maxPosts = Math.max(0, this.maxPosts);

    if (!this.featuredFirst || !featuredPost) {
      return posts.slice(0, maxPosts);
    }

    return [
      featuredPost,
      ...posts.filter(post => post.id !== featuredPost.id),
    ].slice(0, maxPosts);
  });
  protected readonly topicByPostId = computed(() => {
    const topics = this.topicHubs();

    return new Map(
      this.allPublishedPosts().map(post => [
        post.id,
        topics.find(topic => postMatchesHubTerms(post, topic.terms)) ?? null,
      ])
    );
  });
  protected readonly appearanceByPostId = computed(() => {
    const appearances: Record<string, BlogPostListingAppearance> = {};

    for (const [postId, topic] of this.topicByPostId()) {
      if (!topic) {
        continue;
      }

      appearances[postId] = {
        label: topic.theme.shortLabel,
        accent: topic.theme.accent,
        accentStrong: topic.theme.accentStrong,
        accentRgb: topic.theme.accentRgb,
      };
    }

    return appearances;
  });
  protected readonly blogIsReady = this.blogPostFeed.isReady;
  protected readonly blogLoadError = this.blogPostFeed.loadError;
  protected readonly pathNames = PATH_NAMES;

}
