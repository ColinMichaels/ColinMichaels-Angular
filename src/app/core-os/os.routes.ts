import {Routes} from '@angular/router';

import {AuthGuard} from '../guards/auth.guard';
import {redirectGuard} from '../guards/redirect.guard';
import {PATH_NAMES} from '../app-route-paths';
import {osDeviceGuard} from './guards/os-device.guard';
import {LOGIN_SEO_METADATA, OS_DEVICE_REQUIRED_SEO_METADATA} from '../shared/seo/seo.metadata';

export const osRoutes: Routes = [
  {
    path: PATH_NAMES.OS_MAIN,
    pathMatch: 'full',
    canActivate: [osDeviceGuard, AuthGuard],
    data: {animation: 'DesktopWindow'},
    loadComponent: () => import('../components/game/desktop/desktop.component').then(m => m.DesktopComponent),
  },
  {
    path: `${PATH_NAMES.OS_MAIN}/:app`,
    pathMatch: 'full',
    canActivate: [osDeviceGuard, AuthGuard],
    data: {animation: 'DesktopWindow'},
    loadComponent: () => import('../components/game/desktop/desktop.component').then(m => m.DesktopComponent),
  },
  {
    path: PATH_NAMES.OS_DEVICE_REQUIRED,
    data: {seo: OS_DEVICE_REQUIRED_SEO_METADATA},
    loadComponent: () => import('./pages/os-device-required/os-device-required.component').then(m => m.OsDeviceRequiredComponent),
  },
  {
    path: PATH_NAMES.OS_LOGIN,
    data: {animation: 'LoginWindow', seo: LOGIN_SEO_METADATA},
    loadComponent: () => import('../components/game/system/login-screen/login-screen.component').then(m => m.LoginScreenComponent),
  },
  {
    path: PATH_NAMES.OS_SLEEP,
    loadComponent: () => import('../components/game/system/sleep-screen/sleep-screen.component').then(m => m.SleepScreenComponent),
    data: {animation: 'LoginWindow'},
  },
  {
    path: PATH_NAMES.OS_BOOT,
    loadComponent: () => import('../components/game/system/loading-screen/loading-screen.component').then(m => m.LoadingScreenComponent),
    data: {animation: 'LoginWindow'},
  },
  {
    path: `${PATH_NAMES.OS_EXTERNAL}/:externalUrl`,
    canActivate: [redirectGuard],
    loadComponent: () => import('../components/game/system/login-screen/login-screen.component').then(m => m.LoginScreenComponent),
  },
];
