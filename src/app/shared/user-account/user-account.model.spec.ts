import {BASE_USER_ROLE, getClaimRoles, hasAnyRoleClaim, TRUSTED_COMMENT_ROLES, USER_ROLE_DEFINITIONS} from './user-account.model';

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
});
