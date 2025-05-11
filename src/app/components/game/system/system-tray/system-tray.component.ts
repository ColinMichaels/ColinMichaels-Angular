// system-tray.component.ts
import { Component, HostListener, Signal, computed, effect, signal } from '@angular/core';
import { TerminalWindowManagerService } from '../../services/terminal-window-manager.service';
import {NgForOf, NgIf} from '@angular/common';
import {ClockDisplayComponent} from '../clock-display/clock-display.component';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-system-tray',
  standalone: true,
  templateUrl: './system-tray.component.html',
  imports: [
    NgIf,
    NgForOf,
    ClockDisplayComponent,
    RouterLink
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
    }`
})
export class SystemTrayComponent {
  isVisible = signal(true);
  cursorY = signal(1000);
  hoverThreshold = 30;
  autoHide = signal(false);
  isHoveringMenu = signal(false);

  menuOpen = signal('');
  batteryLevel: string = '66';

  constructor(
    public terminalManager: TerminalWindowManagerService) {
    effect(() => {
      if (this.cursorY() <= this.hoverThreshold || this.isHoveringMenu()) {
        this.isVisible.set(true);
      } else {
        if(this.autoHide()){
          this.isVisible.set(false);
          this.menuOpen.set('');
        }

      }
    });
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.cursorY.set(event.clientY);
  }

  toggleMenu(menu: string) {
    this.menuOpen.set(this.menuOpen() === menu ? '' : menu);
  }

  get usedMemory(): number {
    return this.terminalManager.usedMemory;
  }

  get totalMemory(): number {
    return this.terminalManager.totalMemory;
  }

  get runningApps() {
    return this.terminalManager.openTerminals;
  }

  closeApp(id: string) {
    this.terminalManager.closeTerminal(id);
  }

  openApp(id: string){
    this.terminalManager.openTerminal(id );
  }
}
