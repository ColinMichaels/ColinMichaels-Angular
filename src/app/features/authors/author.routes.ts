import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';

export const authorRoutes: Routes = [
  {
    path: `${PATH_NAMES.AUTHORS}/:slug`,
    loadComponent: () => import('./pages/author-page/author-page.component').then(m => m.AuthorPageComponent),
  },
];
