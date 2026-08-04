import {ChangeDetectionStrategy, Component, effect, inject, signal} from '@angular/core';
import {CommonModule} from "@angular/common";
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {ApplicationManagerService} from '../../services/application-manager.service';
import {AbbreviationPipe} from '../../../../pipes/abbreviation.pipe';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {
  faBell,
  faRightFromBracket,
  faShield,
  faSquare,
  faTrashCan,
  faUser,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import {NotificationService} from '../../services/notification.service';
import {TooltipDirective} from '../../directives/tooltip.directive';
import {SvgService} from '../../services/svg.service';
import {SvgIcons} from '../../services/file-system.service';
import {SvgIconComponent} from '../../templates/app-icon/svg-icon.component';
import {Router} from '@angular/router';
import {AuthService} from '../../../../services/auth.service';
import {ADMIN_CONSOLE_ROLES, USER_MANAGEMENT_ACCESS_ROLES} from '../../../../shared/user-account/user-account.model';

@Component({
  selector: 'app-dock',
  standalone: true,
  imports: [
    CommonModule,
    AbbreviationPipe,
    FontAwesomeModule,
    TooltipDirective,
    SvgIconComponent
  ],
  templateUrl: './dock.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    :host {
      display: block;
      height: 100%;
      z-index: 98;
    }

    :host > div {
      pointer-events: auto;
      z-index: 99;
    }

    .dock-back {
      @apply rounded-t-lg bg-black/30 backdrop-blur-md backdrop-saturate-150;
    }

    .dock-animation {
      @apply
        /* Transitions and Animations */
      hover:scale-110 transition-all duration-200 ease-in-out;
    }
    .dock-icon{
      @apply
      /* Size */
      w-8 h-8

      /* Layout */
      flex items-center
        rounded-lg

      /* Interaction */
      cursor-pointer;
      span{
        @apply text-sm w-full h-full  flex items-center justify-center
          /* Visual Style */
      }
    }
  `
})
export class DockComponent {
  private readonly authService = inject(AuthService);

  isVisible = signal(true);
  cursorY = signal(1000);
  hoverThreshold = 30;
  autoHide = signal(false);
  isHoveringMenu = signal(false);
  menuOpen = signal('');
  protected readonly isSignedIn = toSignal(
    this.authService.user$.pipe(map(user => !!user)),
    {initialValue: false}
  );
  protected readonly canOpenAdmin = toSignal(
    this.authService.getRoleAuthorization(ADMIN_CONSOLE_ROLES, true).pipe(map(authorization => authorization.isAuthorized)),
    {initialValue: false}
  );
  protected readonly canManageUsers = toSignal(
    this.authService.getRoleAuthorization(USER_MANAGEMENT_ACCESS_ROLES, true).pipe(map(authorization => authorization.isAuthorized)),
    {initialValue: false}
  );

  constructor(
    private appManager: ApplicationManagerService,
    private notificationService: NotificationService,
    private svg: SvgService,
    private router: Router
    ) {
    effect(() => {
      if (this.cursorY() <= this.hoverThreshold || this.isHoveringMenu()) {
        this.isVisible.set(true);
      } else {
        if (this.autoHide()) {
          this.isVisible.set(false);
          this.menuOpen.set('');
        }
      }
    });
  }

  get staticApps() {
    return this.svg.loadIcons([
      SvgIcons.Safari,
      SvgIcons.Notes,
      SvgIcons.Calendar,
      SvgIcons.Clock,
      SvgIcons.Phone,
      SvgIcons.Camera
    ], 'system');
  }

  get availableApps() {
    return this.appManager.registeredApps;
  }

  get runningApps() {
    return this.appManager.openApplications;
  }

  get systemApps() {
   return this.appManager.getApps('system');
  }

  get generalApps() {
    return this.appManager.getApps('app');
  }

  get runningGeneralApps() {
    return this.appManager.getRunningApps('app');
  }

  openApp(id: string, args?: unknown) {
    this.appManager.openApplication(id, args);
  }

  closeApp(id: string) {
    this.appManager.closeApplication(id);
  }

  trash(key: string) {
    this.router.navigate(['/']).then(() => {
      localStorage.removeItem(key);
    });
  }

  notify(){
    this.notificationService.generateRandomNotification();
  }

  focusApp(id: string) {
    this.appManager.setApplicationFocus(id);

  }

  navigateTo(path: string): void {
    void this.router.navigateByUrl(path);
  }

  logout() {
    console.warn('logging out');
    this.authService.logout().pipe().subscribe((res) => {
      console.warn('logged out', res);
    });
  }

  protected readonly faTrashCan = faTrashCan;
  protected readonly faBell = faBell;
  protected readonly faSquare = faSquare;
  protected readonly faRightFromBracket = faRightFromBracket;
  protected readonly faUser = faUser;
  protected readonly faShield = faShield;
  protected readonly faUsers = faUsers;


}
