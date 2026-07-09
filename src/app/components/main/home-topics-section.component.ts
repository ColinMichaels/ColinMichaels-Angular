import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';

import {PATH_NAMES} from '../../app-route-paths';
import {TopicKnowledgeMapComponent} from '../../features/topics/components/topic-knowledge-map/topic-knowledge-map.component';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';
import {postMatchesHubTerms} from './home-blog-section.utils';

@Component({
  selector: 'app-home-topics-section',
  imports: [
    TopicKnowledgeMapComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-topic-knowledge-map
      [topics]="topicHubCards()"
      [topicsPath]="pathNames.TOPICS"
    ></app-topic-knowledge-map>
  `,
})
export class HomeTopicsSectionComponent {
  private readonly blogPostFeed = inject(HomeBlogPostFeedService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = this.blogPostFeed.publishedPosts;
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly topicHubCards = computed(() => (
    this.topicHubs().map(hub => ({
      ...hub,
      count: this.allPublishedPosts().filter(post => postMatchesHubTerms(post, hub.terms)).length,
    }))
  ));
  protected readonly pathNames = PATH_NAMES;
}
