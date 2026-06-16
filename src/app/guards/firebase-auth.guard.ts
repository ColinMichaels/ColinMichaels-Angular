import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {map, Observable, take} from 'rxjs';

import {PATH_NAMES} from '../app-route-paths';
import {AuthService} from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
  }

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.authService.user$.pipe(
      take(1),
      map(user => user
        ? true
        : this.router.createUrlTree(['/', PATH_NAMES.OS_LOGIN], {
          queryParams: {redirectUrl: state.url},
        }))
    );
  }
}
