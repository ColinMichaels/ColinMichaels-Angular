import {Injectable, Type} from '@angular/core';
import {NotificationService} from './notification.service';
import {IMediaItem, MediaItem} from './media.service';
import {
  faBomb,
  faChartSimple,
  faCircleInfo, faCogs,
  faComputer,
  faExclamationTriangle,
  faPerson
} from '@fortawesome/free-solid-svg-icons';
import {faFaceGrin} from '@fortawesome/free-regular-svg-icons';

/** installed apps */
import {ActivityMonitorComponent} from '../apps/activity-monitor/activity-monitor.component';
import {SettingsPanelComponent} from '../system/settings-panel/settings-panel.component';
import {CliGameComponent} from '../apps/cli-game/cli-game.component';
import {FinderAppComponent} from '../system/finder-app/finder-app.component';
import {BehaviorSubject, Observable} from 'rxjs';
import {AboutAppComponent} from '../apps/about-app/about-app.component';
import {PlayerConfiguratorComponent} from '../apps/player-configurator/player-configurator.component';
import {TooltipExamplesComponent} from '../apps/tooltip-examples/tooltip-examples.component';
import {MarkdownReaderComponent} from '../apps/markdown-reader/markdown-reader.component';
import {ApplicationFactory} from '../factories/application-factory';
import {TailwindPreviewComponent} from '../apps/tailwind-preview/tailwind-preview.component';
import {faCss} from '@fortawesome/free-brands-svg-icons';
/** /installed apps */

export interface ApplicationInstance extends AppEntry {
  id: string;
  title: string;
  parent: AppEntry | null;
  component: Type<any>;
  autofit: boolean;
  memory: number; // in MB
  offsetX?: number;
  offsetY?: number;
  icon?: {
    class?: string;
    svgPath?: any;
  },
  running?: boolean;
  installed: boolean;
}

export interface AppEntry {
  id: string;
  title: string;
  description?: string;
  component: Type<any>;
  maxInstances: number;
  instanceIndex: number;
  type: 'system' | 'other' | 'app',
  icon?: {
    class?: string;
    svgPath?: any;
  }
  memory: number;
  metadata?: {
    version?: string;
    author?: string;
    license?: string;
    website?: string;
  }
  autofit?: boolean;
  installed: boolean;
  running?: boolean;
}

export enum AppType {
  system = 'system',
  app = 'app',
  other = 'other'
}

export enum APPIDS {
  CLI = 'cli',
  FINDER = 'finder',
  ABOUT = 'about',
  PLAYER_CONFIG = 'player-config',
  ACTIVITY_MONITOR = 'activity-monitor',
  SYSTEM_SETTINGS = 'system-settings',
  MARKDOWN_READER = 'markdown-reader',
  TAILWIND_PREVIEW = 'tailwind-preview',
  TOOLTIP_EXAMPLE = 'tooltip-example'
}

@Injectable({providedIn: 'root'})
export class ApplicationManagerService {
  private applications: ApplicationInstance[] = [];
  private appRegistry: AppEntry[] = [];
  private maxMemory = 16 * 1024; // MB
  private focusedAppId = new BehaviorSubject<string | null>(null);

  private readonly notifyTemplate: IMediaItem = {
    id: 'error',
    title: 'Error',
    content: {
      type: 'icon',
      data: {
        type: 'fontawesome',
        name: 'fa fa-exclamation-triangle',
        svgPath: faExclamationTriangle
      }
    }
  }

  constructor(
    private appFactory: ApplicationFactory,
    private notify: NotificationService
  ) {
    this.registerApps();
    this.loadSavedApplications();
  }

