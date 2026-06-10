import {Routes} from '@angular/router';

import {blogRoutes} from '../blog/blog.routes';

export const publicRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../components/main/main.component').then(m => m.MainComponent),
  },
  ...blogRoutes,
];
