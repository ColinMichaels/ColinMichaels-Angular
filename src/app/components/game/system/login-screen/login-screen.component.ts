import {Component, OnInit, SecurityContext} from '@angular/core';
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
import {Router, RouterLink} from '@angular/router';
import {SoundService} from '../../services/sound.service';
import {DomSanitizer} from '@angular/platform-browser';

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
export class LoginScreenComponent implements OnInit {
  form: FormGroup;
  user = {} as User;
  backgroundImage = 'assets/images/backgrounds/night.webp';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private soundService: SoundService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.pattern(/^[A-Za-z][A-Za-z\s'-]{1,31}$/),
        Validators.maxLength(24),
        Validators.minLength(4),
        // Add custom validator for additional security
        this.noScriptValidator()
      ]]
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


  ngOnInit() {
    this.user = this.userService.user;
    this.router.events.subscribe(event => {
      console.log('Router Event:', event);
    });

    console.warn(this.user);
    // TODO: sanitize and clean form input domSanitizer?
    this.soundService.stopAll();
    if (this.user) {
      this.form.patchValue({username: this.user.name});
    }
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

      this.router.navigate(['/colinos']).then(
        (success) => {
          console.log('Navigation success:', success);
          this.userService.updateUser({name: cleanUsername});
        },
        (error) => {
          console.error('Navigation failed:', error);
        }
      );

    }
  }

  restart() {
    this.router.navigate(['/boot']).then( () =>{
      this.soundService.play('startup.mp3', {volume: 0.5, forceRestart: true});
    });

  }

  sleep() {
    this.router.navigate(['/sleep']).then(() => {
      this.soundService.play('ambient.mp3', {volume: 0.1, loop: true});
    });
  }

  protected readonly faRedo = faRedo;
  protected readonly faPowerOff = faPowerOff;
  protected readonly faCircle = faCircle;
  protected readonly faUser = faUser;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faMoon = faMoon;
}