  private registerApps() {
    this.registerApp({
      id: APPIDS.CLI,
      title: 'CLI Console',
      component: CliGameComponent,
      installed: true,
      icon: {
        class: 'bg-zinc-900 text-green-500 rounded p-1 shadow-lg border-2 border-zinc-500 text-base',
        svgPath: faComputer
      },
      memory: 1024,
      maxInstances: 5,
      type: AppType.app,
      instanceIndex: 1
    });

    this.registerApp({
      id: APPIDS.FINDER,
      title: 'Finder',
      component: FinderAppComponent,
      installed: true,
      icon: {
        class: 'text-[20px] gradient--bg-blue p-1 rounded shadow-lg border-2 border-zinc-600 text-black',
        svgPath: faFaceGrin
      },
      memory: 512,
      maxInstances: 5,
      type: AppType.system,
      instanceIndex: 1
    });

    this.registerApp({
      id: APPIDS.ABOUT,
      title: 'About',
      component: AboutAppComponent,
      installed: true,
      icon: {
        class: 'p-2 text-[32px]',
        svgPath: faCircleInfo
      },
      autofit: true,
      memory: 128,
      maxInstances: 1,
      type: AppType.system,
      instanceIndex: 1
    });

    this.registerApp({
      id: APPIDS.PLAYER_CONFIG,
      title: 'Player Config',
      component: PlayerConfiguratorComponent,
      installed: true,
      icon: {
        class: 'text-[22px] gradient--bg-green py-0.5 px-2 rounded-lg shadow-lg border-2 border-blue-800 text-black',
        svgPath: faPerson
      },
      memory: 1024,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 1
    });

    this.registerApp({
      id: APPIDS.ACTIVITY_MONITOR,
      title: 'Activity Monitor',
      component: ActivityMonitorComponent,
      installed: true,
      icon: {
        class: 'bg-zinc-900 text-sm p-2 rounded-sm shadow-sm border-2 border-zinc-700 text-green-500',
        svgPath: faChartSimple
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 1
    });

    this.registerApp({
      id: APPIDS.SYSTEM_SETTINGS,
      title: 'System Settings',
      component: SettingsPanelComponent,
      installed: true,
      icon: {
        class: 'bg-zinc-200 text-[20px] p-0.5 rounded-lg inner-shadow border-2 border-zinc-700 text-zinc-800',
        svgPath: faCogs
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.system,
      instanceIndex: 1
    });

    this.registerApp({
      id: APPIDS.TOOLTIP_EXAMPLE,
      title: 'Tooltip Example',
      component: TooltipExamplesComponent,
      installed: true,
      icon: {
        class: 'bg-zinc-200 text-[20px] p-0.5 rounded-lg inner-shadow border-2 border-zinc-700 text-zinc-800',
        svgPath: faCogs
      },
      memory: 512,
      maxInstances: 1,
      type:AppType.system,
      instanceIndex: 1
    });

    this.registerApp({
      id: APPIDS.MARKDOWN_READER,
      title: '',
      component: MarkdownReaderComponent,
      /**
       * Todo: from register app we can pass arguments to the app when it renders for reuseable components
       * Todo: possbily pass s secondary component to render within that.
       */
      installed: true,
      icon: {
        class: '',
        svgPath: faCogs
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.system,
      /**
       * Todo:  Add subtype or extend the type paramenter so we can do something like system desktop file or something.
       *
       */
      instanceIndex: 1
    });

    this.registerApp({
      id: APPIDS.TAILWIND_PREVIEW,
      title: 'Tailwind Playground',
      component: TailwindPreviewComponent,
      /**
       * Todo: from register app we can pass arguments to the app when it renders for reuseable components
       * Todo: possbily pass s secondary component to render within that.
       */
      installed: true,
      icon: {
        class: '',
        svgPath: faCss
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      /**
       * Todo:  Add subtype or extend the type paramenter so we can do something like system desktop file or something.
       *
       */
      instanceIndex: 1
    });
  }

  private loadSavedApplications() {
    const savedApps = localStorage.getItem('applications');
    if (savedApps) {
      JSON.parse(savedApps).map((a: { id: any; }) => a.id).map((id: string) => this.openApplication(id));
    }
  }

  get openApplications(): ApplicationInstance[] {
    return this.applications;
  }

  getRunningApps(type = 'app'): ApplicationInstance[] {
    return this.openApplications.filter((app) => {
      return app.type === type;
    });
  }

  getApps(type = 'app'): ApplicationInstance[] {
    return (this.registeredApps as ApplicationInstance[]).filter((app) => {
      return app.type === type;
    });
  }

  get totalMemory(): number {
    return this.maxMemory;
  }

  get usedMemory(): number {
    return this.applications.reduce((sum, t) => sum + t.memory, 16);
  }

  get registeredApps(): AppEntry[] {
    return this.appRegistry;
  }

  registerApp(app: AppEntry) {
    if (!this.appRegistry.some(a => a.id === app.id)) {
      this.appRegistry.push(app);
    }
  }

  openApplication(id: string, args?: []): boolean {
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

    const lastApplication = this.applications[this.applications.length - 1];

    const DEFAULT_OFFSET = 40;

    const newOffsetX = lastApplication?.offsetX !== undefined
      ? lastApplication.offsetX + DEFAULT_OFFSET
      : DEFAULT_OFFSET;

    const newOffsetY = lastApplication?.offsetY !== undefined
      ? lastApplication.offsetY + DEFAULT_OFFSET
      : DEFAULT_OFFSET;

    const isNewInstanceNeeded = !!this.applications.find(t => t.id === id);

    const curAppIndex = this.applications.length + 1;

    const newTerminalId = isNewInstanceNeeded ? `${id}-${curAppIndex}` : id;

    console.warn('app.instanceIndex', app.instanceIndex);

    if (app.instanceIndex > app.maxInstances && app.type !== 'system') {
      this.notify.show({
        message: `Cannot open application. Maximum number of instances reached.`,
        title: "System Error",
        type: "error",
        media: this.notifyTemplate,
      });
      return false;
    }

    app.instanceIndex = isNewInstanceNeeded ? app.instanceIndex + 1 : app.instanceIndex;

    this.applications.push(
      this.appFactory.createInstance(newTerminalId, app, newOffsetX, newOffsetY)
    );

    this.saveOpenApplications();

    const focusSuccessful = this.setApplicationFocus(newTerminalId, newOffsetX, newOffsetY);

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

  saveOpenApplications() {
    localStorage.setItem('applications', JSON.stringify(this.applications));
  }

  closeApplication(id: string) {
    const application = this.getAppByID(id);
    if (!application) {
      return;
    }
    application.running = false;
    if (application.parent && application.parent.instanceIndex > 2) {
      application.parent.instanceIndex -= 1;
    }
    this.applications = this.applications.filter(t => t.id !== id);
    this.saveOpenApplications();
  }

  setApplicationFocus(id: string, offsetX?: number, offsetY?: number): boolean {
    if (this.focusedAppId.getValue() === id) return true;

    const application = this.applications.find(t => t.id === id);
    if (!application) {
      return false;
    }

    this.focusedAppId.next(id);
    application.offsetX = offsetX ?? 40;
    application.offsetY = offsetY ?? 40;

    // Move application to top of stack without recreating it
    const index = this.applications.findIndex(t => t.id === id);
    if (index !== -1) {
      this.applications = [
        ...this.applications.slice(0, index),
        ...this.applications.slice(index + 1),
        application
      ];
    }

    return true;
  }

  getAppByID(id: string): ApplicationInstance | undefined {
    return this.applications.find(t => t.id === id);
  }

  getFocus$(): Observable<string | null> {
    return this.focusedAppId.asObservable();
  }

  getFocusedAppId(){
    return this.focusedAppId.getValue();
  }

  closeAllApps() {
    this.applications = [];
  }
}
