import {Routes} from '@angular/router';
import {AuthGuard} from './guards/auth.guard';
import {redirectGuard} from './guards/redirect.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'home', loadComponent: ()=> import('./components/main/main.component').then(m => m.MainComponent)
  },
  {
    path: 'colinos',
    pathMatch: 'full',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/game/desktop/desktop.component').then(m => m.DesktopComponent)
  },
  {
    path: 'colinos/:app',
    pathMatch: 'full',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/game/desktop/desktop.component').then(m => m.DesktopComponent),
    data: { animation : 'DesktopWindow'}
  },
  {
    path: 'login',
    loadComponent: () => import('./components/game/system/login-screen/login-screen.component').then(m => m.LoginScreenComponent),
    data: { animation : 'LoginWindow'}
  },
  {
    path: 'boot',
    loadComponent: () => import('./components/game/system/loading-screen/loading-screen.component').then(m => m.LoadingScreenComponent),
    data: { animation : 'LoginWindow'}
  },
  {
    path: 'external/:externalUrl',
    canActivate: [redirectGuard],
    loadComponent: () => import('./components/game/system/login-screen/login-screen.component').then(m => m.LoginScreenComponent)
  },
  { path: '**', loadComponent: ()=> import('./components/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
