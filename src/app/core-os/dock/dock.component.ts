import {ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal} from '@angular/core';
import {CommonModule} from "@angular/common";
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {ApplicationManagerService} from '@core-os/app-registry/application-manager.service';
import {AbbreviationPipe} from '../../pipes/abbreviation.pipe';
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
import {NotificationService} from '../../components/game/services/notification.service';
import {TooltipDirective} from '@core-os/tooltip';
import {Router} from '@angular/router';
import {AuthService} from '../../services/auth.service';
import {ADMIN_CONSOLE_ROLES, USER_MANAGEMENT_ACCESS_ROLES} from '../../shared/user-account/user-account.model';
import {APP_ID, AppEntry, AppType} from '@core-os/app-registry/application-manager.models';

@Component({
  selector: 'app-dock',
  standalone: true,
  imports: [
    CommonModule,
    AbbreviationPipe,
    FontAwesomeModule,
    TooltipDirective
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
      @apply rounded-2xl bg-black/35 backdrop-blur-md backdrop-saturate-150;
    }

    .dock-animation {
      @apply
        /* Transitions and Animations */
      hover:scale-110 transition-all duration-200 ease-in-out;
    }

    .dock-utility-button {
      @apply flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-inherit
        hover:scale-110 transition-all duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80;
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

    .dock-app-button {
      @apply relative flex h-9 w-9 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-inherit
        transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80;
      transform-origin: center bottom;
    }

    .dock-app-button:hover,
    .dock-app-button:focus-visible {
      transform: translateY(-0.35rem) scale(1.16);
    }

    .dock-app-button--opening {
      animation: dock-launch-bounce 420ms cubic-bezier(0.22, 0.8, 0.3, 1);
    }

    @keyframes dock-launch-bounce {
      0%, 100% { transform: translateY(0); }
      38% { transform: translateY(-0.75rem); }
      68% { transform: translateY(-0.2rem); }
    }

    @media (prefers-reduced-motion: reduce) {
      .dock-animation,
      .dock-utility-button,
      .dock-app-button,
      .dock-app-button--opening {
        animation: none;
        transition-duration: 0.01ms;
      }
    }
  `
})
export class DockComponent {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  isVisible = signal(true);
  cursorY = signal(1000);
  hoverThreshold = 30;
  autoHide = signal(false);
  isHoveringMenu = signal(false);
  menuOpen = signal('');
  protected readonly openingAppId = signal<string | null>(null);
  private openingAnimationTimer?: ReturnType<typeof setTimeout>;
  private focusAnimationFrame?: number;
  private readonly alwaysVisibleSystemApps = new Set<string>([APP_ID.finder, APP_ID.system_settings]);
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
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.openingAnimationTimer);
      if (this.focusAnimationFrame !== undefined) {
        cancelAnimationFrame(this.focusAnimationFrame);
      }
    });
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

  get dockApps(): AppEntry[] {
    return this.availableApps.filter((app) => app.installed && (
      app.type === AppType.app
      || this.alwaysVisibleSystemApps.has(app.id)
      || app.running
    ));
  }

  get runningGeneralApps() {
    return this.appManager.getRunningApps('app');
  }

  trackApp(_: number, app: AppEntry): string {
    return app.id;
  }

  openApp(id: string, args?: unknown) {
    const wasRunning = !!this.availableApps.find((app) => app.id === id)?.running;
    const opened = this.appManager.openApplication(id, args);
    if (opened) {
      this.scheduleActivatedWindowFocus();
    }
    if (opened && !wasRunning) {
      this.openingAppId.set(id);
      clearTimeout(this.openingAnimationTimer);
      this.openingAnimationTimer = setTimeout(() => this.openingAppId.set(null), 450);
    }
  }

  private scheduleActivatedWindowFocus(): void {
    const expectedFocusId = this.appManager.getFocusedAppId();
    if (!expectedFocusId || expectedFocusId === 'desktop') {
      return;
    }

    if (this.focusAnimationFrame !== undefined) {
      cancelAnimationFrame(this.focusAnimationFrame);
    }
    this.focusAnimationFrame = requestAnimationFrame(() => {
      this.focusAnimationFrame = undefined;
      if (this.appManager.getFocusedAppId() !== expectedFocusId) {
        return;
      }
      Array.from(document.querySelectorAll<HTMLElement>('[data-window-id]'))
        .find((element) => element.dataset['windowId'] === expectedFocusId)
        ?.focus();
    });
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
    // AuthService owns redirect and error logging; avoid duplicate shell console noise.
    this.authService.logout().subscribe({
      error: () => undefined,
    });
  }

  getDockActionLabel(app: AppEntry): string {
    const title = app.title.trim() || 'Application';
    if (app.minimized) {
      return `Restore ${title}`;
    }
    if (app.running) {
      return `Show ${title}`;
    }
    return `Open ${title}`;
  }

  protected readonly faTrashCan = faTrashCan;
  protected readonly faBell = faBell;
  protected readonly faSquare = faSquare;
  protected readonly faRightFromBracket = faRightFromBracket;
  protected readonly faUser = faUser;
  protected readonly faShield = faShield;
  protected readonly faUsers = faUsers;


}
