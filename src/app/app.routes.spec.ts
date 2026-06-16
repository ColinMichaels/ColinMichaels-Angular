import {Routes} from '@angular/router';

import {routes} from './app.routes';
import {PATH_NAMES} from './app-route-paths';

function routePaths(routeConfig: Routes): string[] {
  return routeConfig.map(route => route.path ?? '');
}

describe('routes', () => {
  it('preserves the root route order and appends new public/admin boundaries before OS routes', () => {
    expect(routePaths(routes)).toEqual([
      '',
      PATH_NAMES.BLOG,
      `${PATH_NAMES.BLOG}/search`,
      `${PATH_NAMES.BLOG}/category/:category`,
      `${PATH_NAMES.BLOG}/tag/:tag`,
      `${PATH_NAMES.BLOG}/preview/:previewToken`,
      `${PATH_NAMES.BLOG}/:slug`,
      PATH_NAMES.LABS,
      PATH_NAMES.FS_BACKGROUND,
      PATH_NAMES.ADMIN,
      PATH_NAMES.PROFILE,
      PATH_NAMES.LOGOUT,
      PATH_NAMES.OS_MAIN,
      `${PATH_NAMES.OS_MAIN}/:app`,
      PATH_NAMES.OS_LOGIN,
      PATH_NAMES.OS_SLEEP,
      PATH_NAMES.OS_BOOT,
      `${PATH_NAMES.OS_EXTERNAL}/:externalUrl`,
      '**',
    ]);
  });

  it('keeps admin child routes scoped under the admin boundary', () => {
    const adminRoute = routes.find(route => route.path === PATH_NAMES.ADMIN);
    const guardedAdminRoutes = adminRoute?.children?.find(route => route.path === '');

    expect(routePaths(adminRoute?.children ?? [])).toEqual([
      PATH_NAMES.ADMIN_ACCESS_DENIED,
      PATH_NAMES.ADMIN_USERS,
      '',
    ]);

    expect(routePaths(guardedAdminRoutes?.children ?? [])).toEqual([
      '',
      PATH_NAMES.ADMIN_MEDIA_LIBRARY,
      PATH_NAMES.ADMIN_CMS,
      `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`,
      `${PATH_NAMES.ADMIN_CMS}/new`,
      `${PATH_NAMES.ADMIN_CMS}/:slug/edit`,
    ]);
  });

  it('keeps the wildcard route last', () => {
    expect(routes.at(-1)?.path).toBe('**');
  });

  it('keeps the home route from catching profile and admin paths', () => {
    expect(routes.find(route => route.path === '')?.pathMatch).toBe('full');
  });
});
