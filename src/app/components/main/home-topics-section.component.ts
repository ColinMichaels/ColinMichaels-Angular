import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogRepositoryService} from '../../features/blog/services/blog-repository.service';
import {TopicKnowledgeMapComponent} from '../../features/topics/components/topic-knowledge-map/topic-knowledge-map.component';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import {postMatchesHubTerms} from './home-blog-section.utils';

@Component({
  selector: 'app-home-topics-section',
  imports: [
    TopicKnowledgeMapComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-topic-knowledge-map
      [topics]="topicHubCards()"
      [topicsPath]="pathNames.TOPICS"
    ></app-topic-knowledge-map>
  `,
})
export class HomeTopicsSectionComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = toSignal(
    this.blogRepository.getPublishedPosts$(),
    {initialValue: []}
  );
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
