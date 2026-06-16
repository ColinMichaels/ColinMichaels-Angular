import {inject, Injectable} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {
  AdminUsersResponse,
  UpdateAdminUserRolesRequest,
  UpdateAdminUserRolesResponse,
} from '../models/user-management.models';

interface ListAdminUsersRequest {
  pageSize: number;
  pageToken?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserManagementService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async listUsers(pageToken?: string, pageSize = 50): Promise<AdminUsersResponse> {
    const callable = httpsCallable<ListAdminUsersRequest, AdminUsersResponse>(
      this.getFunctions(),
      'listAdminUsers'
    );
    const result = await callable({
      pageSize,
      ...(pageToken ? {pageToken} : {}),
    });

    return result.data;
  }

  async updateUserRoles(request: UpdateAdminUserRolesRequest): Promise<UpdateAdminUserRolesResponse> {
    const callable = httpsCallable<UpdateAdminUserRolesRequest, UpdateAdminUserRolesResponse>(
      this.getFunctions(),
      'updateAdminUserRoles'
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
}
