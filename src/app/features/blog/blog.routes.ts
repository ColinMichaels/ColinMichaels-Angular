import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BLOG_INDEX_SEO_METADATA} from '../../shared/seo/seo.metadata';

export const blogRoutes: Routes = [
  {
    path: PATH_NAMES.BLOG,
    data: {seo: BLOG_INDEX_SEO_METADATA},
    loadComponent: () => import('./pages/blog-index/blog-index.component').then(m => m.BlogIndexComponent),
  },
  {
    path: `${PATH_NAMES.BLOG}/category/:category`,
    loadComponent: () => import('./pages/blog-category/blog-category.component').then(m => m.BlogCategoryComponent),
  },
  {
    path: `${PATH_NAMES.BLOG}/:slug`,
    loadComponent: () => import('./pages/blog-detail/blog-detail.component').then(m => m.BlogDetailComponent),
  },
];
