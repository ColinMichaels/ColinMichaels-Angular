import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router
} from '@angular/router';
import {UserService} from '../components/game/services/user.service';
import {PATH_NAMES} from '../app.routes';
import {LogService} from '../components/game/services/log.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private userService: UserService, private logger: LogService) {
  }

  canActivate(): boolean {
    if (this.userService.username) {
      return true;
    }

    this.logger.debug('Redirecting to login: ', this.userService.username);
    this.router.navigate([`/${PATH_NAMES.OS_LOGIN}`]);
    return false;
  }

}
