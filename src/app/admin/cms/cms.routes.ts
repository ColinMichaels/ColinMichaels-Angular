import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {HOMEPAGE_CMS_SEO_METADATA, MEDIA_LIBRARY_SEO_METADATA} from '../../shared/seo/seo.metadata';
import {CMS_ACCESS_ROLES, MEDIA_LIBRARY_ACCESS_ROLES} from '../../shared/user-account/user-account.model';

export const cmsRoutes: Routes = [
  {
    path: PATH_NAMES.ADMIN_CMS,
    data: {roles: CMS_ACCESS_ROLES},
    loadComponent: () => import('./pages/post-list/post-list.component').then(m => m.CmsPostListComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`,
    data: {roles: MEDIA_LIBRARY_ACCESS_ROLES, seo: MEDIA_LIBRARY_SEO_METADATA},
    loadComponent: () => import('../media-library/media-library-page.component').then(m => m.MediaLibraryPageComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_HOMEPAGE}`,
    data: {roles: CMS_ACCESS_ROLES, seo: HOMEPAGE_CMS_SEO_METADATA},
    loadComponent: () => import('./pages/homepage-hero/homepage-hero-manager.component').then(m => m.CmsHomepageHeroManagerComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_TOPICS}`,
    data: {roles: CMS_ACCESS_ROLES},
    loadComponent: () => import('./pages/topic-manager/topic-manager.component').then(m => m.CmsTopicManagerComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_RECOMMENDED_LINKS}`,
    data: {roles: CMS_ACCESS_ROLES},
    loadComponent: () => import('./pages/recommended-links/recommended-links-manager.component').then(m => m.CmsRecommendedLinksManagerComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/new`,
    data: {roles: CMS_ACCESS_ROLES},
    loadComponent: () => import('./pages/post-editor/post-editor.component').then(m => m.CmsPostEditorComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/:slug/edit`,
    data: {roles: CMS_ACCESS_ROLES},
    loadComponent: () => import('./pages/post-editor/post-editor.component').then(m => m.CmsPostEditorComponent),
  },
];
