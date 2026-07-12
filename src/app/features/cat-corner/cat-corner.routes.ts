import {Routes} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {FirebaseAuthGuard} from '../../guards/firebase-auth.guard';
import {
  CAT_CORNER_SEO_METADATA,
  CAT_CORNER_UNLOCK_SEO_METADATA,
} from '../../shared/seo/seo.metadata';
import {CatCornerAccessGuard} from './guards/cat-corner-access.guard';

export const catCornerRoutes: Routes = [
  {
    path: PATH_NAMES.CAT_CORNER,
    children: [
      {
        path: PATH_NAMES.CAT_CORNER_UNLOCK,
        canActivate: [FirebaseAuthGuard],
        data: {seo: CAT_CORNER_UNLOCK_SEO_METADATA},
        loadComponent: () => import('./pages/cat-corner-unlock.component').then(m => m.CatCornerUnlockComponent),
      },
      {
        path: '',
        pathMatch: 'full',
        canMatch: [CatCornerAccessGuard],
        data: {seo: CAT_CORNER_SEO_METADATA},
        loadComponent: () => import('./pages/cat-corner-hub.component').then(m => m.CatCornerHubComponent),
      },
      {
        path: '**',
        loadComponent: () => import('../../shared/not-found/not-found.component').then(m => m.NotFoundComponent),
      },
    ],
  },
];
