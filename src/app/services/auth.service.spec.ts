import {TestBed} from '@angular/core/testing';

import {AuthService, AuthState, INITIAL_AUTH_STATE} from './auth.service';
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
    sessionStorage.clear();
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

  it('separates auth initialization from a resolved signed-out session', async () => {
    TestBed.resetTestingModule();
    let authStateChanged: ((user: import('firebase/auth').User | null) => void) | undefined;
    const fakeAuth = {
      currentUser: null,
      onAuthStateChanged: (next: (user: import('firebase/auth').User | null) => void) => {
        authStateChanged = next;
        return () => undefined;
      },
    } as unknown as Auth;

    TestBed.configureTestingModule({
      providers: [
        {provide: FIREBASE_AUTH, useValue: fakeAuth},
        {provide: Router, useValue: routerSpy},
        {provide: LogService, useValue: logServiceSpy},
        {provide: UserAccountService, useValue: userAccountServiceSpy},
      ],
    });
    const delayedService = TestBed.inject(AuthService);
    const states: AuthState[] = [];
    const users: Array<import('firebase/auth').User | null> = [];
    const stateSubscription = delayedService.authState$.subscribe(state => states.push(state));
    const userSubscription = delayedService.user$.subscribe(user => users.push(user));

    expect(states).toEqual([INITIAL_AUTH_STATE]);
    expect(users).toEqual([]);

    authStateChanged?.(null);

    expect(states).toEqual([
      INITIAL_AUTH_STATE,
      {status: 'unauthenticated', user: null},
    ]);
    expect(users).toEqual([null]);

    stateSubscription.unsubscribe();
    userSubscription.unsubscribe();
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

  it('lets an admin apply and exit another user role view without replacing the Firebase session', async () => {
    TestBed.resetTestingModule();
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
    const adminUser = {
      uid: 'admin-uid',
      email: 'admin@example.com',
      displayName: 'Admin',
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      providerData: [],
      getIdToken: jasmine.createSpy('getIdToken').and.resolveTo(createToken({roles: {admin: true}})),
    } as unknown as import('firebase/auth').User;
    const fakeAuth = {
      currentUser: adminUser,
      onAuthStateChanged: (next: (user: import('firebase/auth').User | null) => void) => {
        next(adminUser);
        return () => undefined;
      },
    } as unknown as Auth;
    const accountService = jasmine.createSpyObj<UserAccountService>('UserAccountService', ['bootstrapUserProfile']);
    accountService.bootstrapUserProfile.and.resolveTo({
      uid: adminUser.uid,
      roles: ['admin']
    } as unknown as UserAccountDocument);

    TestBed.configureTestingModule({
      providers: [
        {provide: FIREBASE_AUTH, useValue: fakeAuth},
        {provide: Router, useValue: routerSpy},
        {provide: LogService, useValue: logServiceSpy},
        {provide: UserAccountService, useValue: accountService},
      ],
    });
    const viewService = TestBed.inject(AuthService);

    await viewService.startViewingAsUser({
      uid: 'viewer-uid',
      email: 'viewer@example.com',
      displayName: 'Viewer',
      photoURL: null,
      emailVerified: true,
      providerIds: ['password'],
      roles: ['viewer'],
      customClaims: {roles: {viewer: true}},
      disabled: false,
    });

    const viewedAuthorization = await firstValueFrom(viewService.getRoleAuthorization(['viewer']));
    const viewedProfile = await firstValueFrom(viewService.getCurrentUserProfile());

    expect(viewedAuthorization.uid).toBe('viewer-uid');
    expect(viewedAuthorization.isAuthorized).toBeTrue();
    expect(viewedAuthorization.isAdmin).toBeFalse();
    expect(viewedProfile?.displayName).toBe('Viewer');
    expect(fakeAuth.currentUser).toBe(adminUser);

    viewService.stopViewingAsUser();
    const restoredAuthorization = await firstValueFrom(viewService.getRoleAuthorization(['admin']));

    expect(restoredAuthorization.uid).toBe('admin-uid');
    expect(restoredAuthorization.isAuthorized).toBeTrue();
    expect(sessionStorage.length).toBe(0);
  });

  it('rejects View as activation when the real account is not an admin', async () => {
    TestBed.resetTestingModule();
    const now = Math.floor(Date.now() / 1000);
    const payload = btoa(JSON.stringify({
      exp: now + 3600,
      auth_time: now - 60,
      iat: now,
      roles: {cmsAdmin: true},
    })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const cmsUser = {
      uid: 'cms-uid',
      email: 'cms@example.com',
      displayName: 'CMS Admin',
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      providerData: [],
      getIdToken: jasmine.createSpy('getIdToken').and.resolveTo(`e30.${payload}.signature`),
    } as unknown as import('firebase/auth').User;
    const fakeAuth = {
      currentUser: cmsUser,
      onAuthStateChanged: (next: (user: import('firebase/auth').User | null) => void) => {
        next(cmsUser);
        return () => undefined;
      },
    } as unknown as Auth;

    TestBed.configureTestingModule({
      providers: [
        {provide: FIREBASE_AUTH, useValue: fakeAuth},
        {provide: Router, useValue: routerSpy},
        {provide: LogService, useValue: logServiceSpy},
        {provide: UserAccountService, useValue: userAccountServiceSpy},
      ],
    });
    const viewService = TestBed.inject(AuthService);

    await expectAsync(viewService.startViewingAsUser({
      uid: 'reader-uid',
      email: 'reader@example.com',
      displayName: 'Reader',
      photoURL: null,
      emailVerified: true,
      providerIds: [],
      roles: [],
      customClaims: {},
      disabled: false,
    })).toBeRejectedWithError('Only an admin can view the application as another user.');
  });
});
