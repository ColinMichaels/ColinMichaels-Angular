import {TestBed} from '@angular/core/testing';
import {
  ApplicationManagerService as LegacyApplicationManagerService
} from '../../components/game/services/application-manager.service';
import {APP_ID, AppEntry, AppType} from './application-manager.models';
import {ApplicationLifecycleService} from './application-lifecycle.service';
import {ApplicationManagerService} from './application-manager.service';
import {ApplicationRegistryService} from './application-registry.service';

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

describe('ApplicationManagerService', () => {
  afterEach(() => {
    localStorage.removeItem('applications');
    TestBed.resetTestingModule();
  });

  it('resolves canonical and legacy manager imports to one root instance', () => {
    localStorage.removeItem('applications');
    TestBed.configureTestingModule({});

    expect(LegacyApplicationManagerService).toBe(ApplicationManagerService);
    expect(TestBed.inject(LegacyApplicationManagerService)).toBe(TestBed.inject(ApplicationManagerService));
  });

  it('launches, focuses, persists, and closes an app through the real root runtime graph', () => {
    localStorage.removeItem('applications');
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ApplicationManagerService);

    expect(service.openApplication(APP_ID.about)).toBeTrue();
    expect(service.openApplication(APP_ID.about)).toBeTrue();
    expect(service.openApplications.map((app) => app.id)).toEqual([APP_ID.about]);
    expect(service.getFocusedAppId()).toBe(APP_ID.about);
    expect(localStorage.getItem('applications')).toBe('["about"]');

    service.closeApplication(APP_ID.about);
    expect(service.openApplications).toEqual([]);
    expect(localStorage.getItem('applications')).toBe('[]');
  });

  it('restores a legacy object snapshot through the real registry and lifecycle graph', () => {
    localStorage.setItem('applications', JSON.stringify([{id: APP_ID.finder}]));
    TestBed.configureTestingModule({});

    const service = TestBed.inject(ApplicationManagerService);

    expect(service.openApplications.map((app) => app.id)).toEqual([APP_ID.finder]);
    expect(service.getFocusedAppId()).toBe(APP_ID.finder);
    expect(localStorage.getItem('applications')).toBe('["finder"]');
  });

  it('normalizes saved instance ids and restores repeated apps as new instances', () => {
    const app = createAppEntry();

    const registryMock = jasmine.createSpyObj<Pick<ApplicationRegistryService, 'getInstalledAppById'>>(
      'ApplicationRegistryService',
      ['getInstalledAppById']
    );
    registryMock.getInstalledAppById.and.callFake((id: string) => id === 'cli' ? app : undefined);

    const lifecycleMock = jasmine.createSpyObj<Pick<ApplicationLifecycleService, 'loadSavedApplicationIds' | 'openApplication'>>(
      'ApplicationLifecycleService',
      ['loadSavedApplicationIds', 'openApplication']
    );
    lifecycleMock.loadSavedApplicationIds.and.returnValue(['cli', 'cli-2', 'unknown-3']);
    lifecycleMock.openApplication.and.returnValue(true);

    new ApplicationManagerService(
      registryMock as unknown as ApplicationRegistryService,
      lifecycleMock as unknown as ApplicationLifecycleService
    );

    expect(lifecycleMock.openApplication.calls.allArgs()).toEqual([
      ['cli', app, undefined, false],
      ['cli', app, undefined, true]
    ]);
  });

  it('delegates openApplication to lifecycle using resolved app registry entry', () => {
    const app = createAppEntry({id: 'finder', title: 'Finder'});

    const registryMock = jasmine.createSpyObj<Pick<ApplicationRegistryService, 'getInstalledAppById'>>(
      'ApplicationRegistryService',
      ['getInstalledAppById']
    );
    registryMock.getInstalledAppById.and.callFake((id: string) => id === 'finder' ? app : undefined);

    const lifecycleMock = jasmine.createSpyObj<Pick<ApplicationLifecycleService, 'loadSavedApplicationIds' | 'openApplication'>>(
      'ApplicationLifecycleService',
      ['loadSavedApplicationIds', 'openApplication']
    );
    lifecycleMock.loadSavedApplicationIds.and.returnValue([]);
    lifecycleMock.openApplication.and.returnValue(true);

    const service = new ApplicationManagerService(
      registryMock as unknown as ApplicationRegistryService,
      lifecycleMock as unknown as ApplicationLifecycleService
    );

    const args = {path: 'trash'};
    const result = service.openApplication('finder', args);

    expect(result).toBeTrue();
    expect(lifecycleMock.openApplication).toHaveBeenCalledWith('finder', app, args);
  });

  it('opens a file through its registered handler with an honest metadata-only contract', () => {
    const app = createAppEntry({id: APP_ID.markdown_reader, title: 'Markdown Reader'});
    const file = {
      id: 'release-notes',
      name: 'Release Notes.md',
      virtualPath: '/Documents/Release Notes.md',
      type: 'document',
      mimeType: 'text/markdown',
      size: 512,
    };
    const registryMock = jasmine.createSpyObj<Pick<
      ApplicationRegistryService,
      'getInstalledAppById' | 'getInstalledAppForFile'
    >>('ApplicationRegistryService', ['getInstalledAppById', 'getInstalledAppForFile']);
    registryMock.getInstalledAppForFile.and.returnValue(app);
    const lifecycleMock = jasmine.createSpyObj<Pick<
      ApplicationLifecycleService,
      'loadSavedApplicationIds' | 'openApplication'
    >>('ApplicationLifecycleService', ['loadSavedApplicationIds', 'openApplication']);
    lifecycleMock.loadSavedApplicationIds.and.returnValue([]);
    lifecycleMock.openApplication.and.returnValue(true);
    const service = new ApplicationManagerService(
      registryMock as unknown as ApplicationRegistryService,
      lifecycleMock as unknown as ApplicationLifecycleService
    );

    expect(service.open({file, content: {kind: 'metadata-only'}})).toEqual({
      status: 'metadata-preview-launched',
      appId: APP_ID.markdown_reader,
      appTitle: 'Markdown Reader',
    });
    expect(lifecycleMock.openApplication).toHaveBeenCalledWith(APP_ID.markdown_reader, app, {
      source: 'finder',
      content: {kind: 'metadata-only'},
      file,
    });
  });

  it('reports unsupported and failed file activation without claiming success', () => {
    const app = createAppEntry({id: APP_ID.music_player, title: 'Music'});
    const file = {id: 'song', name: 'song.mp3', virtualPath: '/Music/song.mp3', type: 'audio'};
    const registryMock = jasmine.createSpyObj<Pick<
      ApplicationRegistryService,
      'getInstalledAppById' | 'getInstalledAppForFile'
    >>('ApplicationRegistryService', ['getInstalledAppById', 'getInstalledAppForFile']);
    const lifecycleMock = jasmine.createSpyObj<Pick<
      ApplicationLifecycleService,
      'loadSavedApplicationIds' | 'openApplication'
    >>('ApplicationLifecycleService', ['loadSavedApplicationIds', 'openApplication']);
    lifecycleMock.loadSavedApplicationIds.and.returnValue([]);
    lifecycleMock.openApplication.and.returnValue(false);
    const service = new ApplicationManagerService(
      registryMock as unknown as ApplicationRegistryService,
      lifecycleMock as unknown as ApplicationLifecycleService
    );

    expect(service.open({file, content: {kind: 'metadata-only'}})).toEqual({status: 'unsupported'});
    expect(lifecycleMock.openApplication).not.toHaveBeenCalled();

    registryMock.getInstalledAppForFile.and.returnValue(app);
    expect(service.open({file, content: {kind: 'metadata-only'}})).toEqual({
      status: 'failed',
      appId: APP_ID.music_player,
      appTitle: 'Music',
    });
  });

  it('derives app running state from lifecycle instances without mutating registry app entries', () => {
    const app = createAppEntry({id: 'finder', title: 'Finder', instanceIndex: 0});
    const registryApps = [app];

    const registryMock = jasmine.createSpyObj<Pick<ApplicationRegistryService, 'getInstalledAppById' | 'getApps'> & {
      registeredApps: AppEntry[]
    }>(
      'ApplicationRegistryService',
      ['getInstalledAppById', 'getApps'],
      {registeredApps: registryApps}
    );
    registryMock.getInstalledAppById.and.callFake((id: string) => id === 'finder' ? app : undefined);
    registryMock.getApps.and.returnValue(registryApps);

    const lifecycleMock = jasmine.createSpyObj<Pick<ApplicationLifecycleService, 'loadSavedApplicationIds' | 'openApplication'> & {
      openApplications: unknown[]
    }>(
      'ApplicationLifecycleService',
      ['loadSavedApplicationIds', 'openApplication'],
      {
        openApplications: [
          {
            id: 'finder',
            parent: {id: 'finder'}
          },
          {
            id: 'finder-2',
            parent: {id: 'finder'}
          }
        ]
      }
    );
    lifecycleMock.loadSavedApplicationIds.and.returnValue([]);

    const service = new ApplicationManagerService(
      registryMock as unknown as ApplicationRegistryService,
      lifecycleMock as unknown as ApplicationLifecycleService
    );

    const runtimeApp = service.getApps('app')[0];
    const runtimeRegisteredApp = service.registeredApps[0];

    expect(runtimeApp.running).toBeTrue();
    expect(runtimeApp.instanceIndex).toBe(2);
    expect(runtimeRegisteredApp.running).toBeTrue();
    expect(runtimeRegisteredApp.instanceIndex).toBe(2);
    expect(app.running).toBeUndefined();
    expect(app.instanceIndex).toBe(0);
  });
});
