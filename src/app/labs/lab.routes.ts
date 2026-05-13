import {Routes} from '@angular/router';

import {PATH_NAMES} from '../app-route-paths';

export const labRoutes: Routes = [
  {
    path: PATH_NAMES.FS_BACKGROUND,
    loadComponent: () => import('../components/game/system/full-screen-background/background-example.component').then(m => m.BackgroundExampleComponent),
  },
];
