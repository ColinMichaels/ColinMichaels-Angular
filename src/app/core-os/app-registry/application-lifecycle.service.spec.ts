import {
  ApplicationLifecycleService as LegacyApplicationLifecycleService
} from '../../components/game/services/application-lifecycle.service';
import {ApplicationFactory} from './application-factory';
import {AppEntry, AppType} from './application-manager.models';
import {ApplicationLifecycleService} from './application-lifecycle.service';
import {ApplicationStatePersistenceService} from './application-state-persistence.service';
import {LogService} from '../../components/game/services/log.service';
import {NotificationService} from '../../components/game/services/notification.service';

class TestComponent {
}

function createAppEntry(overrides: Partial<AppEntry> = {}): AppEntry {
  return {
    id: 'cli',
    title: 'CLI',
    component: TestComponent,
    maxInstances: 5,
    instanceIndex: 0,
    type: AppType.system,
    memory: 256,
    installed: true,
    ...overrides
  };
}

describe('ApplicationLifecycleService', () => {
  let service: ApplicationLifecycleService;
  let persistenceMock: jasmine.SpyObj<Pick<ApplicationStatePersistenceService, 'loadOpenApplicationIds' | 'saveOpenApplicationIds'>>;

  beforeEach(() => {
    persistenceMock = jasmine.createSpyObj<Pick<ApplicationStatePersistenceService, 'loadOpenApplicationIds' | 'saveOpenApplicationIds'>>(
      'ApplicationStatePersistenceService',
      ['loadOpenApplicationIds', 'saveOpenApplicationIds']
    );
    persistenceMock.loadOpenApplicationIds.and.returnValue([]);

    const notifyMock = jasmine.createSpyObj<Pick<NotificationService, 'show'>>('NotificationService', ['show']);
    const loggerMock = jasmine.createSpyObj<Pick<LogService, 'debug'>>('LogService', ['debug']);

    service = new ApplicationLifecycleService(
      new ApplicationFactory(),
      notifyMock as unknown as NotificationService,
      loggerMock as unknown as LogService,
      persistenceMock as unknown as ApplicationStatePersistenceService
    );
  });

  it('keeps the legacy import on the canonical root service token', () => {
    expect(LegacyApplicationLifecycleService).toBe(ApplicationLifecycleService);
  });

  it('opens an application and passes params into the created instance', () => {
    const args = {path: 'trash'};
    const app = createAppEntry({id: 'finder', title: 'Finder'});

    const result = service.openApplication(app.id, app, args);

    expect(result).toBeTrue();
    expect(service.openApplications.length).toBe(1);
    expect(service.openApplications[0].id).toBe('finder');
    expect(service.openApplications[0].params).toEqual(args);
    expect(service.openApplications[0].running).toBeTrue();
    expect(service.openApplications[0].instanceIndex).toBe(1);
  });

  it('focuses an existing running app when opening without forceNewInstance', () => {
    const app = createAppEntry();
    service.openApplication(app.id, app);

    const result = service.openApplication(app.id, app);

    expect(result).toBeTrue();
    expect(service.openApplications.length).toBe(1);
    expect(service.getFocusedAppId()).toBe('cli');
  });

  it('delivers new activation params to an existing running app', () => {
    const app = createAppEntry({id: 'finder', title: 'Finder'});
    service.openApplication(app.id, app, {path: '/'});

    const result = service.openApplication(app.id, app, {path: 'trash'});

    expect(result).toBeTrue();
    expect(service.openApplications.length).toBe(1);
    expect(service.openApplications[0].params).toEqual({path: 'trash'});
    expect(service.getFocusedAppId()).toBe('finder');
  });

  it('minimizes a focused app, advances focus, and restores it through normal activation', () => {
    const cli = createAppEntry({id: 'cli', title: 'CLI'});
    const finder = createAppEntry({id: 'finder', title: 'Finder'});
    service.openApplication(cli.id, cli);
    service.openApplication(finder.id, finder);

    expect(service.minimizeApplication('finder')).toBeTrue();
    expect(service.getAppByID('finder')?.minimized).toBeTrue();
    expect(service.getFocusedAppId()).toBe('cli');

    expect(service.openApplication(finder.id, finder)).toBeTrue();
    expect(service.getAppByID('finder')?.minimized).toBeFalse();
    expect(service.getFocusedAppId()).toBe('finder');
  });

  it('focuses the desktop when the final visible window is minimized or closed', () => {
    const app = createAppEntry();
    service.openApplication(app.id, app);

    expect(service.minimizeApplication(app.id)).toBeTrue();
    expect(service.getFocusedAppId()).toBe('desktop');

    service.setApplicationFocus(app.id);
    service.closeApplication(app.id);
    expect(service.getFocusedAppId()).toBe('desktop');
  });

  it('creates unique IDs when force opening additional instances', () => {
    const app = createAppEntry();
    service.openApplication(app.id, app);
    service.openApplication(app.id, app, undefined, true);
    service.openApplication(app.id, app, undefined, true);

    service.closeApplication('cli-2');
    service.openApplication(app.id, app, undefined, true);

    const ids = service.openApplications.map((application) => application.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('persists open applications by base app id for restore safety', () => {
    const app = createAppEntry();
    service.openApplication(app.id, app);
    service.openApplication(app.id, app, undefined, true);

    const lastSaveArgs = persistenceMock.saveOpenApplicationIds.calls.mostRecent().args;
    expect(lastSaveArgs[0]).toBe('applications');
    expect(lastSaveArgs[1]).toEqual(['cli', 'cli']);
  });

  it('does not mutate registry app entry runtime flags when opening and closing', () => {
    const app = createAppEntry();

    service.openApplication(app.id, app);
    service.closeApplication('cli');

    expect(app.running).toBeUndefined();
    expect(app.instanceIndex).toBe(0);
  });
});
