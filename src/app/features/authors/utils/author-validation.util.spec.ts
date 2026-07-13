import {DEFAULT_AUTHOR_PROFILE} from '../authors.constants';
import {isAuthorProfile} from './author-validation.util';

describe('author validation', () => {
  it('accepts the canonical Colin author profile', () => {
    expect(isAuthorProfile(DEFAULT_AUTHOR_PROFILE)).toBeTrue();
  });

  it('rejects incomplete public author profiles', () => {
    expect(isAuthorProfile({id: 'guest', slug: 'guest', name: 'Guest Writer'})).toBeFalse();
  });
});
