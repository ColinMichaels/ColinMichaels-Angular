import {Routes} from '@angular/router';

import {PATH_NAMES} from '../app-route-paths';

export const labRoutes: Routes = [
  {
    path: PATH_NAMES.LABS,
    loadComponent: () => import('./pages/labs-index/labs-index.component').then(m => m.LabsIndexComponent),
  },
  {
    path: PATH_NAMES.FS_BACKGROUND,
    loadComponent: () => import('./pages/full-screen-background-lab/full-screen-background-lab.component').then(m => m.FullScreenBackgroundLabComponent),
  },
];
