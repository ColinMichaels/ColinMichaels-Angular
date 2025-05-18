import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
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
    private router: Router
  ) {
    this.form = this.fb.group({
      username: [
        '', [Validators.required, Validators.pattern(/^[A-Za-z][A-Za-z\s'-]{1,31}$/)]]  // ✅ sync validators
    });
  }

  ngOnInit() {
    this.user = this.userService.user;
    if (this.user) {
      this.form.patchValue({username: this.user.name});
    }
  }

  submit() {
    if (this.form.valid) {
      this.router.navigate(['/colinos']).then( () =>{
        const username = this.form.value.username;
        this.userService.updateUser({name: username});
      });
    }
  }

  protected readonly faRedo = faRedo;
  protected readonly faPowerOff = faPowerOff;
  protected readonly faCircle = faCircle;
  protected readonly faUser = faUser;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faMoon = faMoon;

  restart() {
    this.router.navigate(['/boot']).then( () =>{
      this.soundService.play('startup.mp3', {volume: 0.5, forceRestart: true});
    });

  }

  sleep() {

  }
}
