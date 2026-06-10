import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';

export const cmsRoutes: Routes = [
  {
    path: PATH_NAMES.ADMIN_CMS,
    loadComponent: () => import('./pages/post-list/post-list.component').then(m => m.CmsPostListComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`,
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
