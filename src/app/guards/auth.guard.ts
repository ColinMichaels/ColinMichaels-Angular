// src/app/guards/auth.guard.ts
import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {Observable, map, of, take, tap} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {PATH_NAMES} from '../app.routes';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    if (this.isLocalDevelopmentHost()) {
      return of(true);
    }

    return this.authService.user$.pipe(
      take(1),
      map(user => !!user),
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

  private isLocalDevelopmentHost(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  }
}
