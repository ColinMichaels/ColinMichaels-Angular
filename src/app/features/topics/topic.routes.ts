import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {createTopicHubSeoMetadata, TOPIC_HUBS} from './topic-hubs.data';

export const topicRoutes: Routes = TOPIC_HUBS.map(topicHub => ({
  path: `${PATH_NAMES.TOPICS}/${topicHub.slug}`,
  data: {
    hubSlug: topicHub.slug,
    seo: createTopicHubSeoMetadata(topicHub),
  },
  loadComponent: () => import('./topic-hub.component').then(m => m.TopicHubComponent),
}));
