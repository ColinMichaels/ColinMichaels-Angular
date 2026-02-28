import {Component, effect, signal} from '@angular/core';
import {CommonModule} from "@angular/common";
import {ApplicationManagerService} from '../../services/application-manager.service';
import {AbbreviationPipe} from '../../../../pipes/abbreviation.pipe';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCog, faTrashCan, faBell, faSquare, faRightFromBracket} from '@fortawesome/free-solid-svg-icons';
import {NotificationService} from '../../services/notification.service';
import {TooltipDirective} from '../../directives/tooltip.directive';
import {SvgService} from '../../services/svg.service';
import {SvgIcons} from '../../services/file-system.service';
import {SvgIconComponent} from '../../templates/app-icon/svg-icon.component';
import {Router} from '@angular/router';
import {AuthService} from '../../../../services/auth.service';

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

  isVisible = signal(true);
  cursorY = signal(1000);
  hoverThreshold = 30;
  autoHide = signal(false);
  isHoveringMenu = signal(false);
  menuOpen = signal('');

  constructor(
    private appManager: ApplicationManagerService,
    private notificationService: NotificationService,
    private readonly authService: AuthService,
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

  openApp(id: string, args?: any) {
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

  logout() {
    console.warn('logging out');
    this.authService.logout().pipe().subscribe((res) => {
      console.warn('logged out', res);
    });
  }

  protected readonly faCog = faCog;
  protected readonly faTrashCan = faTrashCan;
  protected readonly faBell = faBell;
  protected readonly faSquare = faSquare;
  protected readonly faRightFromBracket = faRightFromBracket;


}
