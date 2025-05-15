import {Routes} from '@angular/router';
import {AuthGuard} from './guards/auth.guard';

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
    loadComponent: () => import('./components/game/desktop/desktop.component').then(m => m.DesktopComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/game/system/login-screen/login-screen.component').then(m => m.LoginScreenComponent)
  },
  { path: '**', loadComponent: ()=> import('./components/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
