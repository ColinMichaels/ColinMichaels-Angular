import { Component } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
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
import {Router} from '@angular/router';

@Component({
  selector: 'app-login-screen',
  imports: [
    ReactiveFormsModule,
    NgIf,
    FaIconComponent,
    FaStackComponent,
    FaStackItemSizeDirective
  ],
  templateUrl: './login-screen.component.html'
})
export class LoginScreenComponent {
  form: FormGroup;
  backgroundImage = 'https://picsum.photos/500/500';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: [
        '', [Validators.required, Validators.pattern(/^[A-Za-z][A-Za-z\s'-]{1,31}$/)]]  // ✅ sync validators
    });
  }

  submit() {
    if (this.form.valid) {
      const username = this.form.value.username;
      this.userService.updateUser({name: username});
      this.router.navigate(['/colinos']);
    }
  }

  protected readonly faRedo = faRedo;
  protected readonly faPowerOff = faPowerOff;
  protected readonly faCircle = faCircle;
  protected readonly faUser = faUser;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faMoon = faMoon;
}
