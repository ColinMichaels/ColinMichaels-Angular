import {Routes} from '@angular/router';

import {redirectGuard} from './guards/redirect.guard';
import {AuthGuard, redirectUnauthorizedTo, redirectLoggedInTo} from '@angular/fire/auth-guard';

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo([PATH_NAMES.OS_LOGIN]);
const redirectLoggedInToHome = () => redirectLoggedInTo([PATH_NAMES.OS_MAIN]);

export const PATH_NAMES = {
  OS_MAIN: 'os',
  OS_LOGIN: 'login',
  OS_BOOT: 'boot',
  OS_EXTERNAL: 'external',
  OS_SLEEP: 'sleep'
}
export const routes: Routes = [
  {
    path: '', loadComponent: () => import('./components/main/main.component').then(m => m.MainComponent)
  },
  {
    path: PATH_NAMES.OS_MAIN,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    data: {authGuardPipe: redirectUnauthorizedToLogin, animation: 'DesktopWindow'},
    loadComponent: () => import('./components/game/desktop/desktop.component').then(m => m.DesktopComponent)
  },
  {
    path: `${PATH_NAMES.OS_MAIN}/:app`,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    data: {authGuardPipe: redirectUnauthorizedToLogin, animation: 'DesktopWindow'},
    loadComponent: () => import('./components/game/desktop/desktop.component').then(m => m.DesktopComponent),
  },
  {
    path: PATH_NAMES.OS_LOGIN,
    data: {authGuardPipe: redirectLoggedInToHome, animation: 'LoginWindow'},
    loadComponent: () => import('./components/game/system/login-screen/login-screen.component').then(m => m.LoginScreenComponent),
  },
  {
    path: PATH_NAMES.OS_SLEEP,
    loadComponent: () => import('./components/game/system/sleep-screen/sleep-screen.component').then(m => m.SleepScreenComponent),
    data: {animation: 'LoginWindow'}
  },
  {
    path: PATH_NAMES.OS_BOOT,
    loadComponent: () => import('./components/game/system/loading-screen/loading-screen.component').then(m => m.LoadingScreenComponent),
    data: { animation : 'LoginWindow'}
  },
  {
    path: `${PATH_NAMES.OS_EXTERNAL}/:externalUrl`,
    canActivate: [redirectGuard],
    loadComponent: () => import('./components/game/system/login-screen/login-screen.component').then(m => m.LoginScreenComponent)
  },
  { path: '**', loadComponent: ()=> import('./components/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
