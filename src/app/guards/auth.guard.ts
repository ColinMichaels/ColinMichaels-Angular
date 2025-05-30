import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router, RouterStateSnapshot
} from '@angular/router';
import {User, UserService} from '../components/game/services/user.service';
import {PATH_NAMES} from '../app.routes';
import {LogService} from '../components/game/services/log.service';
import {SettingsService} from '../components/game/services/settings.service';
import {Observable, of, map, catchError} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private userService: UserService,
    private logger: LogService,
    private settingsService: SettingsService
  ) {
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | Observable<boolean> {
    // First check if username is already in the service
    if (this.userService.username) {
      return true;
    }

    // If no username in service, check if there's a user in settings
    return this.settingsService.getSettingSet('user')?.pipe(
      map(userSettings => {
        if (userSettings?.[0]) {
          const user = userSettings[0] as User;
          console.warn('User settings found:', user);
          if (user.name) {
            // If a user exists in settings, update the UserService
            this.userService.updateUser({name: user.name});
            this.logger.debug('User found in settings, no redirect needed:', user.name);
            return true;
          }
        }

        // No user found in settings either, redirect to login
        this.logger.debug('No user found, redirecting to login');
        this.router.navigate([`/${PATH_NAMES.OS_LOGIN}`], {
          queryParams: {redirectUrl: state.url}
        });
        return false;
      }),
      catchError(error => {
        this.logger.error('Error fetching user settings:', error);
        // On error, redirect to login as a fallback
        this.router.navigate([`/${PATH_NAMES.OS_LOGIN}`], {
          queryParams: {redirectUrl: state.url}
        });
        return of(false);
      })
    ) || of(false); // In case getSettingSet returns null/undefined
  }
}
