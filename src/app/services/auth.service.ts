import {inject, Injectable, NgZone} from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup,
  signOut,
  user,
  UserCredential
} from '@angular/fire/auth';
import {User} from 'firebase/auth';
import {from, map, Observable, of, shareReplay, throwError} from 'rxjs';
import {catchError, switchMap, tap} from 'rxjs/operators';
import {Router} from '@angular/router';
import {LogService} from '../components/game/services/log.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth | null = inject(Auth, {optional: true});

  user$: Observable<User | null> = this.auth ? user(this.auth) : of(null);

  constructor(
    private router: Router,
    private readonly logger: LogService,
    private zone: NgZone
  ) {
    const auth = this.auth;
    if (!auth) {
      this.logger.warn('Auth service initialized without Firebase Auth provider.');
      return;
    }

    this.user$ = new Observable<User | null>(observer => {
      return onAuthStateChanged(auth,
        user => this.zone.run(() => observer.next(user)),
        error => this.zone.run(() => observer.error(error)),
        () => this.zone.run(() => observer.complete())
      );
    }).pipe(shareReplay(1));

  }

  // Email & Password Sign In
  signInWithEmail(email: string, password: string): Observable<UserCredential> {
    if (!this.auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      tap(result => this.logger.info('Signed in!', result.user)),
      catchError(error => {
        this.logger.error('Login failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Email & Password Registration
  registerWithEmail(email: string, password: string): Observable<UserCredential> {
    if (!this.auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(credentials => {
        // Send email verification
        return from(sendEmailVerification(credentials.user)).pipe(
          switchMap(() => of(credentials))
        );
      }),
      catchError(error => {
        this.logger.error('Registration failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Google Sign In (enhanced with Observable)
  loginWithGoogle(): Observable<UserCredential | null> {
    if (!this.auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }
    const provider = new GoogleAuthProvider();
    // Use signInWithPopup instead of redirect for more reliable behavior
    return from(signInWithPopup(this.auth, provider));
  }

  // Add a method to handle redirect results
  handleRedirectResult(): Observable<UserCredential | null> {
    const auth = this.auth;
    if (!auth) {
      return of(null);
    }
    return from(this.zone.runOutsideAngular(() => getRedirectResult(auth)))
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
    if (!this.auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }
    return from(sendPasswordResetEmail(this.auth, email)).pipe(
      catchError(error => {
        this.logger.error('Password reset failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Sign Out (enhanced with Observable)
  logout(): Observable<void> {
    if (!this.auth) {
      return throwError(() => new Error('Firebase Auth is not initialized'));
    }
    return from(signOut(this.auth)).pipe(
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

  // Check if user is authenticated
  isAuthenticated(): Observable<boolean> {
    return this.user$.pipe(
      map(user => !!user)
    );
  }
}
