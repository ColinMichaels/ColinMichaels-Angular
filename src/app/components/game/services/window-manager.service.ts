import { Injectable, Type } from '@angular/core';
import {CliGameComponent} from '../apps/cli-game/cli-game.component';
import {FinderAppComponent} from '../system/finder-app/finder-app.component';
import {BehaviorSubject, Observable} from 'rxjs';
import {AboutAppComponent} from '../apps/about-app/about-app.component';
import {PlayerConfiguratorComponent} from '../apps/player-configurator/player-configurator.component';
import {NotificationService} from './notification.service';
import {IMediaItem, MediaItem} from './media.service';
import {faBomb} from '@fortawesome/free-solid-svg-icons';

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
export class WindowManagerService {
  private terminals: TerminalInstance[] = [];
  private appRegistry: AppEntry[] = [];
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
        media: new MediaItem({
          title: 'error',
          id: 'error',
          content: {
            type: 'icon',
            data: {
              name: "fa fa-thumbs-down text-base",
              type: "fontawesome",
              svgPath: faBomb
            }
          }
        }),
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

    const isNewInstanceNeeded = !!this.terminals.find(t => t.id === id);
    const newTerminalId = isNewInstanceNeeded ? `${id}_instance` : id;

    this.terminals.push(this.createTerminalInstance(newTerminalId, app, newOffsetX, newOffsetY));

    const focusSuccessful = this.setFocus(newTerminalId, newOffsetX, newOffsetY);

    if (!focusSuccessful) {
      this.notify.show({
        message: `Failed to set focus for terminal with id: ${newTerminalId}`,
        title: "Terminal Error",
        type: "error",
        media: this.notifyTemplate,
      });
      return false;
    }
    return true;
  }

// Helper method for terminal creation
  private createTerminalInstance(id: string, app: AppEntry, offsetX: number, offsetY: number): TerminalInstance {
      return {
        id: id,
        title: app.title,
        component: app.component,
        memory: app.memory || 64,
        autofit: app.autofit ?? false,
        offsetX: offsetX,
        offsetY: offsetY,
      };
    }



  closeTerminal(id: string) {
    this.terminals = this.terminals.filter(t => t.id !== id);
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
