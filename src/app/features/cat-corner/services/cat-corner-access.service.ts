import {inject, Injectable} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';
import {defer, from, map, Observable, shareReplay, switchMap} from 'rxjs';

import {AdminAuthorization, AuthService} from '../../../services/auth.service';
import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {
  CAT_CORNER_ACCESS_ROLES,
  CAT_CORNER_ADDICT_ROLE,
} from '../../../shared/user-account/user-account.model';

export interface CatCornerAccessClaimResponse {
  role: typeof CAT_CORNER_ADDICT_ROLE;
  alreadyMember: boolean;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class CatCornerAccessService {
  private readonly authService = inject(AuthService);
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  readonly authorization$: Observable<AdminAuthorization> = this.authService
    .getRoleAuthorization(CAT_CORNER_ACCESS_ROLES)
    .pipe(shareReplay({bufferSize: 1, refCount: true}));

  readonly canAccess$ = this.authorization$.pipe(
    map(authorization => authorization.isAuthorized),
    shareReplay({bufferSize: 1, refCount: true})
  );

  claimAccess(): Observable<CatCornerAccessClaimResponse> {
    return defer(() => {
      const callable = httpsCallable<Record<string, never>, CatCornerAccessClaimResponse>(
        this.getFunctions(),
        'claimCatCornerAccess'
      );

      return from(callable({}));
    }).pipe(
      map(result => result.data),
      switchMap(result => this.authService.refreshCurrentUserClaims().pipe(
        map(() => result)
      ))
    );
  }

  private getFunctions(): Functions {
    if (!this.functions) {
      throw new Error('Firebase Functions is not initialized.');
    }

    return this.functions;
  }
}
