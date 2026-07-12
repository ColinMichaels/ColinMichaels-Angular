export const CAT_CORNER_ADDICT_ROLE = 'catCornerAddict' as const;
export const CAT_CORNER_SOCIAL_CANCELLATION_REASON =
  'Cancelled because the post is hidden from public discovery.';

export interface CatCornerPostSettings {
  enabled: boolean;
  discoveryPost: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isHiddenCatCornerPost(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value['catCorner'])) {
    return false;
  }

  return value['catCorner']['enabled'] === true
    && value['catCorner']['discoveryPost'] !== true;
}

export function shouldCancelPendingCatCornerSocialDeliveries(
  before: unknown,
  after: unknown
): boolean {
  return !isHiddenCatCornerPost(before) && isHiddenCatCornerPost(after);
}

export function cancelQueuedCatCornerSocialAnnouncements(
  announcements: readonly unknown[],
  announcementIds: readonly string[],
  updatedAt: string
): readonly unknown[] {
  const ids = new Set(announcementIds);

  return announcements.map(announcement => {
    if (
      !isRecord(announcement)
      || !ids.has(typeof announcement['id'] === 'string' ? announcement['id'] : '')
      || announcement['status'] !== 'queued'
    ) {
      return announcement;
    }

    return {
      ...announcement,
      status: 'cancelled',
      failureReason: CAT_CORNER_SOCIAL_CANCELLATION_REASON,
      updatedAt,
    };
  });
}

export function hasCatCornerAccessClaim(claims: Record<string, unknown>): boolean {
  const roles = claims['roles'];

  return isRecord(roles) && roles[CAT_CORNER_ADDICT_ROLE] === true;
}

export function addCatCornerAccessClaim(
  existingClaims: Record<string, unknown>
): Record<string, unknown> {
  const existingRoles = isRecord(existingClaims['roles'])
    ? existingClaims['roles']
    : {};

  return {
    ...existingClaims,
    roles: {
      ...existingRoles,
      [CAT_CORNER_ADDICT_ROLE]: true,
    },
  };
}
