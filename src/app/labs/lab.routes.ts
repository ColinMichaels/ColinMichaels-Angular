import {Routes} from '@angular/router';

import {PATH_NAMES} from '../app-route-paths';
import {BACKGROUND_LAB_SEO_METADATA} from '../shared/seo/seo.metadata';

export const labRoutes: Routes = [
  {
    path: PATH_NAMES.LABS,
    pathMatch: 'prefix',
    redirectTo: PATH_NAMES.BLOG,
  },
  {
    path: PATH_NAMES.FS_BACKGROUND,
    data: {seo: BACKGROUND_LAB_SEO_METADATA},
    loadComponent: () => import('./pages/full-screen-background-lab/full-screen-background-lab.component').then(m => m.FullScreenBackgroundLabComponent),
  },
];
