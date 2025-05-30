import {Component, OnDestroy, OnInit, SecurityContext} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {User, UserService} from '../../services/user.service';
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
import {DomSanitizer} from '@angular/platform-browser';
import {MusicService} from '../../services/music.service';
import {SettingsService} from '../../services/settings.service';
import {Subject, takeUntil} from 'rxjs';
import {PATH_NAMES} from '../../../../app.routes';
import {LogService} from '../../services/log.service';

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
  templateUrl: './login-screen.component.html'
})
export class LoginScreenComponent implements OnInit, OnDestroy {
  private redirectUrl: string | null = null;
  form: FormGroup;
  user?: User;
  private destroy$ = new Subject<void>();

  backgroundImage = 'assets/images/backgrounds/night.webp';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private soundService: SoundService,
    private musicService: MusicService,
    private settingsService: SettingsService,
    private logger: LogService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
  ) {
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
        this.redirectUrl = params['redirectUrl'] || null;
      });

    // First check if there's an existing user in the settings
    this.settingsService.getSettingSet('user')
      ?.pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (userSettings) => {
          if (userSettings?.[0]) {
            this.user = userSettings[0] as User;
            if (this.user?.name) {
              this.form.patchValue({username: this.user.name});
            }
          }
        },
        error: (error) => {
          this.logger.error(`Error fetching user settings: `, error);
        }
      });

    this.soundService.stopAll();
    this.musicService.stopAll();
  }

  submit(event: { preventDefault: () => void; }) {
    event.preventDefault();

    if (this.form.valid) {
      // Sanitize the input before using it
      const sanitizedUsername = this.sanitizer.sanitize(SecurityContext.HTML,
        this.form.value.username) ?? '';

      // Additional cleaning
      const cleanUsername = sanitizedUsername
        .trim()
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/&/g, '&amp;') // Encode ampersands
        .replace(/"/g, '&quot;') // Encode quotes
        .replace(/'/g, '&#x27;'); // Encode single quotes

      this.userService.updateUser({name: cleanUsername}).then(() => {
        // Navigate to the redirectUrl if it exists, otherwise to the main OS route
        const destination = this.redirectUrl || `/${PATH_NAMES.OS_MAIN}`;

        this.router.navigateByUrl(destination).then(
          (success) => {
            this.logger.info(`Navigation success: `, success);
          },
          (error) => {
            this.logger.error(`Navigation failed:`, error);
          }
        );
      });


    }
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
}
