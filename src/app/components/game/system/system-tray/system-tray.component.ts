// system-tray.component.ts
import { Component, HostListener, Signal, computed, effect, signal } from '@angular/core';
import { TerminalWindowManagerService } from '../../services/terminal-window-manager.service';
import {NgForOf, NgIf} from '@angular/common';
import {ClockDisplayComponent} from '../clock-display/clock-display.component';

@Component({
  selector: 'app-system-tray',
  standalone: true,
  templateUrl: './system-tray.component.html',
  imports: [
    NgIf,
    NgForOf,
    ClockDisplayComponent
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
    }`
})
export class SystemTrayComponent {
  isVisible = signal(false);
  cursorY = signal(1000);
  hoverThreshold = 40;
  isHoveringMenu = signal(false);

  menuOpen = signal('');

  constructor(public terminalManager: TerminalWindowManagerService) {
    effect(() => {
      if (this.cursorY() <= this.hoverThreshold || this.isHoveringMenu()) {
        this.isVisible.set(true);
      } else {
        this.isVisible.set(false);
        this.menuOpen.set('');
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

  get runningApps() {
    return this.terminalManager.openTerminals;
  }

  closeApp(id: string) {
    this.terminalManager.closeTerminal(id);
  }
}
