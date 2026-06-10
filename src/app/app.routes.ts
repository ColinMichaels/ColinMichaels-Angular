import {Routes} from '@angular/router';

import {adminRoutes} from './admin/admin.routes';
import {osRoutes} from './core-os/os.routes';
import {publicRoutes} from './features/public/public.routes';
import {labRoutes} from './labs/lab.routes';

export const routes: Routes = [
  ...publicRoutes,
  ...labRoutes,
  ...adminRoutes,
  ...osRoutes,
  {
    path: '**',
    loadComponent: () => import('./shared/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
];
