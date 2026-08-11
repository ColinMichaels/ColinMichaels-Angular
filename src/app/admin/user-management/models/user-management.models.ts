import {UserAccountPoints} from '../../../shared/user-account/user-account.model';

export interface AdminManagedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: readonly string[];
  disabled: boolean;
  emailVerified: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  roles: readonly string[];
  customClaims: Record<string, unknown>;
  points: UserAccountPoints;
}

export interface AdminUsersResponse {
  users: readonly AdminManagedUser[];
  nextPageToken: string | null;
  fetchedAt: string;
}

export interface UpdateAdminUserRolesRequest {
  uid: string;
  roles: readonly string[];
}

export interface UpdateAdminUserRolesResponse {
  user: AdminManagedUser;
  updatedAt: string;
}

export interface SetAdminUserDisabledRequest {
  uid: string;
  disabled: boolean;
}

export interface SetAdminUserDisabledResponse {
  user: AdminManagedUser;
  updatedAt: string;
}

export interface DeleteAdminUserRequest {
  uid: string;
  confirmation: string;
}

export interface DeleteAdminUserResponse {
  uid: string;
  deletedAt: string;
}

export type AdminUserPointOperation = 'add' | 'remove' | 'set';

export interface AdjustAdminUserPointsRequest {
  uid: string;
  operation: AdminUserPointOperation;
  amount: number;
  reason: string;
}

export interface AdminUserPointAdjustment {
  id: string;
  operation: AdminUserPointOperation;
  delta: number;
  previousTotal: number;
  newTotal: number;
  reason: string;
  updatedAt: string;
}

export interface AdjustAdminUserPointsResponse {
  user: AdminManagedUser;
  adjustment: AdminUserPointAdjustment;
}
