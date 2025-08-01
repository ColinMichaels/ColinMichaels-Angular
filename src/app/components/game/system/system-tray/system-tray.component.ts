// system-tray.component.ts
import {Component, HostListener, effect, signal, DestroyRef} from '@angular/core';
import { ApplicationManagerService } from '../../services/application-manager.service';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {ClockDisplayComponent} from '../clock-display/clock-display.component';
import {RouterLink} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faApple} from '@fortawesome/free-brands-svg-icons';
import {faBatteryHalf, faMemory} from '@fortawesome/free-solid-svg-icons';
import {UserService} from '../../services/user.service';
import {FileSystemService, VIEW_MODES} from '../../services/file-system.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {SoundPlayerComponent} from '../sound-player/sound-player.component';


@Component({
  selector: 'app-system-tray',
  standalone: true,
  imports: [
    NgIf,
    NgForOf,
    ClockDisplayComponent,
    FontAwesomeModule,
    RouterLink,
    NgClass,
    SoundPlayerComponent
  ],
  styles: `
    /* system-tray.component.scss */
    :host {
      display: block;
      pointer-events: none;
    }

    :host > div {
      pointer-events: auto;
    }

    .absolute {
      pointer-events: auto;
    }
    .menu-separator {
      @apply my-1 border-t border-white/20;
    }`,
  templateUrl: './system-tray.component.html'
})
export class SystemTrayComponent {
  isVisible = signal(true);
  cursorY = signal(1000);
  hoverThreshold = 40;
  autoHide = signal(false);
  isHoveringMenu = signal(false);
  menuOpen = signal('');
  viewMode = signal(VIEW_MODES.list)

  batteryLevel: string = '66';

  constructor(
    private userService: UserService,
    private fileService: FileSystemService,
    public appManager: ApplicationManagerService,
    private destroyRef: DestroyRef
    ) {
    effect(() => {
      if (this.cursorY() <= this.hoverThreshold || this.isHoveringMenu()) {
        if(this.appManager.getFocusedAppId() !== 'desktop') return;
        this.isVisible.set(true);
      } else {
        if(this.autoHide()){
          this.isVisible.set(true);
          this.menuOpen.set('');
        }
      }
    });
    this.fileService.viewMode$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mode => this.viewMode.set(mode));
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.cursorY.set(event.clientY);
  }

  toggleMenu(menu: string) {
    this.menuOpen.set(this.menuOpen() === menu ? '' : menu);
  }

  get usedMemory(): number {
    return this.appManager.usedMemory;
  }

  setViewMode(mode: VIEW_MODES) {
    this.viewMode.set(mode);
    this.fileService.setViewMode(mode);
  }

  inGbs(memory: number): string {
    if(memory === 0) return '0.00';
    return (memory / 1024).toFixed(2);
  }

  get totalMemory(): number {
    return this.appManager.totalMemory;
  }

  get runningApps() {
    return this.appManager.openApplications;
  }

  openApp(id: string){
    this.appManager.openApplication(id );
  }

  get userName() {
    return this.userService.user.name;
  }

  closeAllApps() {
    this.appManager.closeAllApps()
  }

  closeApp(id: string) {
    this.appManager.closeApplication(id);
  }

  protected readonly faApple = faApple;
  protected readonly faMemory = faMemory;
  protected readonly faBatteryHalf = faBatteryHalf;
  protected readonly VIEW_MODES = VIEW_MODES;
}
