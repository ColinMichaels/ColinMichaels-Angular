import {getAdminPageTitle} from './admin-navigation.config';

describe('getAdminPageTitle', () => {
  it('returns the active admin section for browser and shell titles', () => {
    expect(getAdminPageTitle('/admin')).toBe('Overview');
    expect(getAdminPageTitle('/admin/cms')).toBe('Posts');
    expect(getAdminPageTitle('/admin/cms/new')).toBe('New Post');
    expect(getAdminPageTitle('/admin/cms/example-post/edit')).toBe('Edit Post');
    expect(getAdminPageTitle('/admin/cms/calendar')).toBe('Calendar');
    expect(getAdminPageTitle('/admin/cms/social-connections')).toBe('Social Connections');
    expect(getAdminPageTitle('/admin/cms/media-library')).toBe('Media Library');
    expect(getAdminPageTitle('/admin/users')).toBe('Users');
  });

  it('ignores query strings and fragments when resolving a section', () => {
    expect(getAdminPageTitle('/admin/cms/example-post/edit?mode=preview#seo')).toBe('Edit Post');
  });
});
