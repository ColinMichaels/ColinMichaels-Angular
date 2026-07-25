import {
  ADMIN_GUIDE_ENTRIES,
  canViewAdminGuideEntry,
  searchAdminGuideEntries,
} from './admin-guide.content';

describe('admin guide content', () => {
  it('shows only entries allowed by the current role', () => {
    const viewerEntries = searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], '');
    const editorEntries = searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], '');
    const mediaEntries = searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], '');
    const adminEntries = searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], '');

    expect(viewerEntries.map(entry => entry.id)).toEqual(['find-your-way-around']);
    expect(editorEntries.some(entry => entry.id === 'create-and-publish-a-post')).toBeTrue();
    expect(editorEntries.some(entry => entry.id === 'upload-and-reuse-media')).toBeFalse();
    expect(mediaEntries.map(entry => entry.id)).toEqual(['find-your-way-around', 'upload-and-reuse-media']);
    expect(adminEntries.length).toBe(ADMIN_GUIDE_ENTRIES.length);
  });

  it('searches titles, summaries, keywords, steps, and links with all query tokens', () => {
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], 'future publish').map(entry => entry.id))
      .toContain('schedule-a-release');
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], 'least privilege').map(entry => entry.id))
      .toEqual(['manage-user-roles']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], 'view as user').map(entry => entry.id))
      .toEqual(['manage-user-roles']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], 'Open Media Library').map(entry => entry.id))
      .toContain('upload-and-reuse-media');
  });

  it('never returns a role-restricted match to an unauthorized user', () => {
    const manageUsers = ADMIN_GUIDE_ENTRIES.find(entry => entry.id === 'manage-user-roles');

    expect(manageUsers).toBeDefined();
    expect(canViewAdminGuideEntry(manageUsers!, ['cmsAdmin'])).toBeFalse();
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['cmsAdmin'], 'user roles')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['cmsAdmin'], 'view as user')).toEqual([]);
  });
});
