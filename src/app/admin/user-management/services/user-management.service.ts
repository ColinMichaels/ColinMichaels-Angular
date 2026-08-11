import {inject, Injectable} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {UserAccountService} from '../../../shared/user-account/user-account.service';
import {
  AdjustAdminUserPointsRequest,
  AdjustAdminUserPointsResponse,
  AdminManagedUser,
  AdminUsersResponse,
  DeleteAdminUserRequest,
  DeleteAdminUserResponse,
  SetAdminUserDisabledRequest,
  SetAdminUserDisabledResponse,
  UpdateAdminUserRolesRequest,
  UpdateAdminUserRolesResponse,
} from '../models/user-management.models';

interface ListAdminUsersRequest {
  pageSize: number;
  pageToken?: string;
}

function normalizeManagedUser(user: AdminManagedUser): AdminManagedUser {
  const points = (user as AdminManagedUser & {
    points?: Partial<Record<keyof AdminManagedUser['points'], unknown>>;
  }).points;
  const numberOrZero = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;

  return {
    ...user,
    points: {
      total: numberOrZero(points?.total),
      postReads: numberOrZero(points?.postReads),
      shares: numberOrZero(points?.shares),
      approvedComments: numberOrZero(points?.approvedComments),
      dailyDiscoveries: numberOrZero(points?.dailyDiscoveries),
      manualAdjustments: numberOrZero(points?.manualAdjustments),
    },
  };
}

function hasCompletePointProjection(user: AdminManagedUser): boolean {
  const points = (user as AdminManagedUser & {
    points?: Partial<Record<keyof AdminManagedUser['points'], unknown>>;
  }).points;

  return !!points && [
    points.total,
    points.postReads,
    points.shares,
    points.approvedComments,
    points.dailyDiscoveries,
    points.manualAdjustments,
  ].every(value => typeof value === 'number' && Number.isFinite(value));
}

@Injectable({
  providedIn: 'root',
})
export class UserManagementService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});
  private readonly userAccountService = inject(UserAccountService);

  async listUsers(
    pageToken?: string,
    pageSize = 100,
    hydrateMissingPoints = false
  ): Promise<AdminUsersResponse> {
    const data = await this.callListUsers({
      pageSize,
      ...(pageToken ? {pageToken} : {}),
    });
    const users = hydrateMissingPoints
      ? await Promise.all(data.users.map(user => this.hydratePointProjection(user)))
      : data.users.map(normalizeManagedUser);

    return {
      ...data,
      users,
    };
  }

  private async callListUsers(request: ListAdminUsersRequest): Promise<AdminUsersResponse> {
    const callable = httpsCallable<ListAdminUsersRequest, AdminUsersResponse>(
      this.getFunctions(),
      'listAdminUsers'
    );
    const result = await callable(request);

    return result.data;
  }

  async listAllUsers(pageSize = 100): Promise<AdminUsersResponse> {
    const users = new Map<string, AdminUsersResponse['users'][number]>();
    const seenPageTokens = new Set<string>();
    let pageToken: string | undefined;
    let fetchedAt: string;

    do {
      const result = await this.listUsers(pageToken, pageSize, true);
      result.users.forEach(user => {
        const normalizedUser = normalizeManagedUser(user);
        users.set(normalizedUser.uid, normalizedUser);
      });
      fetchedAt = result.fetchedAt;
      pageToken = result.nextPageToken ?? undefined;

      if (pageToken) {
        if (seenPageTokens.has(pageToken)) {
          throw new Error('Firebase Auth returned a repeated user page token.');
        }

        seenPageTokens.add(pageToken);
      }
    } while (pageToken);

    return {
      users: [...users.values()],
      nextPageToken: null,
      fetchedAt,
    };
  }

  async adjustUserPoints(request: AdjustAdminUserPointsRequest): Promise<AdjustAdminUserPointsResponse> {
    const callable = httpsCallable<AdjustAdminUserPointsRequest, AdjustAdminUserPointsResponse>(
      this.getFunctions(),
      'adjustAdminUserPoints'
    );
    const result = await callable(request);

    return {
      ...result.data,
      user: normalizeManagedUser(result.data.user),
    };
  }

  async updateUserRoles(request: UpdateAdminUserRolesRequest): Promise<UpdateAdminUserRolesResponse> {
    const callable = httpsCallable<UpdateAdminUserRolesRequest, UpdateAdminUserRolesResponse>(
      this.getFunctions(),
      'updateAdminUserRoles'
    );
    const result = await callable(request);

    return {
      ...result.data,
      user: normalizeManagedUser(result.data.user),
    };
  }

  async setUserDisabled(request: SetAdminUserDisabledRequest): Promise<SetAdminUserDisabledResponse> {
    const callable = httpsCallable<SetAdminUserDisabledRequest, SetAdminUserDisabledResponse>(
      this.getFunctions(),
      'setAdminUserDisabled'
    );
    const result = await callable(request);

    return {
      ...result.data,
      user: normalizeManagedUser(result.data.user),
    };
  }

  async deleteUser(request: DeleteAdminUserRequest): Promise<DeleteAdminUserResponse> {
    const callable = httpsCallable<DeleteAdminUserRequest, DeleteAdminUserResponse>(
      this.getFunctions(),
      'deleteAdminUser'
    );
    const result = await callable(request);

    return result.data;
  }

  private getFunctions(): Functions {
    if (!this.functions) {
      throw new Error('Firebase Functions is not initialized.');
    }

    return this.functions;
  }

  private async hydratePointProjection(user: AdminManagedUser): Promise<AdminManagedUser> {
    if (hasCompletePointProjection(user)) {
      return normalizeManagedUser(user);
    }

    const account = await this.userAccountService.getUserAccount(user.uid);

    return normalizeManagedUser({
      ...user,
      points: account?.points,
    } as AdminManagedUser);
  }
}
