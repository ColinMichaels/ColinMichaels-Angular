// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import {CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {Observable, map, take, tap} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {PATH_NAMES} from '../app.routes';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.user$.pipe(
      take(1),
      map(user => !!user), // Map to boolean
      tap(isLoggedIn => {
        if (!isLoggedIn) {
          console.log('Access denied - Not logged in');
          this.router.navigate([`/${PATH_NAMES.OS_LOGIN}`], {
            queryParams: {redirectUrl: state.url}
          });
        }
      })
    );
  }
}
