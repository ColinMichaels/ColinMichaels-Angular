export interface UserRoleDefinition {
  id: UserRole;
  label: string;
  description: string;
}

export type UserRole =
  | 'user'
  | 'admin'
  | 'cmsAdmin'
  | 'contentEditor'
  | 'mediaManager'
  | 'viewer'
  | 'trustedCommenter'
  | 'catCornerAddict';

export type UserCommentTrustStatus = 'new' | 'trusted' | 'blocked';

export type UserPointEventType = 'post_read' | 'post_share' | 'site_share' | 'comment_approved';

export interface UserAccountPoints {
  total: number;
  postReads: number;
  shares: number;
  approvedComments: number;
}

export interface UserAccountDocument {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: readonly string[];
  emailVerified: boolean;
  roles: readonly string[];
  commentTrustStatus: UserCommentTrustStatus;
  points: UserAccountPoints;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

export interface UserPointEvent {
  id: string;
  uid: string;
  type: UserPointEventType;
  points: number;
  postId?: string;
  postSlug?: string;
  provider?: string;
  shareId?: string;
  targetPath?: string;
  commentId?: string;
  createdAt: string;
}

export interface UserAccountProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerIds: readonly string[];
  roles: readonly string[];
  claims: Record<string, unknown>;
}

export const BASE_USER_ROLE: UserRole = 'user';
export const CAT_CORNER_ADDICT_ROLE = 'catCornerAddict' as const;

export const USER_ROLE_DEFINITIONS: readonly UserRoleDefinition[] = [
  {
    id: BASE_USER_ROLE,
    label: 'User',
    description: 'Can sign in, manage their profile, comment with moderation, and earn reader points.',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Full admin access, including user and role management.',
  },
  {
    id: 'cmsAdmin',
    label: 'CMS Admin',
    description: 'Full publishing and media access without user management.',
  },
  {
    id: 'contentEditor',
    label: 'Content Editor',
    description: 'Can access CMS post workflows for drafting and editing content.',
  },
  {
    id: 'mediaManager',
    label: 'Media Manager',
    description: 'Can access media library workflows for organizing assets.',
  },
  {
    id: 'viewer',
    label: 'Viewer',
    description: 'Can enter the admin dashboard with read-oriented access only.',
  },
  {
    id: 'trustedCommenter',
    label: 'Trusted Commenter',
    description: 'Can publish blog comments without first-time moderation.',
  },
  {
    id: CAT_CORNER_ADDICT_ROLE,
    label: 'Cat Corner Addict',
    description: 'Found Gretchen and can enter her members-only Cat Corner.',
  },
] as const;

export const ADMIN_CONSOLE_ROLES: readonly UserRole[] = ['admin', 'cmsAdmin', 'contentEditor', 'mediaManager', 'viewer'];
export const CMS_ACCESS_ROLES: readonly UserRole[] = ['admin', 'cmsAdmin', 'contentEditor'];
export const MEDIA_LIBRARY_ACCESS_ROLES: readonly UserRole[] = ['admin', 'cmsAdmin', 'mediaManager'];
export const USER_MANAGEMENT_ACCESS_ROLES: readonly UserRole[] = ['admin'];
export const TRUSTED_COMMENT_ROLES: readonly UserRole[] = ['admin', 'cmsAdmin', 'contentEditor', 'trustedCommenter'];
export const CAT_CORNER_ACCESS_ROLES: readonly UserRole[] = [CAT_CORNER_ADDICT_ROLE];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function hasRoleClaim(claims: Record<string, unknown>, role: string): boolean {
  const roles = claims['roles'];

  return claims[role] === true || (isRecord(roles) && roles[role] === true);
}

export function hasAnyRoleClaim(claims: Record<string, unknown>, roles: readonly string[]): boolean {
  return roles.some(role => hasRoleClaim(claims, role));
}

export function canAccessAdminConsole(claims: Record<string, unknown>): boolean {
  return hasAnyRoleClaim(claims, ADMIN_CONSOLE_ROLES);
}

export function canManageCmsContent(claims: Record<string, unknown>): boolean {
  return hasAnyRoleClaim(claims, CMS_ACCESS_ROLES);
}

export function canManageMediaLibrary(claims: Record<string, unknown>): boolean {
  return hasAnyRoleClaim(claims, MEDIA_LIBRARY_ACCESS_ROLES);
}

export function canManageUserAccounts(claims: Record<string, unknown>): boolean {
  return hasAnyRoleClaim(claims, USER_MANAGEMENT_ACCESS_ROLES);
}

export function getClaimRoles(claims: Record<string, unknown>): string[] {
  const roleNames = new Set<string>();
  const roles = claims['roles'];

  if (isRecord(roles)) {
    for (const [role, enabled] of Object.entries(roles)) {
      if (enabled === true) {
        roleNames.add(role);
      }
    }
  }

  for (const role of USER_ROLE_DEFINITIONS) {
    if (claims[role.id] === true) {
      roleNames.add(role.id);
    }
  }

  return [...roleNames].sort((a, b) => a.localeCompare(b));
}
