import {ChangeDetectionStrategy, Component, Input, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {
  BlogPostListingComponent,
  type BlogPostListingAppearance,
} from '../../features/blog/components/post-listing/blog-post-listing.component';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';
import {postMatchesHubTerms} from './home-blog-section.utils';

@Component({
  selector: 'app-home-latest-writing-section',
  imports: [
    RouterLink,
    BlogPostListingComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="blog" class="site-section home-latest-section">
      <div class="site-section-header">
        <div>
          <h2 class="mt-3 heading-section">{{ heading }}</h2>
        </div>
        <a [routerLink]="['/', pathNames.BLOG]" class="btn-link">
          View all posts
        </a>
      </div>

      <app-blog-post-listing
        class="mt-8"
        [posts]="publishedPosts()"
        layout="grid"
        [headingLevel]="3"
        [loading]="!blogIsReady()"
        [error]="blogLoadError()"
        [appearanceByPostId]="appearanceByPostId()"
        [showTags]="false"
        emptyTitle="No published posts yet"
        emptyMessage="New writing will appear here as it becomes available."
        [regionLabel]="heading"
      ></app-blog-post-listing>
    </section>
  `,
})
export class HomeLatestWritingSectionComponent {
  @Input() heading = 'Latest writing';
  @Input() startIndex = 0;
  @Input() maxPosts = 3;
  @Input() featuredFirst = true;

  private readonly blogPostFeed = inject(HomeBlogPostFeedService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = this.blogPostFeed.publishedPosts;
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly publishedPosts = computed(() => {
    const posts = this.allPublishedPosts()
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
