import {CMS_ACCESS_ROLES} from '../../shared/user-account/user-account.model';
import {cmsRoutes} from './cms.routes';

describe('CMS routes', () => {
  it('protects the Daily Discovery editor with the shared CMS role group', () => {
    const route = cmsRoutes.find(candidate => candidate.path === 'cms/daily-discovery');

    expect(route).toBeDefined();
    expect(route?.data?.['roles']).toBe(CMS_ACCESS_ROLES);
    expect(route?.loadComponent).toBeDefined();
  });
});
