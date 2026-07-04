import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';

export const topicRoutes: Routes = [{
  path: `${PATH_NAMES.TOPICS}/:slug`,
  loadComponent: () => import('./topic-hub.component').then(m => m.TopicHubComponent),
}];
