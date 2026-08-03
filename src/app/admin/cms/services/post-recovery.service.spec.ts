import {createCmsPostRecoveryDocumentId} from './post-recovery.service';

describe('CmsPostRecoveryService document identity', () => {
  it('encodes imported post IDs so they remain one Firestore document segment', () => {
    expect(createCmsPostRecoveryDocumentId('post/with unsafe segments')).toBe('post%2Fwith%20unsafe%20segments');
  });
});
