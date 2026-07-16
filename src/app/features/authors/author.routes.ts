import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {AUTHORS_INDEX_SEO_METADATA} from '../../shared/seo/seo.metadata';

export const authorRoutes: Routes = [
  {
    path: PATH_NAMES.AUTHORS,
    pathMatch: 'full',
    data: {seo: AUTHORS_INDEX_SEO_METADATA},
    loadComponent: () => import('./pages/authors-index/authors-index.component').then(m => m.AuthorsIndexComponent),
  },
  {
    path: `${PATH_NAMES.AUTHORS}/:slug`,
    loadComponent: () => import('./pages/author-page/author-page.component').then(m => m.AuthorPageComponent),
  },
];
