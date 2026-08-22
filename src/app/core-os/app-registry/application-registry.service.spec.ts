import {
  getDefaultApplicationCatalog as getLegacyApplicationCatalog
} from '../../components/game/services/application-catalog';
import {APP_ID as LEGACY_APP_ID} from '../../components/game/services/application-manager.models';
import {
  ApplicationRegistryService as LegacyApplicationRegistryService
} from '../../components/game/services/application-registry.service';
import {getDefaultApplicationCatalog} from './application-catalog';
import {APP_ID, AppEntry, AppType} from './application-manager.models';
import {ApplicationRegistryService} from './application-registry.service';

class TestComponent {
}

function createAppEntry(overrides: Partial<AppEntry> = {}): AppEntry {
  return {
    id: 'test-app',
    title: 'Test App',
    component: TestComponent,
    maxInstances: 1,
    instanceIndex: 0,
    type: AppType.app,
    memory: 128,
    installed: true,
    ...overrides
  };
}

describe('ApplicationRegistryService', () => {
  it('keeps every default app id unique and in the established catalog order', () => {
    const ids = getDefaultApplicationCatalog().map((app) => app.id);

    expect(ids).toEqual([
      APP_ID.player_config,
      APP_ID.tooltip_example,
      APP_ID.tasks_app,
      APP_ID.music_player,
      APP_ID.weather_app,
      APP_ID.music_piano,
      APP_ID.music_patch_editor,
      APP_ID.space_x_app,
      APP_ID.messages_app,
      APP_ID.chat_bot,
      APP_ID.markdown_reader,
      APP_ID.tailwind_preview,
      APP_ID.icon_playground,
      APP_ID.activity_monitor,
      APP_ID.cli,
      APP_ID.finder,
      APP_ID.system_settings,
      APP_ID.about
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preserves registration, installed lookup, filtering, and duplicate protection', () => {
    const service = new ApplicationRegistryService();
    const customApp = createAppEntry();
    const uninstalledApp = createAppEntry({id: 'uninstalled-app', installed: false, type: AppType.system});

    service.registerApp(customApp);
    service.registerApp(customApp);
    service.registerApp(uninstalledApp);

    expect(service.registeredApps.filter((app) => app.id === customApp.id).length).toBe(1);
    expect(service.getApps(AppType.system)).toContain(uninstalledApp);
    expect(service.getInstalledAppById(customApp.id)).toBe(customApp);
    expect(service.getInstalledAppById(uninstalledApp.id)).toBeUndefined();

    service.unregisterApp(customApp.id);
    expect(service.registeredApps.some((app) => app.id === customApp.id)).toBeFalse();
  });

  it('keeps legacy imports on the canonical catalog, model, and service symbols', () => {
    expect(getLegacyApplicationCatalog).toBe(getDefaultApplicationCatalog);
    expect(LEGACY_APP_ID).toBe(APP_ID);
    expect(LegacyApplicationRegistryService).toBe(ApplicationRegistryService);
  });
});
