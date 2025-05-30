import {Component, OnDestroy, OnInit} from '@angular/core';
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
import {PATH_NAMES} from '../../../../app.routes';
import {LogService} from '../../services/log.service';
import {updateProfile, User} from '@angular/fire/auth';
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
  loginForm: FormGroup;
  registerForm: FormGroup;
  isLoginMode = true; // Toggle between login and register views
  loading = false;
  error = '';

  form: FormGroup;
  user?: User;
  private destroy$ = new Subject<void>();

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
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.redirectUrl = params['redirectUrl'] ?? null;
      });

    // Check for redirect results
    this.authService.handleRedirectResult()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: any) => {
        if (result) {
          this.userService.updateUser({
            name: result.user.displayName ?? result.user.email?.split('@')[0] ?? 'User'
          }).then(() => {
            this.navigateToDestination();
          });
        }
      });


    this.soundService.stopAll();
    this.musicService.stopAll();

    // Check if the user is already logged in
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.navigateToDestination();
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
    const destination = this.redirectUrl ?? `/${PATH_NAMES.OS_MAIN}`;
    this.router.navigateByUrl(destination)
      .then(success => this.logger.info('Navigation success:', success))
      .catch(error => this.logger.error('Navigation failed:', error));
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
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
      case 'auth/popup-closed-by-user':
        return 'Authentication popup was closed before completing the process';
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
          // Update user service with Firebase user info
          this.userService.updateUser({
            name: result.user.displayName || result.user.email?.split('@')[0] || 'User'
          }).then(() => {
            this.navigateToDestination();
          });
        },
        error: (error) => {
          this.loading = false;
          this.error = this.getErrorMessage(error.code);
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
        next: (result: any) => {
          this.logger.info('User registered:', result.user.email);

          // Use the modern Firebase approach for updating the profile
          updateProfile(result.user, {displayName})
            .then(() => {
              return this.userService.updateUser({name: displayName});
            })
            .then(() => {
              this.navigateToDestination();
              this.loading = false; // Set loading to false on success
            })
            .catch((error) => {
              this.loading = false;
              this.error = 'Failed to update profile information';
              this.logger.error('Profile update error:', error);
            });
        },
        error: (error) => {
          this.loading = false;
          this.error = this.getErrorMessage(error.code);
          this.logger.error('Registration error:', error);
        }
      });
  }

  loginWithGoogle() {
    this.loading = true;
    this.error = '';

    this.authService.loginWithGoogle()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => {
          this.logger.info('User logged in with Google:', result?.user?.email);
          // Update user service with Google user info
          this.userService.updateUser({
            name: result?.user?.displayName ??
              (result?.user?.email ? result.user.email.split('@')[0] : null) ??
              'User'

          }).then(() => {
            this.navigateToDestination();
          });
        },
        error: (error) => {
          this.loading = false;
          this.error = this.getErrorMessage(error.code);
          this.logger.error('Google login error:', error);
        }
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
          this.error = this.getErrorMessage(error.code);
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
