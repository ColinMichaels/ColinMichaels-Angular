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
