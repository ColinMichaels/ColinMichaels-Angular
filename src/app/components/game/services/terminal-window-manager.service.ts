import { Injectable, Type } from '@angular/core';
import {CliGameComponent} from '../apps/cli-game/cli-game.component';
import {FinderAppComponent} from '../system/finder-app/finder-app.component';
import {BehaviorSubject, Observable} from 'rxjs';
import {AboutAppComponent} from '../apps/about-app/about-app.component';
import {PlayerConfiguratorComponent} from '../apps/player-configurator/player-configurator.component';
import {INotification, NotificationService} from './notification.service';
import {IMediaItem} from './media.service';

export interface TerminalInstance {
  id: string;
  title: string;
  component: Type<any>;
  autofit: boolean;
  memory: number; // in MB
  offsetX?: number;
  offsetY?: number;
}

export interface AppEntry {
  id: string;
  title: string;
  description?: string;
  component: Type<any>;
  icon?: string;
  memory: number;
  autofit?: boolean;
  installed: boolean;
}

@Injectable({ providedIn: 'root' })
export class TerminalWindowManagerService {
  private terminals: TerminalInstance[] = [];
  private appRegistry: AppEntry[] = [];
  private maxInstances = 5;
  private maxMemory = 512; // MB
  private focusedWindowId = new BehaviorSubject<string | null>(null);

  private readonly notifyTemplate: IMediaItem = {
      id: 'error',
      title: 'Error',
      content: {
        type: 'icon',
        data: {
          type: 'fontawesome',
          name: 'fa fa-exclamation-triangle'
        }
      }
  }

  constructor(private notify: NotificationService) {
    this.registerApp({
      id: 'cli',
      title: 'CLI Console',
      component: CliGameComponent,
      installed: true,
      memory: 64
    });

    this.registerApp({
      id: 'finder',
      title: 'Finder',
      component: FinderAppComponent,
      installed: true,
      memory: 128
    });

    this.registerApp({
      id: 'about',
      title: 'About',
      component: AboutAppComponent,
      installed: true,
      autofit: true,
      memory: 8
    });

    this.registerApp({
      id: 'player-config',
      title: 'Player Config',
      component: PlayerConfiguratorComponent,
      installed: true,
      memory: 256
    })
  }

  get openTerminals(): TerminalInstance[] {
    return this.terminals;
  }

  get totalMemory(): number {
    return this.maxMemory;
  }

  get usedMemory(): number {
    return this.terminals.reduce((sum, t) => sum + t.memory, 16);
  }

  get availableApps(): AppEntry[] {
    return this.appRegistry;
  }

  registerApp(app: AppEntry) {
    if (!this.appRegistry.some(a => a.id === app.id)) {
      this.appRegistry.push(app);
    }
  }

  openTerminal(id: string): boolean {
    const app = this.appRegistry.find(a => a.id === id && a.installed);
    if (!app) return false;

    if (this.usedMemory + app.memory > this.maxMemory) {
        this.notify.show({
          message: "Cannot open terminal. Memory limit exceeded.",
          title: "Memory Error",
          type: "error"
        });
        return false;
    }

    const lastTerminal = this.terminals[this.terminals.length - 1];

    const DEFAULT_OFFSET = 40;

    const newOffsetX = lastTerminal?.offsetX !== undefined
        ? lastTerminal.offsetX + DEFAULT_OFFSET
        : DEFAULT_OFFSET;

    const newOffsetY = lastTerminal?.offsetY !== undefined
        ? lastTerminal.offsetY + DEFAULT_OFFSET
        : DEFAULT_OFFSET;

    const existingTerminal = this.terminals.find(t => t.id === id);
    if (!existingTerminal) {
        this.terminals.push({
            id,
            title: app.title,
            component: app.component,
            memory: app.memory !== undefined ? app.memory : 64,
            autofit: app.autofit ?? false,
            offsetX: newOffsetX, // Explicitly set the offset here
            offsetY: newOffsetY, // Explicitly set the offset here
        });

        const focusSuccessful = this.setFocus(id, newOffsetX, newOffsetY);

        if (!focusSuccessful) {
          this.notify.show({
            message: `Failed to set focus for terminal with id: ${id}`,
            title: "Terminal Error",
            type: "error",
            media: this.notifyTemplate,
          });
          return false;
        }
    }

    return true;

}

  closeTerminal(id: string) {
    this.terminals = this.terminals.filter(t => t.id !== id);
  }

  clearAll() {
    this.terminals = [];
  }

  setFocus(id: string, offsetX?: number, offsetY?: number): boolean {
    if (this.focusedWindowId.getValue() === id) return true;

    const terminal = this.terminals.find(t => t.id === id);
    if (!terminal) {
        return false;
    }

    this.focusedWindowId.next(id);
    terminal.offsetX = offsetX ?? 40;
    terminal.offsetY = offsetY ?? 40;

    // Move terminal to top of stack without recreating it
    const index = this.terminals.findIndex(t => t.id === id);
    if (index !== -1) {
        this.terminals = [
            ...this.terminals.slice(0, index),
            ...this.terminals.slice(index + 1),
            terminal
        ];
    }

    return true;
  }

  getFocus$(): Observable<string | null> {
    return this.focusedWindowId.asObservable();
  }
}
