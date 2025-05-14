import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> {
    const user = localStorage.getItem('user');

    if (!user) {
      return this.router.parseUrl('/login');
    }

    try {
      const parsed = JSON.parse(user);
      if (parsed?.name && typeof parsed.name === 'string') {
        return true;
      }
    } catch (err) {
      // If parsing fails or structure is invalid
    }

    return this.router.parseUrl('/login');
  }
}
