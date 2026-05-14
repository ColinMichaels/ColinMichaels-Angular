import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';

export const cmsRoutes: Routes = [
  {
    path: PATH_NAMES.ADMIN_CMS,
    loadComponent: () => import('./pages/post-list/post-list.component').then(m => m.CmsPostListComponent),
  },
  {
    path: `${PATH_NAMES.ADMIN_CMS}/:slug/edit`,
    loadComponent: () => import('./pages/post-editor/post-editor.component').then(m => m.CmsPostEditorComponent),
  },
];
