import {inject, Injectable} from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  getIdTokenResult,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  User,
  UserCredential
} from 'firebase/auth';
import {defer, from, map, Observable, of, shareReplay, throwError} from 'rxjs';
import {catchError, switchMap, tap} from 'rxjs/operators';
import {Router} from '@angular/router';
import {LogService} from '../components/game/services/log.service';
import {FIREBASE_AUTH} from './firebase/firebase.tokens';
import {PATH_NAMES} from '../app-route-paths';
import {
  getClaimRoles,
  hasAnyRoleClaim,
  USER_MANAGEMENT_ACCESS_ROLES,
  UserAccountProfile,
} from '../shared/user-account/user-account.model';
import {UserAccountService} from '../shared/user-account/user-account.service';
import {writeAuthDebug} from '../shared/debug/auth-debug';

export interface AdminAuthorization {
  uid: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthorized: boolean;
  claims: Record<string, unknown>;
  requiredRoles: readonly string[];
}

interface AuthDebugUserSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerIds: readonly string[];
}

interface AuthDebugClaimSummary {
  claimKeys: readonly string[];
  roles: readonly string[];
  topLevelRoleClaims: Record<string, boolean>;
  nestedRoleKeys: readonly string[];
}

function hasAdminClaim(claims: Record<string, unknown>): boolean {
  return hasAnyRoleClaim(claims, ['admin', 'cmsAdmin']);
}

