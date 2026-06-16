import {Routes} from '@angular/router';

import {adminRoutes} from './admin/admin.routes';
import {PATH_NAMES} from './app-route-paths';
import {osRoutes} from './core-os/os.routes';
import {publicRoutes} from './features/public/public.routes';
import {labRoutes} from './labs/lab.routes';
import {FirebaseAuthGuard} from './guards/firebase-auth.guard';
import {LOGOUT_SEO_METADATA, PROFILE_SEO_METADATA} from './shared/seo/seo.metadata';

export const routes: Routes = [
  ...publicRoutes,
  ...labRoutes,
  ...adminRoutes,
  {
    path: PATH_NAMES.PROFILE,
    canActivate: [FirebaseAuthGuard],
    data: {seo: PROFILE_SEO_METADATA},
    loadComponent: () => import('./shared/user-profile/user-profile.component').then(m => m.UserProfileComponent),
  },
  {
    path: PATH_NAMES.LOGOUT,
    data: {seo: LOGOUT_SEO_METADATA},
    loadComponent: () => import('./shared/logout/logout.component').then(m => m.LogoutComponent),
  },
  ...osRoutes,
  {
    path: '**',
    loadComponent: () => import('./shared/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
];
