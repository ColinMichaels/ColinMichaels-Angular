import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {MEDIA_LIBRARY_SEO_METADATA} from '../../shared/seo/seo.metadata';

export const cmsRoutes: Routes = [
  {
    path: PATH_NAMES.ADMIN_CMS,
    loadComponent: () => import('./pages/post-list/post-list.component').then(m => m.CmsPostListComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`,
    data: {seo: MEDIA_LIBRARY_SEO_METADATA},
    loadComponent: () => import('../media-library/media-library-page.component').then(m => m.MediaLibraryPageComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/new`,
    loadComponent: () => import('./pages/post-editor/post-editor.component').then(m => m.CmsPostEditorComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/:slug/edit`,
    loadComponent: () => import('./pages/post-editor/post-editor.component').then(m => m.CmsPostEditorComponent),
  },
];
