import {Injectable} from '@angular/core';
import {faExclamationTriangle} from '@fortawesome/free-solid-svg-icons';
import {BehaviorSubject, Observable} from 'rxjs';
import {ApplicationFactory} from './application-factory';
import {
  AppEntry,
  ApplicationInstance,
  AppType,
  DEFAULT_WINDOW_OFFSET_X,
  DEFAULT_WINDOW_OFFSET_Y
} from './application-manager.models';
import {NotificationService} from '../../components/game/services/notification.service';
import {IMediaItem} from '../../components/game/services/media.service';
import {ApplicationStatePersistenceService} from './application-state-persistence.service';
import {LogService} from '../../components/game/services/log.service';

const INSTANCE_LIMIT_ERROR_MESSAGE = 'Cannot open application. Maximum number of instances reached.';
const INSTANCE_LIMIT_ERROR_TITLE = 'System Error';
const OPEN_APPS_STORAGE_KEY = 'applications';

@Injectable({providedIn: 'root'})
export class ApplicationLifecycleService {
  private readonly applications = new BehaviorSubject<ApplicationInstance[]>([]);
  private readonly focusedAppId = new BehaviorSubject<string | null>(null);
  private readonly maxMemory = 16 * 1024; // MB

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
  };

  constructor(
    private readonly appFactory: ApplicationFactory,
    private readonly notify: NotificationService,
    private readonly logger: LogService,
    private readonly applicationStatePersistence: ApplicationStatePersistenceService
  ) {
  }

  get openApplications(): ApplicationInstance[] {
    return this.applications.getValue();
  }

  get totalMemory(): number {
    return this.maxMemory;
  }

  get usedMemory(): number {
    return this.openApplications.reduce((sum, app) => sum + app.memory, 16);
  }

  getRunningApps(type: AppEntry['type'] = AppType.app): ApplicationInstance[] {
    return this.openApplications.filter((app) => app.type === type);
  }

  loadSavedApplicationIds(): string[] {
    return this.applicationStatePersistence.loadOpenApplicationIds(OPEN_APPS_STORAGE_KEY);
  }

  openApplication(appId: string, app?: AppEntry, args?: unknown, forceNewInstance = false): boolean {
    this.logger.debug('args', args);

    if (app && !forceNewInstance) {
      const existing = this.getMostRecentApplicationInstance(app.id);
      if (existing) {
        if (args !== undefined) {
          this.applications.next(this.applications.value.map((application) => (
            application.id === existing.id ? {...application, params: args} : application
          )));
        }
        this.setApplicationFocus(existing.id, existing.offsetX, existing.offsetY);
        return true;
      }
    }

    if (!app) {
      return false;
    }

    if (this.usedMemory + app.memory > this.maxMemory) {
      this.showErrorNotification('Not enough memory to open application', INSTANCE_LIMIT_ERROR_TITLE);
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

    const openInstanceCount = this.getOpenInstanceCount(app.id);
    const newAppInstanceId = this.getNextInstanceId(appId);
    const instanceIndex = openInstanceCount + 1;

    this.applications.next([
      ...this.applications.value,
      this.appFactory.createInstance(newAppInstanceId, app, newOffsetX, newOffsetY, args, instanceIndex)
    ]);

    this.saveOpenApplications();

    const focusSuccessful = this.setApplicationFocus(newAppInstanceId, newOffsetX, newOffsetY);
    if (!focusSuccessful) {
      this.showErrorNotification(`Failed to set focus for app with id: ${newAppInstanceId}`, INSTANCE_LIMIT_ERROR_TITLE);
      this.notify.show({
        message: `Failed to set focus for terminal with id: ${newAppInstanceId}`,
        title: 'Terminal Error',
        type: 'error',
        media: this.notifyTemplate,
      });
      return false;
    }

    return true;
  }

  closeApplication(id: string): void {
    const application = this.getAppByID(id);
    if (!application) {
      return;
    }

    const wasFocused = this.focusedAppId.getValue() === id;
    const remainingApplications = this.applications.getValue().filter((app) => app.id !== id);
    this.applications.next(remainingApplications);

    if (wasFocused) {
      const nextApplication = [...remainingApplications].reverse().find((openApp) => !openApp.minimized);
      if (nextApplication) {
        this.setApplicationFocus(nextApplication.id, nextApplication.offsetX, nextApplication.offsetY);
      } else {
        this.focusedAppId.next('desktop');
      }
    }

    this.saveOpenApplications();
  }

  closeAllApps(): void {
    this.applications.getValue().forEach((app) => this.closeApplication(app.id));
  }

  minimizeApplication(id: string): boolean {
    const application = this.getAppByID(id);
    if (!application || application.minimized) {
      return false;
    }

    const wasFocused = this.focusedAppId.getValue() === id;
    const minimizedApplications = this.applications.value.map((openApp) => ({
      ...openApp,
      focused: openApp.id === id ? false : openApp.focused,
      minimized: openApp.id === id ? true : openApp.minimized,
    }));
    this.applications.next(minimizedApplications);

    if (wasFocused) {
      const nextApplication = [...minimizedApplications]
        .reverse()
        .find((openApp) => !openApp.minimized);

      if (nextApplication) {
        this.setApplicationFocus(nextApplication.id, nextApplication.offsetX, nextApplication.offsetY);
      } else {
        this.focusedAppId.next('desktop');
      }
    }

    return true;
  }

  setApplicationFocus(id: string, offsetX?: number, offsetY?: number): boolean {
    const application = this.applications.value.find((app) => app.id === id);
    if (id === 'desktop') {
      this.focusedAppId.next(id);
      this.applications.next(this.applications.value.map((openApp) => ({...openApp, focused: false})));
      return true;
    }
    if (!application) {
      return false;
    }

    this.focusedAppId.next(id);
    const focusedApplication: ApplicationInstance = {
      ...application,
      focused: true,
      minimized: false,
      offsetX: offsetX ?? application.offsetX ?? DEFAULT_WINDOW_OFFSET_X,
      offsetY: offsetY ?? application.offsetY ?? DEFAULT_WINDOW_OFFSET_Y,
    };
    const backgroundApplications = this.applications.value
      .filter((openApp) => openApp.id !== id)
      .map((openApp) => ({...openApp, focused: false}));

    this.applications.next([...backgroundApplications, focusedApplication]);

    return true;
  }

  getAppByID(id: string): ApplicationInstance | undefined {
    return this.applications.value.find((app) => app.id === id);
  }

  getFocus$(): Observable<string | null> {
    return this.focusedAppId.asObservable();
  }

  getFocusedAppId(): string | null {
    return this.focusedAppId.getValue();
  }

  getCurrentApp(): ApplicationInstance | undefined {
    const focusedAppId = this.getFocusedAppId();
    return this.openApplications.find((app) => app.id === focusedAppId);
  }

  private isInstanceLimitReached(app: AppEntry): boolean {
    const openInstanceCount = this.getOpenInstanceCount(app.id);
    if (openInstanceCount < app.maxInstances) {
      return false;
    }

    if (app.maxInstances > 1) {
      this.showErrorNotification(INSTANCE_LIMIT_ERROR_MESSAGE, INSTANCE_LIMIT_ERROR_TITLE);
    }
    return true;
  }

  private showErrorNotification(message: string, title: string): void {
    this.notify.show({
      message,
      title,
      type: 'error',
      media: this.notifyTemplate,
    });
  }

  private saveOpenApplications(): void {
    const openAppIds = this.applications.value.map((app) => app.parent?.id ?? app.id);
    this.applicationStatePersistence.saveOpenApplicationIds(OPEN_APPS_STORAGE_KEY, openAppIds);
  }

  private getNextInstanceId(appId: string): string {
    const existingIds = new Set(
      this.applications.value
        .filter((openApp) => openApp.parent?.id === appId)
        .map((openApp) => openApp.id)
    );

    if (!existingIds.has(appId)) {
      return appId;
    }

    let suffix = 2;
    while (existingIds.has(`${appId}-${suffix}`)) {
      suffix++;
    }

    return `${appId}-${suffix}`;
  }

  private getOpenInstanceCount(appId: string): number {
    return this.applications.value.filter((openApp) => openApp.parent?.id === appId).length;
  }

  private getMostRecentApplicationInstance(appId: string): ApplicationInstance | undefined {
    const appInstances = this.applications.value.filter((openApp) => openApp.parent?.id === appId);
    return appInstances[appInstances.length - 1];
  }
}
