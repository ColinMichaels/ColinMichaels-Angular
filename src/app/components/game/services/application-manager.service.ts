import {Injectable, Type} from '@angular/core';
import {NotificationService} from './notification.service';
import {IMediaItem} from './media.service';
import {
  faChartSimple,
  faCircleInfo, faCloudSunRain, faCogs,
  faComputer,
  faExclamationTriangle, faHexagonNodesBolt, faIcons, faKeyboard, faMusic, faNoteSticky,
  faPerson, faRocket
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
import {IconPlaygroundComponent} from '../apps/icon-playground/icon-playground.component';
import {TaskAppComponent} from '../apps/task-app/task-app.component';
import {MusicPlayerComponent} from '../apps/music-player/music-player.component';
import {SpaceXComponent} from '../apps/space-x/space-x.component';
import {LogService} from './log.service';
import {PianoComponent} from '../apps/music-apps/piano/piano.component';
import {PatchEditorComponent} from '../apps/music-apps/patch-editor/patch-editor.component';
import {WeatherComponent} from '../apps/weather/weather.component';

export interface ApplicationInstance extends AppEntry {
  id: string;
  title: string;
  parent: AppEntry | null;
  component: Type<any>;
  autofit: boolean;
  windowSize?: {
    width?: number;
    height?: number;
  };
  maxInstances: number;
  instanceIndex: number;
  type: 'system' | 'other' | 'app',
  memory: number; // in MB
  offsetX?: number;
  offsetY?: number;
  icon?: {
    class?: string;
    svgPath?: any;
  },
  running?: boolean;
  focused?: boolean;
  params?: any;
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
  windowSize?: {
    width?: number;
    height?: number;
  };
  installed: boolean;
  running?: boolean;
  focused?: boolean;
  params?: any;
}

export enum AppType {
  system = 'system',
  app = 'app',
  other = 'other'
}

export const WINDOW_WIDTH_MIN = 480;
export const WINDOW_WIDTH_MAX = 1024
export const WINDOW_HEIGHT_MIN = 480;
export const WINDOW_HEIGHT_MAX = 1024;

export const DEFAULT_WINDOW_OFFSET_Y = 40;
export const DEFAULT_WINDOW_OFFSET_X = 40;

const INSTANCE_LIMIT_ERROR_MESSAGE = "Cannot open application. Maximum number of instances reached.";
const INSTANCE_LIMIT_ERROR_TITLE = "System Error";


export enum APP_ID {
  cli = 'cli',
  finder = 'finder',
  about = 'about',
  player_config = 'player-config',
  music_piano = 'music-piano',
  music_patch_editor = 'music-patch-editor',
  activity_monitor = 'activity-monitor',
  system_settings = 'system-settings',
  markdown_reader = 'markdown-reader',
  music_player = 'music-player',
  tailwind_preview = 'tailwind-preview',
  tasks_app = 'tasks',
  tooltip_example = 'tooltip-example',
  space_x_app = 'space-x-app',
  icon_playground = 'icon-playground',
  weather_app = 'weather-app',
}

@Injectable({providedIn: 'root'})
export class ApplicationManagerService {
  private applications: BehaviorSubject<ApplicationInstance[]> = new BehaviorSubject<ApplicationInstance[]>([]);
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
    private notify: NotificationService,
    private logger: LogService
  ) {
    this.registerApps();
    this.registerSystemApps();
    this.loadSavedApplications();
  }

  private registerApps() {

    this.registerApp({
      id: APP_ID.player_config,
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
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.tooltip_example,
      title: 'Tooltip Example',
      component: TooltipExamplesComponent,
      installed: true,
      icon: {
        class: 'text-teal-500/80 text-[20px] p-0.5 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faCogs
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.tasks_app,
      title: 'Tasks',
      component: TaskAppComponent,
      installed: true,
      autofit: true,
      icon: {
        class: 'text-white/80 text-[20px] p-0.5 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faNoteSticky
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.music_player,
      title: 'Music',
      component: MusicPlayerComponent,
      installed: true,
      windowSize: {height: 400, width: 200},
      autofit: true,
      icon: {
        class: 'text-white bg-red-600 text-[18px] p-1 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faMusic
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.weather_app,
      title: 'Weather',
      component: WeatherComponent,
      installed: true,
      windowSize: {height: 600, width: 800},
      autofit: true,
      icon: {
        class: 'text-blue-900 bg-blue-400 text-[18px] p-1 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faCloudSunRain
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.music_piano,
      title: 'Piano',
      component: PianoComponent,
      installed: true,
      windowSize: {height: 400, width: 1000},
      autofit: true,
      icon: {
        class: 'text-white bg-red-600 text-[18px] p-1 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faKeyboard
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.music_patch_editor,
      title: 'Patch Editor',
      component: PatchEditorComponent,
      installed: true,
      windowSize: {height: 600, width: 600},
      autofit: false,
      icon: {
        class: 'text-black bg-yellow-600 text-[18px] p-1 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faHexagonNodesBolt
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    });


    this.registerApp({
      id: APP_ID.space_x_app,
      title: 'Space X Launches',
      component: SpaceXComponent,
      installed: true,
      windowSize: {height: 400, width: 200},
      autofit: false,
      icon: {
        class: 'text-white p-1 rounded-lg border-2 border-zinc-700',
        svgPath: faRocket
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.markdown_reader,
      title: '',
      component: MarkdownReaderComponent,
      installed: true,
      icon: {
        class: '',
        svgPath: faCogs
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.system,
      params: {file: 'cipher.md'},
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.tailwind_preview,
      title: 'Tailwind Playground',
      component: TailwindPreviewComponent,
      installed: true,
      icon: {
        class: 'text-white/80 text-[20px] py-1 px-1.5 rounded-lg border-2 border-zinc-700',
        svgPath: faCss
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.icon_playground,
      title: 'Icon Playground',
      component: IconPlaygroundComponent,
      installed: true,
      icon: {
        class: 'bg-purple-500 text-black/80 p-1 text-[18px] rounded-lg shadow-lg border-2 border-purple-700',
        svgPath: faIcons
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    });
  }

  private registerSystemApps() {

    this.registerApp({
      id: APP_ID.activity_monitor,
      title: 'Activity Monitor',
      component: ActivityMonitorComponent,
      installed: true,
      icon: {
        class: 'bg-zinc-900 text-sm p-2 rounded-sm shadow-sm border-2 border-zinc-700 text-green-500',
        svgPath: faChartSimple
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.system,
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.cli,
      title: 'cli Console',
      component: CliGameComponent,
      installed: true,
      icon: {
        class: 'bg-zinc-900 text-green-500 rounded p-1 shadow-lg border-2 border-zinc-500 text-base',
        svgPath: faComputer
      },
      memory: 1024,
      maxInstances: 5,
      type: AppType.system,
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.finder,
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
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.system_settings,
      title: 'System Settings',
      component: SettingsPanelComponent,
      installed: true,
      icon: {
        class: 'text-white/80 text-[20px] p-0.5 rounded-lg inner-shadow border-2 border-zinc-700 text-zinc-800',
        svgPath: faCogs
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.system,
      instanceIndex: 0
    });

    this.registerApp({
      id: APP_ID.about,
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
      instanceIndex: 0
    });

  }

  private loadSavedApplications() {
    const savedApps = localStorage.getItem('applications');
    if (savedApps) {
      JSON.parse(savedApps).map((a: { id: any; }) => a.id).map((id: string) => this.openApplication(id));
    }
  }

  get openApplications(): ApplicationInstance[] {
    return this.applications.getValue();
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
    return this.applications.getValue().reduce((sum, t) => sum + t.memory, 16);
  }

  get registeredApps(): AppEntry[] {
    return this.appRegistry;
  }

  registerApp(app: AppEntry) {
    if (!this.appRegistry.some(a => a.id === app.id)) {
      this.appRegistry.push(app);
    }
  }

  unregisterApp(id: string) {
    this.appRegistry = this.appRegistry.filter(a => a.id !== id);
  }

  openApplication(id: string, args?: []): boolean {
    const app = this.appRegistry.find(a => a.id === id && a.installed);

    this.logger.debug('args', args);

    const focusId = this.focusedAppId.getValue();

    if (focusId === id || app?.running) {
      return !this.setApplicationFocus(id);
    }
    if (!app) return false;

    if (this.usedMemory + app.memory > this.maxMemory) {
      this.showErrorNotification('Not enough memory to open application', 'System Error');
      return false;
    }

    const lastApplication = this.applications.value[this.applications.value.length - 1];

    const newOffsetX = lastApplication?.offsetX !== undefined
      ? lastApplication.offsetX + DEFAULT_WINDOW_OFFSET_X
      : DEFAULT_WINDOW_OFFSET_X;

    const newOffsetY = lastApplication?.offsetY !== undefined
      ? lastApplication.offsetY + DEFAULT_WINDOW_OFFSET_Y
      : DEFAULT_WINDOW_OFFSET_Y;

    if (this.isInstanceLimitReached(app)) {
      return false;
    }

    const isNewInstanceNeeded = !!this.applications.value.find(t => t.id === id);

    const curAppIndex = this.applications.value.length + 1;

    const newAppInstanceId = isNewInstanceNeeded ? `${id}-${curAppIndex}` : id;


    app.instanceIndex = isNewInstanceNeeded ? app.instanceIndex + 1 : app.instanceIndex;
    app.running = true;

    this.applications.next([...this.applications.value, this.appFactory
      .createInstance(newAppInstanceId, app, newOffsetX, newOffsetY)]);


    this.saveOpenApplications();

    const focusSuccessful = this.setApplicationFocus(newAppInstanceId, newOffsetX, newOffsetY);

    if (!focusSuccessful) {
      this.showErrorNotification(`Failed to set focus for app with id: ${newAppInstanceId}`, 'System Error');
      this.notify.show({
        message: `Failed to set focus for terminal with id: ${newAppInstanceId}`,
        title: "Terminal Error",
        type: "error",
        media: this.notifyTemplate,
      });
      return false;
    }
    return true;
  }

  private isInstanceLimitReached(app: AppEntry): boolean {
    if (app.instanceIndex < app.maxInstances) {
      app.instanceIndex += 1; // Increment instanceIndex when under limit
      return false;
    }

    if (app.maxInstances === 1) {
      return true;
    }

    // General case when maxInstances limit is reached
    this.showErrorNotification(INSTANCE_LIMIT_ERROR_MESSAGE, INSTANCE_LIMIT_ERROR_TITLE);
    return true;
  }

  private showErrorNotification(message: string, title: string): void {
    this.notify.show({
      message,
      title,
      type: "error",
      media: this.notifyTemplate,
    });
  }


  saveOpenApplications() {
    localStorage.setItem('applications', JSON.stringify(this.applications.value));
  }

  closeApplication(id: string, args?: any): void {
    const application = this.getAppByID(id);
    if (!application) return;
    // Mark the application as no longer running
    application.running = false;
    // Decrement the instanceIndex for the parent AppEntry
    if (application.parent) {
      application.parent.instanceIndex = Math.max(0, application.parent.instanceIndex - 1);
      application.parent.running = application.parent.instanceIndex > 0;
    }

    application.instanceIndex = 0;

    // Remove the application from the active applications list
    this.applications.next(this.applications.getValue().filter(app => app.id !== id));

    // Save the state of opened applications
    this.saveOpenApplications();
  }

  setApplicationFocus(id: string, offsetX?: number, offsetY?: number): boolean {
    const application = this.applications.value.find(t => t.id === id);
    if (id === 'desktop') {
      this.focusedAppId.next(id);
      return true;
    }
    if (!application) {
      return false;
    }
    this.focusedAppId.next(id);
    application.focused = true;
    application.offsetX = offsetX ?? 40;
    application.offsetY = offsetY ?? 40;

    // Move application to top of stack without recreating it
    const index = this.applications.value.findIndex(t => t.id === id);
    if (index !== -1) {
      this.applications.next([
        ...this.applications.value.slice(0, index),
        ...this.applications.value.slice(index + 1),
        application
      ]);
    }
    return true;
  }

  getAppByID(id: string): ApplicationInstance | undefined {
    return this.applications.value.find(t => t.id === id);
  }

  getFocus$(): Observable<string | null> {
    return this.focusedAppId.asObservable();
  }

  getFocusedAppId() {
    return this.focusedAppId.getValue();
  }

  closeAllApps() {
    this.applications.getValue().forEach(app => this.closeApplication(app.id));
  }

  getCurrentApp() {
    // Get current focused app
    const focusedAppId = this.getFocusedAppId();
    return this.openApplications.find(app => app.id === focusedAppId);
  }
}
