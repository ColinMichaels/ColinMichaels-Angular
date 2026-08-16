import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {
  EDITORIAL_STANDARDS_SEO_METADATA,
  GADGET_USEFULNESS_SCORECARD_SEO_METADATA,
  HOME_SEO_METADATA,
  PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SEO_METADATA,
  PRIVACY_SEO_METADATA,
  SITE_SEARCH_SEO_METADATA,
} from '../../shared/seo/seo.metadata';
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
  {
    path: PATH_NAMES.EDITORIAL_STANDARDS,
    data: {seo: EDITORIAL_STANDARDS_SEO_METADATA},
    loadComponent: () => import('./pages/editorial-standards.component').then(m => m.EditorialStandardsComponent),
  },
  {
    path: `${PATH_NAMES.RESOURCES}/${PATH_NAMES.RESOURCE_GADGET_USEFULNESS_SCORECARD}`,
    data: {seo: GADGET_USEFULNESS_SCORECARD_SEO_METADATA},
    loadComponent: () => import('./pages/gadget-usefulness-scorecard.component')
      .then(m => m.GadgetUsefulnessScorecardComponent),
  },
  {
    path: `${PATH_NAMES.RESOURCES}/${PATH_NAMES.RESOURCE_PERSONAL_AIRCRAFT_BUYER_VERIFICATION}`,
    data: {seo: PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SEO_METADATA},
    loadComponent: () => import('./pages/personal-aircraft-buyer-verification.component')
      .then(m => m.PersonalAircraftBuyerVerificationComponent),
  },
  ...submissionRoutes,
  ...catCornerRoutes,
  ...authorRoutes,
  ...blogRoutes,
  ...topicRoutes,
];
