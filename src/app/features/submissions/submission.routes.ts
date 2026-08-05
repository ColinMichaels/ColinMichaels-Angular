import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {
  CONTACT_SEO_METADATA,
  WRITE_FOR_US_SEO_METADATA,
} from '../../shared/seo/seo.metadata';

export const submissionRoutes: Routes = [
  {
    path: PATH_NAMES.CONTACT,
    data: {
      seo: CONTACT_SEO_METADATA,
      submissionType: 'contact',
    },
    loadComponent: () => import('./pages/public-submission-page.component')
      .then(m => m.PublicSubmissionPageComponent),
  },
  {
    path: PATH_NAMES.WRITE_FOR_US,
    data: {
      seo: WRITE_FOR_US_SEO_METADATA,
      submissionType: 'author-pitch',
    },
    loadComponent: () => import('./pages/public-submission-page.component')
      .then(m => m.PublicSubmissionPageComponent),
  },
];
