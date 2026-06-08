import {Injectable} from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import {Observable, map, take} from 'rxjs';

import {PATH_NAMES} from '../app-route-paths';
import {AuthService} from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminAuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.authorizeAdmin(state.url, route.routeConfig?.path ?? '');
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.authorizeAdmin(state.url, route.routeConfig?.path ?? '');
  }

  private authorizeAdmin(redirectUrl: string, targetRoute: string): Observable<boolean | UrlTree> {
    return this.authService.getAdminAuthorization(true).pipe(
      take(1),
      map(authorization => {
        if (authorization.isAdmin) {
          return true;
        }

        if (!authorization.isAuthenticated) {
          return this.router.createUrlTree([`/${PATH_NAMES.OS_LOGIN}`], {
            queryParams: {redirectUrl},
          });
        }

        return this.router.createUrlTree(['/', PATH_NAMES.ADMIN, PATH_NAMES.ADMIN_ACCESS_DENIED], {
          queryParams: {redirectUrl, targetRoute},
        });
      })
    );
  }
}
