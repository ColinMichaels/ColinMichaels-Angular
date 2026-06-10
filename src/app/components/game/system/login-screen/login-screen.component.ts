import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {UserService} from '../../services/user.service';
import {NgIf} from '@angular/common';
import {
  faChevronRight,
  faCircle,
  faMoon,
  faPowerOff,
  faRedo,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent, FaStackComponent, FaStackItemSizeDirective} from '@fortawesome/angular-fontawesome';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {SoundService} from '../../services/sound.service';
import {MusicService} from '../../services/music.service';
import {Subject, takeUntil} from 'rxjs';
import {PATH_NAMES} from '../../../../app-route-paths';
import {LogService} from '../../services/log.service';
import {type User, type UserCredential} from 'firebase/auth';
import {AuthService} from '../../../../services/auth.service';
import {faGoogle} from '@fortawesome/free-brands-svg-icons';

@Component({
  selector: 'app-login-screen',
  imports: [
    ReactiveFormsModule,
    NgIf,
    FaIconComponent,
    FaStackComponent,
    FaStackItemSizeDirective,
    RouterLink
  ],
  templateUrl: './login-screen.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .login-input {
      @apply text-center bg-white/10 text-white rounded-full px-2 py-1 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500
    }

    .login-button {
      @apply absolute top-1 -right-8 w-7 h-7 rounded-full py-1 border border-white/30 text-white/50 hover:text-white/90 transition font-semibold text-sm;
    }

    .form-group {
      @apply relative flex flex-col items-center;
    }
  `
})
export class LoginScreenComponent implements OnInit, OnDestroy {
  private redirectUrl: string | null = null;
  private readonly isLocalHost = this.detectLocalHost();
  loginForm: FormGroup;
  registerForm: FormGroup;
  isLoginMode = true; // Toggle between login and register views
  loading = false;
  googleLoading = false;
  error = '';

  form: FormGroup;
  user?: User;
  private destroy$ = new Subject<void>();
  private completingLogin = false;

  backgroundImage = 'assets/images/backgrounds/night.webp';

  constructor(
    private fb: FormBuilder,
    private readonly authService: AuthService,
    private userService: UserService,
    private soundService: SoundService,
    private musicService: MusicService,
    private logger: LogService,
    private router: Router,
    private readonly route: ActivatedRoute,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {validators: this.passwordMatchValidator});

    this.form = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.pattern(/^[A-Za-z][A-Za-z\s'-]{1,31}$/),
        Validators.maxLength(24),
        Validators.minLength(4),
        this.noScriptValidator()
      ]]
    });

  }

  ngOnInit() {
    this.redirectUrl = this.getSafeRedirectUrl(this.route.snapshot.queryParamMap.get('redirectUrl'));

    if (this.shouldBypassLoginForLocalDevelopment()) {
      this.navigateToDestination();
      return;
    }

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.redirectUrl = this.getSafeRedirectUrl(params['redirectUrl']);
      });

    // Check for redirect results
    this.authService.handleRedirectResult()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: UserCredential | null) => {
        if (result) {
          this.loading = true;
          this.googleLoading = true;
          this.finishFirebaseLogin(result.user, 'Google redirect');
        }
      });


    this.soundService.stopAll();
    this.musicService.stopAll();

    // Check if the user is already logged in
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.finishFirebaseLogin(user, 'existing session');
        }
      });

  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.error = '';
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : {passwordMismatch: true};
  }

  private navigateToDestination() {
    const destination = this.redirectUrl ?? (this.isLocalHost ? `/${PATH_NAMES.OS_MAIN}/cli` : `/${PATH_NAMES.OS_MAIN}`);
    this.router.navigateByUrl(destination)
      .then(success => this.logger.info('Navigation success:', success))
      .catch(error => this.logger.error('Navigation failed:', error));
  }

  private detectLocalHost(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  }

  private shouldBypassLoginForLocalDevelopment(): boolean {
    return this.isLocalHost && !this.isAdminRedirect(this.redirectUrl);
  }

  private isAdminRedirect(redirectUrl: string | null): boolean {
    const adminRoot = `/${PATH_NAMES.ADMIN}`;

    return redirectUrl === adminRoot || redirectUrl?.startsWith(`${adminRoot}/`) === true;
  }

  private getSafeRedirectUrl(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const redirectUrl = value.trim();

    if (!redirectUrl || !redirectUrl.startsWith('/') || redirectUrl.startsWith('//') || redirectUrl.includes('://')) {
      return null;
    }

    return redirectUrl;
  }

  private getErrorCode(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      return typeof code === 'string' ? code : '';
    }

    return '';
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      case 'auth/email-already-in-use':
        return 'Email is already in use';
      case 'auth/weak-password':
        return 'Password is too weak';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/operation-not-allowed':
        return 'Operation not allowed';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email address';
      case 'auth/popup-blocked':
        return 'The Google sign-in popup was blocked. Please allow popups or try again.';
      case 'auth/popup-closed-by-user':
        return 'Authentication popup was closed before completing the process';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for Firebase Google sign-in.';
      case 'auth/network-request-failed':
        return 'Network error while contacting Firebase Authentication';
      default:
        return 'An error occurred during authentication';
    }
  }


  onLogin() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = '';
    const {email, password} = this.loginForm.value;

    this.authService.signInWithEmail(email, password)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.logger.info('User logged in:', result.user.email);
          this.finishFirebaseLogin(result.user, 'email');
        },
        error: (error) => {
          this.loading = false;
          this.error = this.getErrorMessage(this.getErrorCode(error));
          this.logger.error('Login error:', error);
        }
      });
  }

  onRegister() {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.error = '';
    const {email, password, displayName} = this.registerForm.value;

    this.authService.registerWithEmail(email, password)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: UserCredential) => {
          this.logger.info('User registered:', result.user.email);

          this.authService.updateUserProfile(result.user, {displayName})
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.userService.updateUser({name: displayName})
                  .then(() => {
                    this.navigateToDestination();
                    this.loading = false;
                  })
                  .catch((error) => {
                    this.loading = false;
                    this.error = 'Failed to update local user information';
                    this.logger.error('Local profile update error:', error);
                  });
              },
              error: (error) => {
                this.loading = false;
                this.error = 'Failed to update profile information';
                this.logger.error('Profile update error:', error);
              }
            });
        },
        error: (error) => {
          this.loading = false;
          this.error = this.getErrorMessage(this.getErrorCode(error));
          this.logger.error('Registration error:', error);
        }
      });
  }

  loginWithGoogle() {
    this.loading = true;
    this.googleLoading = true;
    this.error = '';

    this.authService.loginWithGoogle()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: UserCredential) => {
          this.logger.info('User logged in with Google:', result.user.email);
          this.finishFirebaseLogin(result.user, 'Google');
        },
        error: (error) => {
          const errorCode = this.getErrorCode(error);

          if (this.shouldFallbackToGoogleRedirect(errorCode)) {
            this.error = 'Popup blocked. Redirecting to Google sign-in...';
            this.startGoogleRedirectSignIn();
            return;
          }

          this.loading = false;
          this.googleLoading = false;
          this.error = this.getErrorMessage(errorCode);
          this.logger.error('Google login error:', error);
        }
      });
  }

  private shouldFallbackToGoogleRedirect(errorCode: string): boolean {
    return errorCode === 'auth/popup-blocked'
      || errorCode === 'auth/operation-not-supported-in-this-environment';
  }

  private startGoogleRedirectSignIn(): void {
    this.authService.loginWithGoogleRedirect()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.googleLoading = false;
        },
        error: (error) => {
          this.loading = false;
          this.googleLoading = false;
          this.error = this.getErrorMessage(this.getErrorCode(error));
          this.logger.error('Google redirect login error:', error);
        }
      });
  }

  private finishFirebaseLogin(user: User, method: string): void {
    if (this.completingLogin) {
      return;
    }

    this.completingLogin = true;
    this.userService.updateUser({
      name: user.displayName ?? user.email?.split('@')[0] ?? 'User'
    }).then(() => {
      this.navigateToDestination();
    }).catch(error => {
      this.loading = false;
      this.googleLoading = false;
      this.completingLogin = false;
      this.error = 'Signed in, but failed to update the local user session';
      this.logger.error(`${method} login profile update error:`, error);
    });
  }

  resetPassword() {
    if (!this.loginForm.get('email')?.valid) {
      this.error = 'Please enter a valid email address';
      return;
    }

    const email = this.loginForm.get('email')?.value;
    this.authService.resetPassword(email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.logger.info('Password reset email sent to:', email);
          this.error = '';
          // TODO: Turn into modal popup or something
          alert(`Password reset email sent to ${email}`);
        },
        error: (error) => {
          this.error = this.getErrorMessage(this.getErrorCode(error));
          this.logger.error('Password reset error:', error);
        }
      });
  }

  restart() {
    this.router.navigate([`/${PATH_NAMES.OS_BOOT}`]).then(() => {
      this.soundService.play('startup.mp3', {volume: 0.5, forceRestart: true});
    });

  }

  sleep() {
    this.router.navigate([`/${PATH_NAMES.OS_SLEEP}`]).then(() => {
      this.soundService.play('ambient.mp3', {volume: 0.1, loop: true});
    });
  }

  // Custom validator to check for potential script injection
  private noScriptValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      // Check for common script injection patterns
      const suspicious = /<script|javascript:|onclick|onerror|onload|eval\(|String\.fromCharCode|\\x[0-9A-Fa-f]{2}/i.test(value);
      return suspicious ? {scriptDetected: true} : null;
    };
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected readonly faRedo = faRedo;
  protected readonly faPowerOff = faPowerOff;
  protected readonly faCircle = faCircle;
  protected readonly faUser = faUser;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faMoon = faMoon;
  protected readonly faGoogle = faGoogle;
}
