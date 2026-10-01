import {Routes} from '@angular/router';

import {HOMEPAGE_OG_IMAGE, createSiteTitle} from '../../shared/seo/seo.metadata';

export const seasonalRoutes: Routes = [
  {
    path: 'archive/seasons',
    pathMatch: 'full',
    data: {seo: {
      title: createSiteTitle('Seasonal archive'),
      description: 'Small seasons. Small wonders. More reasons to explore.',
      path: '/archive/seasons', image: HOMEPAGE_OG_IMAGE, imageAlt: 'ColinMichaels.com seasonal archive', type: 'website', robots: 'noindex,follow',
    }},
    loadComponent: () => import('./pages/seasonal-archive.component').then(m => m.SeasonalArchiveComponent),
  },
  {
    path: 'archive/seasons/:id',
    loadComponent: () => import('./pages/seasonal-edition.component').then(m => m.SeasonalEditionComponent),
  },
];
