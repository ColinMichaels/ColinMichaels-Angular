import {Routes} from '@angular/router';

export const publicRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../components/main/main.component').then(m => m.MainComponent),
  },
];
