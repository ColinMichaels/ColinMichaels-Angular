import {Routes} from '@angular/router';

import {osRoutes} from './core-os/os.routes';
import {publicRoutes} from './features/public/public.routes';
import {labRoutes} from './labs/lab.routes';

export const routes: Routes = [
  ...publicRoutes,
  ...labRoutes,
  ...osRoutes,
  {
    path: '**',
    loadComponent: () => import('./components/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
];
