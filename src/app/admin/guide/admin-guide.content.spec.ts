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
    expect(editorEntries.some(entry => entry.id === 'review-article-evidence')).toBeTrue();
    expect(editorEntries.some(entry => entry.id === 'review-public-submissions')).toBeTrue();
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
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], 'fake email disable').map(entry => entry.id))
      .toEqual(['manage-user-roles']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], 'delete auth user').map(entry => entry.id))
      .toEqual(['manage-user-roles']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], 'remove point balance').map(entry => entry.id))
      .toEqual(['manage-user-points']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], 'points leaderboard comments sort').map(entry => entry.id))
      .toEqual(['manage-user-points']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], 'Open Media Library').map(entry => entry.id))
      .toContain('upload-and-reuse-media');
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'raw json').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'raw json')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'portable package image manifest').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'portable package image manifest')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'portable package image manifest')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'package progress processing media').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'package progress processing media')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'package progress processing media')).toEqual([]);
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
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'slideshow grid mosaic').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'multi image gallery')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'slideshow gallery')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'wide image layout')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'youtube companion watch next').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'video upload date runtime structured data').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'youtube companion watch next')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'video upload date runtime structured data')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'exact video pairing')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'discovery trust checklist').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post', 'review-article-evidence']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'usable references supporting evidence').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'published needs classification').map(entry => entry.id))
      .toEqual(['review-article-evidence']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'published discovery gaps required advisory').map(entry => entry.id))
      .toEqual(['review-article-evidence']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'required advisory source links').map(entry => entry.id))
      .toEqual(['review-article-evidence']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'legacy block json metadata only').map(entry => entry.id))
      .toEqual(['review-article-evidence']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'evidence-only action reports stale overwrite newer').map(entry => entry.id))
      .toEqual(['review-article-evidence']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'published needs classification')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'legacy block json metadata only')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'save evidence only')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'save evidence only')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'published discovery gaps required advisory')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'evidence review queue')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'discovery trust review queue')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'contextual next read')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'external source links')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'trusted publishing idempotent retry').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'image signature responsive variants').map(entry => entry.id))
      .toEqual(['create-and-publish-a-post']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'canonical media deletion reference check').map(entry => entry.id))
      .toEqual(['upload-and-reuse-media']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'canonical media deletion')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'deleted quick filter restore media').map(entry => entry.id))
      .toEqual(['upload-and-reuse-media']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'deleted quick filter restore media')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'trusted publishing')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'image signature')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'contact author inbox').map(entry => entry.id))
      .toEqual(['review-public-submissions']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'email alert smtp')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'duplicate action saving moderation change').map(entry => entry.id))
      .toEqual(['moderate-comments']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'deleted queue retained restore').map(entry => entry.id))
      .toEqual(['moderate-comments']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'duplicate action saving moderation change')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'duplicate action saving moderation change')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'daily discovery json upload').map(entry => entry.id))
      .toContain('manage-daily-discovery-question-sets');
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'daily discovery')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['mediaManager'], 'daily discovery')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'load existing validate draft').map(entry => entry.id))
      .toContain('manage-daily-discovery-question-sets');
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'reader preview no points').map(entry => entry.id))
      .toContain('manage-daily-discovery-question-sets');
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'reader preview no points')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'editorial image static fallback').map(entry => entry.id))
      .toEqual(['update-the-homepage-hero']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'editorial image static fallback')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'post image placeholder').map(entry => entry.id))
      .toEqual(['update-the-homepage-hero']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'post image placeholder')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['contentEditor'], 'blurred backdrop image panel').map(entry => entry.id))
      .toEqual(['update-the-homepage-hero']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['viewer'], 'blurred backdrop image panel')).toEqual([]);
  });

  it('never returns a role-restricted match to an unauthorized user', () => {
    const manageUsers = ADMIN_GUIDE_ENTRIES.find(entry => entry.id === 'manage-user-roles');
    const managePoints = ADMIN_GUIDE_ENTRIES.find(entry => entry.id === 'manage-user-points');

    expect(manageUsers).toBeDefined();
    expect(managePoints).toBeDefined();
    expect(canViewAdminGuideEntry(manageUsers!, ['cmsAdmin'])).toBeFalse();
    expect(canViewAdminGuideEntry(managePoints!, ['cmsAdmin'])).toBeFalse();
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['cmsAdmin'], 'user roles')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['cmsAdmin'], 'view as user')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['admin'], 'keyboard tabs focus restoration').map(entry => entry.id))
      .toEqual(['manage-user-roles']);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['cmsAdmin'], 'keyboard tabs focus restoration')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['cmsAdmin'], 'delete auth user')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['cmsAdmin'], 'add user points')).toEqual([]);
    expect(searchAdminGuideEntries(ADMIN_GUIDE_ENTRIES, ['cmsAdmin'], 'points leaderboard')).toEqual([]);

    const dailyDiscovery = ADMIN_GUIDE_ENTRIES.find(
      entry => entry.id === 'manage-daily-discovery-question-sets'
    );

    expect(dailyDiscovery).toBeDefined();
    expect(dailyDiscovery?.links[0].route).toBe('/admin/cms/daily-discovery');
    expect(canViewAdminGuideEntry(dailyDiscovery!, ['contentEditor'])).toBeTrue();
    expect(canViewAdminGuideEntry(dailyDiscovery!, ['viewer'])).toBeFalse();

    const homepageFeature = ADMIN_GUIDE_ENTRIES.find(entry => entry.id === 'update-the-homepage-hero');

    expect(homepageFeature).toBeDefined();
    expect(homepageFeature?.links[0].route).toBe('/admin/cms/homepage');
    expect(canViewAdminGuideEntry(homepageFeature!, ['contentEditor'])).toBeTrue();
    expect(canViewAdminGuideEntry(homepageFeature!, ['viewer'])).toBeFalse();

    const articleEvidence = ADMIN_GUIDE_ENTRIES.find(entry => entry.id === 'review-article-evidence');

    expect(articleEvidence).toBeDefined();
    expect(articleEvidence?.links[0].route).toBe('/admin/cms');
    expect(canViewAdminGuideEntry(articleEvidence!, ['contentEditor'])).toBeTrue();
    expect(canViewAdminGuideEntry(articleEvidence!, ['viewer'])).toBeFalse();
  });
});
