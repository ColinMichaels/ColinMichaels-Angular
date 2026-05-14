import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';

export const blogRoutes: Routes = [
  {
    path: PATH_NAMES.BLOG,
    loadComponent: () => import('./pages/blog-index/blog-index.component').then(m => m.BlogIndexComponent),
  },
  {
    path: `${PATH_NAMES.BLOG}/:slug`,
    loadComponent: () => import('./pages/blog-detail/blog-detail.component').then(m => m.BlogDetailComponent),
  },
];