function hasSuperAdminClaim(claims: Record<string, unknown>): boolean {
  return hasAnyRoleClaim(claims, USER_MANAGEMENT_ACCESS_ROLES);
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth: Auth | null = inject(FIREBASE_AUTH, {optional: true});

  readonly user$: Observable<User | null>;

  constructor(
    private router: Router,
    private readonly logger: LogService,
    private readonly userAccountService: UserAccountService
  ) {
    const auth = this.auth;
    if (!auth) {
      this.logger.warn('Auth service initialized without Firebase Auth provider.');
      this.user$ = of(null);
      return;
    }

    this.user$ = new Observable<User | null>(observer => {
      return onAuthStateChanged(
        auth,
        currentUser => {
          this.debugAuth('auth state changed', {
            signedIn: !!currentUser,
            user: currentUser ? this.createUserDebugSummary(currentUser) : null,
          });
          if (currentUser) {
            void this.bootstrapUserProfile(currentUser);
          }
          observer.next(currentUser);
        },
        error => {
          this.debugAuth('auth state listener error', this.createErrorDebugSummary(error));
          observer.error(error);
        }
      );
    })
      .pipe(shareReplay({bufferSize: 1, refCount: true}));
  }

  // Email & Password Sign In
  signInWithEmail(email: string, password: string): Observable<UserCredential> {
    const auth = this.auth;
    if (!auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }

    this.debugAuth('email sign-in start', {email});

    return this.fromAuthOperation(() => signInWithEmailAndPassword(auth, email, password)).pipe(
      tap(result => {
        this.logger.info('Signed in!', result.user);
        this.debugAuth('email sign-in success', {user: this.createUserDebugSummary(result.user)});
      }),
      catchError(error => {
        this.debugAuth('email sign-in failed', this.createErrorDebugSummary(error));
        this.logger.error('Login failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Email & Password Registration
  registerWithEmail(email: string, password: string): Observable<UserCredential> {
    const auth = this.auth;
    if (!auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }

    this.debugAuth('email registration start', {email});

    return this.fromAuthOperation(() => createUserWithEmailAndPassword(auth, email, password)).pipe(
      tap(credentials => this.debugAuth('email registration auth user created', {
        user: this.createUserDebugSummary(credentials.user),
      })),
      switchMap(credentials => {
        return this.fromAuthOperation(() => sendEmailVerification(credentials.user)).pipe(
          map(() => credentials)
        );
      }),
      catchError(error => {
        this.debugAuth('email registration failed', this.createErrorDebugSummary(error));
        this.logger.error('Registration failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Google Sign In
  loginWithGoogle(): Observable<UserCredential> {
    const auth = this.auth;
    if (!auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }

    this.debugAuth('google popup sign-in start');

    return this.fromAuthOperation(() => signInWithPopup(auth, this.createGoogleProvider())).pipe(
      tap(result => this.debugAuth('google popup sign-in success', {
        user: this.createUserDebugSummary(result.user),
      })),
      catchError(error => {
        this.debugAuth('google popup sign-in failed', this.createErrorDebugSummary(error));
        this.logger.error('Google popup login failed:', error);
        return throwError(() => error);
      })
    );
  }

  loginWithGoogleRedirect(): Observable<void> {
    const auth = this.auth;
    if (!auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }

    this.debugAuth('google redirect sign-in start');

    return this.fromAuthOperation(() => signInWithRedirect(auth, this.createGoogleProvider())).pipe(
      tap(() => this.debugAuth('google redirect sign-in dispatched')),
      catchError(error => {
        this.debugAuth('google redirect sign-in failed', this.createErrorDebugSummary(error));
        this.logger.error('Google redirect login failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Facebook Sign In
  loginWithFacebook(): Observable<UserCredential> {
    const auth = this.auth;
    if (!auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }

    this.debugAuth('facebook popup sign-in start');

    return this.fromAuthOperation(() => signInWithPopup(auth, this.createFacebookProvider())).pipe(
      tap(result => this.debugAuth('facebook popup sign-in success', {
        user: this.createUserDebugSummary(result.user),
      })),
      catchError(error => {
        this.debugAuth('facebook popup sign-in failed', this.createErrorDebugSummary(error));
        this.logger.error('Facebook popup login failed:', error);
        return throwError(() => error);
      })
    );
  }

  loginWithFacebookRedirect(): Observable<void> {
    const auth = this.auth;
    if (!auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }

    this.debugAuth('facebook redirect sign-in start');

    return this.fromAuthOperation(() => signInWithRedirect(auth, this.createFacebookProvider())).pipe(
      tap(() => this.debugAuth('facebook redirect sign-in dispatched')),
      catchError(error => {
        this.debugAuth('facebook redirect sign-in failed', this.createErrorDebugSummary(error));
        this.logger.error('Facebook redirect login failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Add a method to handle redirect results
  handleRedirectResult(): Observable<UserCredential | null> {
    const auth = this.auth;
    if (!auth) {
      return of(null);
    }

    return this.fromAuthOperation(() => getRedirectResult(auth))
      .pipe(
        tap(result => {
          if (result) {
            this.logger.info('Signed in with redirect provider!', result.user);
            this.debugAuth('provider redirect result received', {
              providerId: result.providerId,
              user: this.createUserDebugSummary(result.user),
            });
          } else {
            this.debugAuth('provider redirect result empty');
          }
        }),
        catchError(error => {
          this.debugAuth('provider redirect result failed', this.createErrorDebugSummary(error));
          this.logger.error('Provider redirect login failed:', error);
          return of(null);
        })
      );
  }


  // Password Reset
  resetPassword(email: string): Observable<void> {
    const auth = this.auth;
    if (!auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }

    return this.fromAuthOperation(() => sendPasswordResetEmail(auth, email)).pipe(
      catchError(error => {
        this.logger.error('Password reset failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Sign Out (enhanced with Observable)
  logout(): Observable<void> {
    const auth = this.auth;
    if (!auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }

    this.debugAuth('logout start', {
      currentUser: auth.currentUser ? this.createUserDebugSummary(auth.currentUser) : null,
    });

    return this.fromAuthOperation(() => signOut(auth)).pipe(
      tap(() => {
        this.logger.info('Signed out');
        this.debugAuth('logout success', {redirectTo: `/${PATH_NAMES.OS_LOGIN}`});
        this.router.navigate(['/', PATH_NAMES.OS_LOGIN]);
      }),
      catchError(error => {
        this.debugAuth('logout failed', this.createErrorDebugSummary(error));
        this.logger.error('Sign out error:', error);
        return throwError(() => error);
      })
    );
  }

  updateUserProfile(profileUser: User, profile: {
    displayName?: string | null;
    photoURL?: string | null
  }): Observable<void> {
    return this.fromAuthOperation(() => updateProfile(profileUser, profile)).pipe(
      catchError(error => {
        this.logger.error('Profile update failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Check if user is authenticated
  isAuthenticated(): Observable<boolean> {
    return this.user$.pipe(
      map(user => !!user)
    );
  }

  getAdminAuthorization(forceRefresh = false): Observable<AdminAuthorization> {
    return this.getRoleAuthorization(['admin', 'cmsAdmin'], forceRefresh);
  }

  getCurrentUserProfile(forceRefresh = false): Observable<UserAccountProfile | null> {
    return this.user$.pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          this.debugAuth('profile requested without signed-in user', {forceRefresh});
          return of(null);
        }

        this.debugAuth('profile token load start', {
          forceRefresh,
          user: this.createUserDebugSummary(currentUser),
        });

        return this.fromAuthOperation(() => getIdTokenResult(currentUser, forceRefresh)).pipe(
          map(tokenResult => {
            const claims = tokenResult.claims as Record<string, unknown>;
            const roles = getClaimRoles(claims);

            this.debugAuth('profile token load success', {
              forceRefresh,
              user: this.createUserDebugSummary(currentUser),
              claims: this.createClaimDebugSummary(claims),
              authTime: tokenResult.authTime,
              issuedAtTime: tokenResult.issuedAtTime,
              expirationTime: tokenResult.expirationTime,
            });

            return {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              emailVerified: currentUser.emailVerified,
              isAnonymous: currentUser.isAnonymous,
              providerIds: currentUser.providerData.map(provider => provider.providerId),
              roles,
              claims,
            };
          }),
          catchError(error => {
            this.debugAuth('profile token load failed', this.createErrorDebugSummary(error));
            this.logger.error('User profile claim load failed:', error);

            return of({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              emailVerified: currentUser.emailVerified,
              isAnonymous: currentUser.isAnonymous,
              providerIds: currentUser.providerData.map(provider => provider.providerId),
              roles: [],
              claims: {},
            });
          })
        );
      })
    );
  }

  getRoleAuthorization(requiredRoles: readonly string[], forceRefresh = false): Observable<AdminAuthorization> {
    return this.user$.pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          this.debugAuth('role authorization without signed-in user', {
            requiredRoles,
            forceRefresh,
          });
          return of({
            uid: null,
            email: null,
            isAuthenticated: false,
            isAdmin: false,
            isAuthorized: false,
            claims: {},
            requiredRoles,
          });
        }

        this.debugAuth('role authorization token load start', {
          requiredRoles,
          forceRefresh,
          user: this.createUserDebugSummary(currentUser),
        });

        return this.fromAuthOperation(() => getIdTokenResult(currentUser, forceRefresh)).pipe(
          map(tokenResult => {
            const claims = tokenResult.claims as Record<string, unknown>;
            const isAdmin = hasAdminClaim(claims);
            const isSuperAdmin = hasSuperAdminClaim(claims);
            const isAuthorized = isSuperAdmin || hasAnyRoleClaim(claims, requiredRoles);

            this.debugAuth('role authorization result', {
              requiredRoles,
              forceRefresh,
              isAuthenticated: true,
              isAdmin,
              isSuperAdmin,
              isAuthorized,
              user: this.createUserDebugSummary(currentUser),
              claims: this.createClaimDebugSummary(claims),
              authTime: tokenResult.authTime,
              issuedAtTime: tokenResult.issuedAtTime,
              expirationTime: tokenResult.expirationTime,
            });

            return {
              uid: currentUser.uid,
              email: currentUser.email,
              isAuthenticated: true,
              isAdmin,
              isAuthorized,
              claims,
              requiredRoles,
            };
          }),
          catchError(error => {
            this.debugAuth('role authorization token load failed', this.createErrorDebugSummary(error));
            this.logger.error('Admin claim check failed:', error);

            return of({
              uid: currentUser.uid,
              email: currentUser.email,
              isAuthenticated: true,
              isAdmin: false,
              isAuthorized: false,
              claims: {},
              requiredRoles,
            });
          })
        );
      })
    );
  }

  private createGoogleProvider(): GoogleAuthProvider {
    const provider = new GoogleAuthProvider();

    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    return provider;
  }

  private createFacebookProvider(): FacebookAuthProvider {
    const provider = new FacebookAuthProvider();

    provider.addScope('email');

    return provider;
  }

  private fromAuthOperation<T>(operation: () => Promise<T>): Observable<T> {
    return defer(() => from(operation()));
  }

  private createUserDebugSummary(user: User): AuthDebugUserSummary {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      providerIds: user.providerData.map(provider => provider.providerId),
    };
  }

  private createClaimDebugSummary(claims: Record<string, unknown>): AuthDebugClaimSummary {
    const rolesClaim = claims['roles'];
    const nestedRoleKeys = rolesClaim && typeof rolesClaim === 'object'
      ? Object.keys(rolesClaim as Record<string, unknown>).sort((a, b) => a.localeCompare(b))
      : [];
    const roleNames = getClaimRoles(claims);

    return {
      claimKeys: Object.keys(claims).sort((a, b) => a.localeCompare(b)),
      roles: roleNames,
      topLevelRoleClaims: {
        admin: claims['admin'] === true,
        cmsAdmin: claims['cmsAdmin'] === true,
        contentEditor: claims['contentEditor'] === true,
        mediaManager: claims['mediaManager'] === true,
        viewer: claims['viewer'] === true,
      },
      nestedRoleKeys,
    };
  }

  private createErrorDebugSummary(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        code: this.getFirebaseErrorCode(error),
      };
    }

    return {
      message: String(error),
    };
  }

  private getFirebaseErrorCode(error: Error): string | undefined {
    if ('code' in error && typeof error.code === 'string') {
      return error.code;
    }

    return undefined;
  }

  private debugAuth(event: string, details?: unknown): void {
    writeAuthDebug('AuthDebug', event, details);
  }

  private async bootstrapUserProfile(user: User): Promise<void> {
    try {
      const account = await this.userAccountService.bootstrapUserProfile(user);
      this.debugAuth('user profile bootstrap success', {
        uid: account.uid,
        roles: account.roles,
        commentTrustStatus: account.commentTrustStatus,
        pointsTotal: account.points.total,
      });
    } catch (error) {
      this.debugAuth('user profile bootstrap failed', this.createErrorDebugSummary(error));
      this.logger.warn('User profile bootstrap failed:', error);
    }
  }
}
