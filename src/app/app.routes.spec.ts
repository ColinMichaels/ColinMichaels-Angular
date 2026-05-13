import {Routes} from '@angular/router';

import {routes} from './app.routes';

function collectPaths(routeConfig: Routes): string[] {
  return routeConfig.flatMap(route => {
    const currentPath = route.path ?? '';
    const childPaths = route.children ? collectPaths(route.children).map(path => `${currentPath}/${path}`) : [];

    return [currentPath, ...childPaths];
  });
}

describe('routes', () => {
  it('preserves the existing public route paths', () => {
    expect(collectPaths(routes)).toEqual([
      '',
      'background',
      'os',
      'os/:app',
      'login',
      'sleep',
      'boot',
      'external/:externalUrl',
      '**',
    ]);
  });

  it('keeps the wildcard route last', () => {
    expect(routes.at(-1)?.path).toBe('**');
  });
});
