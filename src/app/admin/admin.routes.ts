import {Routes} from '@angular/router';

import {PATH_NAMES} from '../app-route-paths';
import {AdminAuthGuard} from '../guards/admin-auth.guard';
import {cmsRoutes} from './cms/cms.routes';

export const adminRoutes: Routes = [
  {
    path: PATH_NAMES.ADMIN,
    children: [
      {
        path: PATH_NAMES.ADMIN_ACCESS_DENIED,
        loadComponent: () => import('./pages/admin-access-denied/admin-access-denied.component').then(m => m.AdminAccessDeniedComponent),
      },
      {
        path: '',
        canActivateChild: [AdminAuthGuard],
        data: {roles: ['admin', 'cmsAdmin']},
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./pages/admin-overview/admin-overview.component').then(m => m.AdminOverviewComponent),
          },
          {
            path: PATH_NAMES.ADMIN_MEDIA_LIBRARY,
            redirectTo: `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`,
            pathMatch: 'full',
          },
          ...cmsRoutes,
        ],
      },
    ],
  },
];
