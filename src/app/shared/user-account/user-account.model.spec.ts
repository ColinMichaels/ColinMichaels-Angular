import {
  BASE_USER_ROLE,
  CAT_CORNER_ACCESS_ROLES,
  CAT_CORNER_ADDICT_ROLE,
  getClaimRoles,
  hasAnyRoleClaim,
  normalizeCommunicationPreferences,
  TRUSTED_COMMENT_ROLES,
  USER_ROLE_DEFINITIONS,
} from './user-account.model';

describe('user account model', () => {
  it('reads trusted commenter from nested role claims', () => {
    const claims = {
      roles: {
        trustedCommenter: true,
      },
    };

    expect(getClaimRoles(claims)).toContain('trustedCommenter');
    expect(hasAnyRoleClaim(claims, TRUSTED_COMMENT_ROLES)).toBeTrue();
  });

  it('defines a non-privileged base user role for account documents and profile display', () => {
    const baseRole = USER_ROLE_DEFINITIONS.find(role => role.id === BASE_USER_ROLE);

    expect(baseRole?.label).toBe('User');
    expect(TRUSTED_COMMENT_ROLES).not.toContain(BASE_USER_ROLE);
    expect(getClaimRoles({})).not.toContain(BASE_USER_ROLE);
  });

  it('defines Cat Corner access as a typed, non-admin membership role', () => {
    const catCornerRole = USER_ROLE_DEFINITIONS.find(role => role.id === CAT_CORNER_ADDICT_ROLE);
    const claims = {roles: {[CAT_CORNER_ADDICT_ROLE]: true}};

    expect(catCornerRole?.label).toBe('Cat Corner Addict');
    expect(CAT_CORNER_ACCESS_ROLES).toEqual([CAT_CORNER_ADDICT_ROLE]);
    expect(getClaimRoles(claims)).toContain(CAT_CORNER_ADDICT_ROLE);
    expect(hasAnyRoleClaim(claims, CAT_CORNER_ACCESS_ROLES)).toBeTrue();
  });

  it('normalizes valid communication preferences and rejects incomplete consent data', () => {
    expect(normalizeCommunicationPreferences({
      newPostEmails: true,
      newsletter: false,
      source: 'signup-campaign',
      updatedAt: '2026-07-25T12:00:00.000Z',
    })).toEqual({
      newPostEmails: true,
      newsletter: false,
      source: 'signup-campaign',
      updatedAt: '2026-07-25T12:00:00.000Z',
    });
    expect(normalizeCommunicationPreferences({
      newPostEmails: true,
      source: 'profile',
      updatedAt: '2026-07-25T12:00:00.000Z',
    })).toBeNull();
  });
});
