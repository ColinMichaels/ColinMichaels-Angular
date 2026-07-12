function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function replaceManagedUserRoleClaims(
  existingClaims: Record<string, unknown>,
  roles: readonly string[]
): Record<string, unknown> {
  const nextClaims: Record<string, unknown> = {...existingClaims};
  const nextRoles = Object.fromEntries(roles.map(role => [role, true]));

  if (Object.keys(nextRoles).length > 0) {
    nextClaims['roles'] = nextRoles;
  } else {
    delete nextClaims['roles'];
  }

  for (const mirroredRole of ['admin', 'cmsAdmin']) {
    if (roles.includes(mirroredRole)) {
      nextClaims[mirroredRole] = true;
    } else {
      delete nextClaims[mirroredRole];
    }
  }

  return nextClaims;
}

export function canAcquireUserRoleMutationLease(
  value: unknown,
  ownerId: string,
  nowMillis: number
): boolean {
  if (!isRecord(value)) {
    return true;
  }

  const existingOwnerId = typeof value['ownerId'] === 'string' ? value['ownerId'] : '';
  const expiresAtMillis = typeof value['expiresAtMillis'] === 'number'
    ? value['expiresAtMillis']
    : 0;

  return existingOwnerId === ownerId || expiresAtMillis <= nowMillis;
}

export function ownsUserRoleMutationLease(value: unknown, ownerId: string): boolean {
  return isRecord(value) && value['ownerId'] === ownerId;
}
