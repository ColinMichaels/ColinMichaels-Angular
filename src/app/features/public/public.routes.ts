import {Routes} from '@angular/router';

import {HOME_SEO_METADATA} from '../../shared/seo/seo.metadata';
import {blogRoutes} from '../blog/blog.routes';

export const publicRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: {seo: HOME_SEO_METADATA},
    loadComponent: () => import('../../components/main/main.component').then(m => m.MainComponent),
  },
  ...blogRoutes,
];
