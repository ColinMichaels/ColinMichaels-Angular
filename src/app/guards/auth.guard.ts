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
  constructor(private router: Router, private usersService: UserService) {
  }

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> {
    const user = this.usersService.user;

    try {
      if (user?.name) {
        return true;
      }
    } catch (err) {
      // If parsing fails or structure is invalid
    }

    return this.router.parseUrl('/login');
  }
}
