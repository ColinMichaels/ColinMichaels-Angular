import {Component, effect, signal} from '@angular/core';
import {CommonModule} from "@angular/common";
import {WindowManagerService} from '../../services/window-manager.service';
import {AbbreviationPipe} from '../../../../pipes/abbreviation.pipe';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCog, faTrashCan, faBell, faPowerOff} from '@fortawesome/free-solid-svg-icons';
import {NotificationService} from '../../services/notification.service';
import {RouterLink} from '@angular/router';


@Component({
  selector: 'app-dock',
  standalone: true,
  imports: [
    CommonModule,
    AbbreviationPipe,
    FontAwesomeModule,
    RouterLink
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
    private terminalManager: WindowManagerService,
    private notificationService: NotificationService
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

  get runningAnnotatedApps() {
    return this.annotatedApps.filter(app => app.running);
  }

  get annotatedApps() {
    const runningAppNames = new Set(this.runningApps.map(app => app.title)); // Collect running app names into a set.

    // Annotate availableApps with a running property
    return this.availableApps.map(app => ({
      ...app,
      running: runningAppNames.has(app.title) // Check if the app is in the runningApps list
    }));
  }

  get runningApps() {
    return this.terminalManager.openTerminals;
  }

  get availableApps() {
    return this.terminalManager.availableApps;
  }

  closeApp(id: string) {
    this.terminalManager.closeTerminal(id);
  }

  openApp(id: string) {
    this.terminalManager.openTerminal(id);
  }

  trash(key: string) {
    localStorage.removeItem(key);
  }

  notify(){
    this.notificationService.generateRandomNotification();
  }

  protected readonly faCog = faCog;

  protected readonly faTrashCan = faTrashCan;
  protected readonly faBell = faBell;
  protected readonly faPowerOff = faPowerOff;
}
