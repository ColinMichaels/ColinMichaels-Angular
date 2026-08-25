import {
  CmsPostRecoverySnapshot,
  CmsPostRecoveryWrite,
  createCmsPostRecoveryContentHash
} from '../models/post-recovery.model';
import {createCmsPostRecoveryDocumentId, isCmsPostRecoveryWriteUnchanged} from './post-recovery.service';

describe('CmsPostRecoveryService document identity', () => {
  it('encodes imported post IDs so they remain one Firestore document segment', () => {
    expect(createCmsPostRecoveryDocumentId('post/with unsafe segments')).toBe('post%2Fwith%20unsafe%20segments');
  });
});

describe('CmsPostRecoveryService write suppression', () => {
  const write: CmsPostRecoveryWrite = {
    postId: 'post-1',
    postSlug: 'post-1',
    isNewPost: false,
    baseRevision: 3,
    baseUpdatedAt: '2026-08-24T12:00:00.000Z',
    form: {
      authorId: 'colin-michaels',
      title: 'Recovery post',
      slug: 'post-1',
      excerpt: 'Recovery excerpt',
      coverImage: '/cover.webp',
      backgroundImage: '',
      featured: false,
      catCornerEnabled: false,
      catCornerDiscoveryPost: false,
      status: 'draft',
      publishedAt: '',
      categories: 'Projects',
      tags: 'Recovery',
      seoTitle: 'Recovery post',
      seoDescription: 'Recovery excerpt',
      canonical: '',
      openGraphImage: '',
    },
    editor: {mode: 'visual', document: {blocks: []}},
    socialPromotion: {announcements: []},
  };
  const cachedRecovery: CmsPostRecoverySnapshot = {
    ...write,
    schemaVersion: 1,
    ownerUid: 'owner-1',
    savedAt: '2026-08-24T12:01:00.000Z',
    expiresAt: '2026-09-23T12:01:00.000Z',
    contentHash: createCmsPostRecoveryContentHash(write),
  };

  it('reuses an owned snapshot only when the complete recovery content is unchanged', () => {
    expect(isCmsPostRecoveryWriteUnchanged(cachedRecovery, write, 'owner-1')).toBeTrue();
  });

  it('requires a write when content or ownership changes even if the stored hash matches', () => {
    expect(isCmsPostRecoveryWriteUnchanged(cachedRecovery, {
      ...write,
      form: {...write.form, title: 'Changed recovery post'},
    }, 'owner-1')).toBeFalse();
    expect(isCmsPostRecoveryWriteUnchanged(cachedRecovery, write, 'owner-2')).toBeFalse();
  });
});
