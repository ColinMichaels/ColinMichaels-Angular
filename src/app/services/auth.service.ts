import {EnvironmentInjector, inject, Injectable, runInInjectionContext} from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  getIdTokenResult,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  user,
  User,
  UserCredential
} from '@angular/fire/auth';
import {defer, from, map, Observable, of, shareReplay, throwError} from 'rxjs';
import {catchError, switchMap, tap} from 'rxjs/operators';
import {Router} from '@angular/router';
import {LogService} from '../components/game/services/log.service';

export interface AdminAuthorization {
  uid: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthorized: boolean;
  claims: Record<string, unknown>;
  requiredRoles: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasRoleClaim(claims: Record<string, unknown>, role: string): boolean {
  const roles = claims['roles'];

  return claims[role] === true || (isRecord(roles) && roles[role] === true);
}

function hasAnyRoleClaim(claims: Record<string, unknown>, requiredRoles: readonly string[]): boolean {
  return requiredRoles.some(role => hasRoleClaim(claims, role));
}

function hasAdminClaim(claims: Record<string, unknown>): boolean {
  return hasAnyRoleClaim(claims, ['admin', 'cmsAdmin']);
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth: Auth | null = inject(Auth, {optional: true});
  private readonly injector = inject(EnvironmentInjector);

  readonly user$: Observable<User | null>;

  constructor(
    private router: Router,
    private readonly logger: LogService
  ) {
    const auth = this.auth;
    if (!auth) {
      this.logger.warn('Auth service initialized without Firebase Auth provider.');
      this.user$ = of(null);
      return;
    }

    this.user$ = this.runInAuthContext(() => user(auth))
      .pipe(shareReplay({bufferSize: 1, refCount: true}));
  }

  // Email & Password Sign In
  signInWithEmail(email: string, password: string): Observable<UserCredential> {
    const auth = this.auth;
    if (!auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }

    return this.fromAuthContext(() => signInWithEmailAndPassword(auth, email, password)).pipe(
      tap(result => this.logger.info('Signed in!', result.user)),
      catchError(error => {
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

    return this.fromAuthContext(() => createUserWithEmailAndPassword(auth, email, password)).pipe(
      switchMap(credentials => {
        return this.fromAuthContext(() => sendEmailVerification(credentials.user)).pipe(
          map(() => credentials)
        );
      }),
      catchError(error => {
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

    return this.fromAuthContext(() => signInWithPopup(auth, this.createGoogleProvider())).pipe(
      catchError(error => {
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

    return this.fromAuthContext(() => signInWithRedirect(auth, this.createGoogleProvider())).pipe(
      catchError(error => {
        this.logger.error('Google redirect login failed:', error);
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

    return this.fromAuthContext(() => getRedirectResult(auth))
      .pipe(
        tap(result => {
          if (result) {
            this.logger.info('Signed in with Google!', result.user);
          }
        }),
        catchError(error => {
          this.logger.error('Google login failed:', error);
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

    return this.fromAuthContext(() => sendPasswordResetEmail(auth, email)).pipe(
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

    return this.fromAuthContext(() => signOut(auth)).pipe(
      tap(() => {
        this.logger.info('Signed out');
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        this.logger.error('Sign out error:', error);
        return throwError(() => error);
      })
    );
  }

  updateUserProfile(profileUser: User, profile: {
    displayName?: string | null;
    photoURL?: string | null
  }): Observable<void> {
    return this.fromAuthContext(() => updateProfile(profileUser, profile)).pipe(
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

  getRoleAuthorization(requiredRoles: readonly string[], forceRefresh = false): Observable<AdminAuthorization> {
    return this.user$.pipe(
      switchMap(currentUser => {
        if (!currentUser) {
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

        return this.fromAuthContext(() => getIdTokenResult(currentUser, forceRefresh)).pipe(
          map(tokenResult => {
            const claims = tokenResult.claims as Record<string, unknown>;
            const isAdmin = hasAdminClaim(claims);

            return {
              uid: currentUser.uid,
              email: currentUser.email,
              isAuthenticated: true,
              isAdmin,
              isAuthorized: isAdmin || hasAnyRoleClaim(claims, requiredRoles),
              claims,
              requiredRoles,
            };
          }),
          catchError(error => {
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

  private fromAuthContext<T>(operation: () => Promise<T>): Observable<T> {
    return defer(() => from(this.runInAuthContext(operation)));
  }

  private runInAuthContext<T>(operation: () => T): T {
    return runInInjectionContext(this.injector, operation);
  }
}
