import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BLOG_INDEX_SEO_METADATA, BLOG_SEARCH_SEO_METADATA} from '../../shared/seo/seo.metadata';

export const blogRoutes: Routes = [
  {
    path: PATH_NAMES.BLOG,
    data: {seo: BLOG_INDEX_SEO_METADATA},
    loadComponent: () => import('./pages/blog-index/blog-index.component').then(m => m.BlogIndexComponent),
  },
  {
    path: `${PATH_NAMES.BLOG}/search`,
    data: {seo: BLOG_SEARCH_SEO_METADATA},
    loadComponent: () => import('../search/pages/site-search-page.component').then(m => m.SiteSearchPageComponent),
  },
  {
    path: `${PATH_NAMES.BLOG}/category/cat-corner`,
    redirectTo: `${PATH_NAMES.BLOG}/category/cats-and-pets`,
    pathMatch: 'full',
  },
  {
    path: `${PATH_NAMES.BLOG}/category/health`,
    redirectTo: `${PATH_NAMES.BLOG}/category/health-and-recovery`,
    pathMatch: 'full',
  },
  {
    path: `${PATH_NAMES.BLOG}/category/recovery`,
    redirectTo: `${PATH_NAMES.BLOG}/category/health-and-recovery`,
    pathMatch: 'full',
  },
  {
    path: `${PATH_NAMES.BLOG}/tag/recovery`,
    redirectTo: `${PATH_NAMES.BLOG}/category/health-and-recovery`,
    pathMatch: 'full',
  },
  {
    path: `${PATH_NAMES.BLOG}/tag/personal-growth`,
    redirectTo: `${PATH_NAMES.BLOG}/category/personal-growth`,
    pathMatch: 'full',
  },
  {
    path: `${PATH_NAMES.BLOG}/category/:category`,
    loadComponent: () => import('./pages/blog-category/blog-category.component').then(m => m.BlogCategoryComponent),
  },
  {
    path: `${PATH_NAMES.BLOG}/tag/:tag`,
    loadComponent: () => import('./pages/blog-tag/blog-tag.component').then(m => m.BlogTagComponent),
  },
  {
    path: `${PATH_NAMES.BLOG}/preview/:previewToken`,
    loadComponent: () => import('./pages/blog-detail/blog-detail.component').then(m => m.BlogDetailComponent),
  },
  {
    path: `${PATH_NAMES.BLOG}/:slug`,
    loadComponent: () => import('./pages/blog-detail/blog-detail.component').then(m => m.BlogDetailComponent),
  },
];
