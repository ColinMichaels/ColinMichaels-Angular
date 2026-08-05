import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {HOME_SEO_METADATA, PRIVACY_SEO_METADATA, SITE_SEARCH_SEO_METADATA} from '../../shared/seo/seo.metadata';
import {blogRoutes} from '../blog/blog.routes';
import {catCornerRoutes} from '../cat-corner/cat-corner.routes';
import {topicRoutes} from '../topics/topic.routes';
import {authorRoutes} from '../authors/author.routes';
import {submissionRoutes} from '../submissions/submission.routes';

export const publicRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: {seo: HOME_SEO_METADATA},
    loadComponent: () => import('../../components/main/main.component').then(m => m.MainComponent),
  },
  {
    path: PATH_NAMES.SEARCH,
    data: {seo: SITE_SEARCH_SEO_METADATA},
    loadComponent: () => import('../search/pages/site-search-page.component').then(m => m.SiteSearchPageComponent),
  },
  {
    path: PATH_NAMES.PRIVACY,
    data: {seo: PRIVACY_SEO_METADATA},
    loadComponent: () => import('./pages/privacy-policy.component').then(m => m.PrivacyPolicyComponent),
  },
  ...submissionRoutes,
  ...catCornerRoutes,
  ...authorRoutes,
  ...blogRoutes,
  ...topicRoutes,
];
