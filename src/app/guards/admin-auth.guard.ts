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

const DEFAULT_ADMIN_ROLES = ['admin', 'cmsAdmin'] as const;

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
    return this.authorizeAdmin(state.url, route.routeConfig?.path ?? '', this.getRequiredRoles(route));
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.authorizeAdmin(state.url, route.routeConfig?.path ?? '', this.getRequiredRoles(route));
  }

  private authorizeAdmin(
    redirectUrl: string,
    targetRoute: string,
    requiredRoles: readonly string[]
  ): Observable<boolean | UrlTree> {
    return this.authService.getRoleAuthorization(requiredRoles, true).pipe(
      take(1),
      map(authorization => {
        if (authorization.isAuthorized) {
          return true;
        }

        if (!authorization.isAuthenticated) {
          return this.router.createUrlTree([`/${PATH_NAMES.OS_LOGIN}`], {
            queryParams: {redirectUrl},
          });
        }

        return this.router.createUrlTree(['/', PATH_NAMES.ADMIN, PATH_NAMES.ADMIN_ACCESS_DENIED], {
          queryParams: {
            redirectUrl,
            targetRoute,
            requiredRoles: requiredRoles.join(','),
          },
        });
      })
    );
  }

  private getRequiredRoles(route: ActivatedRouteSnapshot): readonly string[] {
    const routeWithRoles = [...route.pathFromRoot]
      .reverse()
      .find(routeSnapshot => this.isRoleList(routeSnapshot.data['roles']));

    return routeWithRoles ? routeWithRoles.data['roles'] as string[] : DEFAULT_ADMIN_ROLES;
  }

  private isRoleList(value: unknown): value is string[] {
    return Array.isArray(value) && value.length > 0 && value.every(role => typeof role === 'string');
  }
}
