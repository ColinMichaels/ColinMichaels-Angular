import {Routes} from '@angular/router';

import {routes} from './app.routes';
import {PATH_NAMES} from './app-route-paths';
import {NOT_FOUND_SEO_METADATA} from './shared/seo/seo.metadata';

function routePaths(routeConfig: Routes): string[] {
  return routeConfig.map(route => route.path ?? '');
}

describe('routes', () => {
  it('preserves the root route order and appends new public/admin boundaries before OS routes', () => {
    expect(routePaths(routes)).toEqual([
      '',
      PATH_NAMES.SEARCH,
      PATH_NAMES.PRIVACY,
      PATH_NAMES.EDITORIAL_STANDARDS,
      `${PATH_NAMES.RESOURCES}/${PATH_NAMES.RESOURCE_GADGET_USEFULNESS_SCORECARD}`,
      `${PATH_NAMES.RESOURCES}/${PATH_NAMES.RESOURCE_PERSONAL_AIRCRAFT_BUYER_VERIFICATION}`,
      PATH_NAMES.CONTACT,
      PATH_NAMES.WRITE_FOR_US,
      PATH_NAMES.CAT_CORNER,
      PATH_NAMES.AUTHORS,
      `${PATH_NAMES.AUTHORS}/:slug`,
      PATH_NAMES.BLOG,
      `${PATH_NAMES.BLOG}/search`,
      `${PATH_NAMES.BLOG}/category/cat-corner`,
      `${PATH_NAMES.BLOG}/category/health`,
      `${PATH_NAMES.BLOG}/category/recovery`,
      `${PATH_NAMES.BLOG}/tag/recovery`,
      `${PATH_NAMES.BLOG}/tag/personal-growth`,
      `${PATH_NAMES.BLOG}/category/:category`,
      `${PATH_NAMES.BLOG}/tag/:tag`,
      `${PATH_NAMES.BLOG}/preview/:previewToken`,
      `${PATH_NAMES.BLOG}/:slug`,
      `${PATH_NAMES.TOPICS}/:slug`,
      PATH_NAMES.LABS,
      PATH_NAMES.FS_BACKGROUND,
      PATH_NAMES.ADMIN,
      PATH_NAMES.PROFILE,
      PATH_NAMES.LOGOUT,
      PATH_NAMES.OS_MAIN,
      `${PATH_NAMES.OS_MAIN}/:app`,
      PATH_NAMES.OS_DEVICE_REQUIRED,
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
      PATH_NAMES.ADMIN_SUBMISSIONS,
      PATH_NAMES.ADMIN_COMMENTS,
      PATH_NAMES.ADMIN_GUIDE,
      '',
    ]);

    expect(routePaths(guardedAdminRoutes?.children ?? [])).toEqual([
      '',
      PATH_NAMES.ADMIN_MEDIA_LIBRARY,
      PATH_NAMES.ADMIN_CMS,
      `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_CONTENT_OPERATIONS}`,
      `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_CALENDAR}`,
      `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_SOCIAL_CONNECTIONS}`,
      `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_AUTHORS}`,
      `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`,
      `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_HOMEPAGE}`,
      `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_DAILY_DISCOVERY}`,
      `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_TOPICS}`,
      `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_RECOMMENDED_LINKS}`,
      `${PATH_NAMES.ADMIN_CMS}/new`,
      `${PATH_NAMES.ADMIN_CMS}/:slug/edit`,
    ]);
  });

  it('keeps the wildcard route last', () => {
    expect(routes.at(-1)?.path).toBe('**');
    expect(routes.at(-1)?.data?.['seo']).toBe(NOT_FOUND_SEO_METADATA);
  });

  it('redirects legacy taxonomy routes before dynamic archive matching', () => {
    const redirects = new Map(
      routes
        .filter(route => route.path?.startsWith(`${PATH_NAMES.BLOG}/`) && route.redirectTo)
        .map(route => [route.path, route])
    );

    expect(redirects.get(`${PATH_NAMES.BLOG}/category/cat-corner`)?.redirectTo)
      .toBe(`${PATH_NAMES.BLOG}/category/cats-and-pets`);
    expect(redirects.get(`${PATH_NAMES.BLOG}/category/health`)?.redirectTo)
      .toBe(`${PATH_NAMES.BLOG}/category/health-and-recovery`);
    expect(redirects.get(`${PATH_NAMES.BLOG}/category/recovery`)?.redirectTo)
      .toBe(`${PATH_NAMES.BLOG}/category/health-and-recovery`);
    expect(redirects.get(`${PATH_NAMES.BLOG}/tag/recovery`)?.redirectTo)
      .toBe(`${PATH_NAMES.BLOG}/category/health-and-recovery`);
    expect(redirects.get(`${PATH_NAMES.BLOG}/tag/personal-growth`)?.redirectTo)
      .toBe(`${PATH_NAMES.BLOG}/category/personal-growth`);
    expect([...redirects.values()].every(route => route.pathMatch === 'full')).toBeTrue();
  });

  it('temporarily redirects the Labs route to the blog without deleting Labs code', () => {
    const labsRoute = routes.find(route => route.path === PATH_NAMES.LABS);

    expect(labsRoute?.redirectTo).toBe(PATH_NAMES.BLOG);
    expect(labsRoute?.pathMatch).toBe('prefix');
  });

  it('protects both interactive OS routes before their desktop component loads', () => {
    const osRoutes = routes.filter(route => route.path === PATH_NAMES.OS_MAIN || route.path === `${PATH_NAMES.OS_MAIN}/:app`);

    expect(osRoutes).toHaveSize(2);
    expect(osRoutes.every(route => route.canActivate?.length === 2)).toBeTrue();
    expect(routes.find(route => route.path === PATH_NAMES.OS_DEVICE_REQUIRED)?.canActivate).toBeUndefined();
  });

  it('keeps the home route from catching profile and admin paths', () => {
    expect(routes.find(route => route.path === '')?.pathMatch).toBe('full');
  });
});
