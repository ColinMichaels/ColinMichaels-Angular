import {ApplicationFactory as LegacyApplicationFactory} from '../../components/game/factories/application-factory';
import {AppEntry, AppType} from './application-manager.models';
import {ApplicationFactory} from './application-factory';

class TestComponent {
}

function createAppEntry(overrides: Partial<AppEntry> = {}): AppEntry {
  return {
    id: 'test-app',
    title: 'Test App',
    component: TestComponent,
    maxInstances: 2,
    instanceIndex: 0,
    type: AppType.app,
    memory: 256,
    installed: true,
    ...overrides
  };
}

describe('ApplicationFactory', () => {
  it('keeps the legacy import on the canonical root service token', () => {
    expect(LegacyApplicationFactory).toBe(ApplicationFactory);
  });

  it('creates a runtime instance without mutating or cloning its registry parent', () => {
    const app = createAppEntry({params: {source: 'catalog'}});

    const instance = new ApplicationFactory().createInstance('test-app', app, 40, 80);

    expect(instance).toEqual(jasmine.objectContaining({
      id: 'test-app',
      title: 'Test App',
      memory: 256,
      maxInstances: 2,
      offsetX: 40,
      offsetY: 80,
      running: true,
      installed: true,
      instanceIndex: 1,
      autofit: false,
      params: {source: 'catalog'}
    }));
    expect(instance.parent).toBe(app);
    expect(app.running).toBeUndefined();
    expect(app.instanceIndex).toBe(0);
  });

  it('preserves explicit launch parameters and valid instance indexes', () => {
    const app = createAppEntry({memory: 0, autofit: true, focused: true});
    const params = {path: 'documents'};

    const instance = new ApplicationFactory().createInstance('test-app-2', app, 60, 100, params, 2);

    expect(instance.memory).toBe(64);
    expect(instance.autofit).toBeTrue();
    expect(instance.focused).toBeTrue();
    expect(instance.instanceIndex).toBe(2);
    expect(instance.params).toBe(params);
  });
});
