import {Routes} from '@angular/router';

import {PATH_NAMES} from '../app-route-paths';
import {AuthGuard} from '../guards/auth.guard';
import {cmsRoutes} from './cms/cms.routes';

export const adminRoutes: Routes = [
  {
    path: PATH_NAMES.ADMIN,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/admin-overview/admin-overview.component').then(m => m.AdminOverviewComponent),
      },
      ...cmsRoutes,
    ],
  },
];
