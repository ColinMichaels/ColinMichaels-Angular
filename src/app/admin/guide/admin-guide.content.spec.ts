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
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'raw json').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'raw json')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'nested checklist').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'step sequence ordered list').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'step sequence')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'tab shift tab nested list').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'unsupported block')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'reload remote revision').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'recovery conflict')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'production preview reduced motion').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'unsaved preview')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'markdown heading table of contents').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'repeated title heading')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'wide image layout').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'lightbox focus escape').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'wide image layout')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'trusted publishing idempotent retry').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'image signature responsive variants').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'canonical media deletion reference check').map(entry => entry.id))
      .toEqual(['upload-and-reuse-media']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'canonical media deletion')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'trusted publishing')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'image signature')).toEqual([]);
  });

  it('never returns a role-restricted match to an unauthorized user', () => {
    const manageUsers = ADMIN_GUIDE_ENTRIES.find(entry => entry.id === 'manage-user-roles');

    expect(manageUsers).toBeDefined();
    expect(canViewAdminGuideEntry(manageUsers!, ['cmsAdmin'])).toBeFalse();
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['cmsAdmin'], 'user roles')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['cmsAdmin'], 'view as user')).toEqual([]);
  });
});
