import {AppEntry, AppType} from './application-manager.models';
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
