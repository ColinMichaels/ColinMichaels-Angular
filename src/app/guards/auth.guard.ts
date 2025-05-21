import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import {UserService} from '../components/game/services/user.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private userService: UserService) {
  }

  canActivate(): boolean {
    if (this.userService.user?.name) {
      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }

}
