import {Routes, UrlSegment} from '@angular/router';

//Custom UrlMatcher function
export function patternMatcher(segments: UrlSegment[]): { consumed: UrlSegment[], posParams?: { [key: string]: UrlSegment } } | null {
  if (segments.length >= 2 && segments[0].path === 'leet' && /^\d+$/.test(segments[1].path)) {
    return {
      consumed: segments.slice(0, 2),
      posParams: {
        id: segments[1]
      }
    };
  }
  return null;
}

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'leet', pathMatch: 'full', loadComponent: () => import('./components/game/desktop/desktop.component').then(m => m.DesktopComponent) },
  {path: 'home', loadComponent: ()=> import('./components/main/main.component').then(m => m.MainComponent) },
  { path: '**', redirectTo: '/home' }
];
