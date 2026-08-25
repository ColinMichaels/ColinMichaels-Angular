import {
  CMS_POST_RECOVERY_RETENTION_MS,
  CmsPostRecoverySnapshot,
  createCmsPostRecoveryContentHash,
  isCmsPostRecoveryExpired,
  isCmsPostRecoverySnapshot,
} from './post-recovery.model';

function createRecovery(overrides: Partial<CmsPostRecoverySnapshot> = {}): CmsPostRecoverySnapshot {
  return {
    schemaVersion: 1,
    ownerUid: 'editor-1',
    postId: 'post-1',
    postSlug: 'post-1',
    isNewPost: false,
    baseRevision: 4,
    baseUpdatedAt: '2026-08-03T12:00:00.000Z',
    savedAt: '2026-08-03T12:01:00.000Z',
    expiresAt: new Date(Date.parse('2026-08-03T12:01:00.000Z') + CMS_POST_RECOVERY_RETENTION_MS).toISOString(),
    contentHash: 'fnv1a-test',
    form: {
      authorId: 'colin-michaels',
      title: 'Recovery test',
      slug: 'recovery-test',
      excerpt: 'Recovery excerpt',
      coverImage: '/cover.webp',
      backgroundImage: '',
      featured: false,
      catCornerEnabled: false,
      catCornerDiscoveryPost: false,
      status: 'draft',
      publishedAt: '',
      categories: 'CMS',
      tags: 'Recovery',
      seoTitle: 'Recovery test',
      seoDescription: 'Recovery excerpt',
      canonical: 'https://www.colinmichaels.com/blog/recovery-test',
      openGraphImage: '/cover.webp',
    },
    editor: {mode: 'json', source: '{"blocks": ['},
    socialPromotion: {announcements: []},
    ...overrides,
  };
}

describe('CMS post recovery model', () => {
  it('accepts invalid editor JSON as recoverable source without treating it as canonical content', () => {
    expect(isCmsPostRecoverySnapshot(createRecovery())).toBeTrue();
  });

  it('keeps legacy recovery forms valid and validates additive editorial fields when present', () => {
    const recovery = createRecovery();

    expect(isCmsPostRecoverySnapshot(recovery)).toBeTrue();
    expect(isCmsPostRecoverySnapshot({
      ...recovery,
      form: {
        ...recovery.form,
        evidenceBasis: 'researched',
        evidenceSummary: 'This article compares linked public evidence.',
        sourceReviewedAt: '2026-08-15',
      },
    })).toBeTrue();
    expect(isCmsPostRecoverySnapshot({
      ...recovery,
      form: {...recovery.form, evidenceBasis: 'unlimited-proof'},
    })).toBeFalse();
  });

  it('rejects malformed or cross-schema recovery payloads', () => {
    expect(isCmsPostRecoverySnapshot({...createRecovery(), schemaVersion: 2})).toBeFalse();
    expect(isCmsPostRecoverySnapshot({...createRecovery(), baseRevision: -1})).toBeFalse();
  });

  it('expires recovery copies at the documented retention boundary', () => {
    const recovery = createRecovery({expiresAt: '2026-09-02T12:01:00.000Z'});
    expect(isCmsPostRecoveryExpired(recovery, Date.parse('2026-09-02T12:00:59.999Z'))).toBeFalse();
    expect(isCmsPostRecoveryExpired(recovery, Date.parse('2026-09-02T12:01:00.000Z'))).toBeTrue();
  });

  it('creates a stable comparison fingerprint independent of object key order', () => {
    const hash = createCmsPostRecoveryContentHash({title: 'Test', blocks: [1, 2]});
    expect(hash).toBe(createCmsPostRecoveryContentHash({blocks: [1, 2], title: 'Test'}));
    expect(hash).toMatch(/^fnv1a-v2-[0-9a-f]{8}$/);
  });
});
