import {TestBed} from '@angular/core/testing';

import {AuthService} from './auth.service';
import {Auth} from 'firebase/auth';
import {Router} from '@angular/router';
import {LogService} from '../components/game/services/log.service';
import {FIREBASE_AUTH} from './firebase/firebase.tokens';
import {UserAccountService} from '../shared/user-account/user-account.service';
import {CAT_CORNER_ADDICT_ROLE, UserAccountDocument} from '../shared/user-account/user-account.model';
import {firstValueFrom, take, toArray} from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;

  const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
  const logServiceSpy = jasmine.createSpyObj('LogService', ['debug', 'info', 'warn', 'error']);
  const userAccountServiceSpy = jasmine.createSpyObj<UserAccountService>('UserAccountService', ['bootstrapUserProfile']);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {provide: FIREBASE_AUTH, useValue: {} as Auth},
        {provide: Router, useValue: routerSpy},
        {provide: LogService, useValue: logServiceSpy},
        {provide: UserAccountService, useValue: userAccountServiceSpy},
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('reactively re-evaluates role authorization after an explicit claim refresh', async () => {
    TestBed.resetTestingModule();
    let hasCatCornerClaim = false;
    const createToken = (claims: Record<string, unknown>): string => {
      const now = Math.floor(Date.now() / 1000);
      const payload = btoa(JSON.stringify({
        exp: now + 3600,
        auth_time: now - 60,
        iat: now,
        ...claims,
      })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

      return `e30.${payload}.signature`;
    };
    const authUser = {
      uid: 'reader-uid',
      email: 'reader@example.com',
      displayName: 'Reader',
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      providerData: [],
      getIdToken: jasmine.createSpy('getIdToken').and.callFake((forceRefresh: boolean) => {
        if (forceRefresh) {
          hasCatCornerClaim = true;
        }

        return Promise.resolve(createToken(hasCatCornerClaim
          ? {roles: {[CAT_CORNER_ADDICT_ROLE]: true}}
          : {}));
      }),
    } as unknown as import('firebase/auth').User;
    const fakeAuth = {
      currentUser: authUser,
      onAuthStateChanged: (next: (user: import('firebase/auth').User | null) => void) => {
        next(authUser);
        return () => undefined;
      },
    } as unknown as Auth;
    const accountService = jasmine.createSpyObj<UserAccountService>('UserAccountService', ['bootstrapUserProfile']);
    accountService.bootstrapUserProfile.and.resolveTo({uid: authUser.uid, roles: []} as unknown as UserAccountDocument);

    TestBed.configureTestingModule({
      providers: [
        {provide: FIREBASE_AUTH, useValue: fakeAuth},
        {provide: Router, useValue: routerSpy},
        {provide: LogService, useValue: logServiceSpy},
        {provide: UserAccountService, useValue: accountService},
      ],
    });
    const reactiveService = TestBed.inject(AuthService);
    const authorizationPromise = firstValueFrom(
      reactiveService.getRoleAuthorization([CAT_CORNER_ADDICT_ROLE]).pipe(take(2), toArray())
    );

    await firstValueFrom(reactiveService.refreshCurrentUserClaims());
    const authorizations = await authorizationPromise;

    expect(authorizations.map(authorization => authorization.isAuthorized)).toEqual([false, true]);
    expect(authUser.getIdToken).toHaveBeenCalledWith(true);
  });
});
