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

  it('resolves installed file handlers by MIME type, extension, and legacy file kind', () => {
    const service = new ApplicationRegistryService();

    expect(service.getInstalledAppForFile({
      id: 'markdown',
      name: 'Release Notes.bin',
      virtualPath: '/Documents/Release Notes.bin',
      type: 'document',
      mimeType: 'Text/Markdown; charset=utf-8',
    })?.id).toBe(APP_ID.markdown_reader);
    expect(service.getInstalledAppForFile({
      id: 'text',
      name: 'README.MD',
      virtualPath: '/Documents/README.MD',
      type: 'document',
    })?.id).toBe(APP_ID.markdown_reader);
    expect(service.getInstalledAppForFile({
      id: 'audio',
      name: 'recording.unknown',
      virtualPath: '/Music/recording.unknown',
      type: 'audio',
    })?.id).toBe(APP_ID.music_player);
    expect(service.getInstalledAppForFile({
      id: 'image',
      name: 'sunset.jpg',
      virtualPath: '/Photos/sunset.jpg',
      type: 'image',
      mimeType: 'image/jpeg',
    })).toBeUndefined();
  });

  it('prefers exact MIME handlers over wildcard, extension, and file-kind handlers', () => {
    const service = new ApplicationRegistryService();
    const exactHandler = createAppEntry({
      id: 'exact-audio-handler',
      fileAssociations: {mimeTypes: ['audio/mpeg']},
    });
    service.registerApp(exactHandler);

    expect(service.getInstalledAppForFile({
      id: 'audio',
      name: 'recording.mp3',
      virtualPath: '/Music/recording.mp3',
      type: 'audio',
      mimeType: 'audio/mpeg',
    })).toBe(exactHandler);

    expect(service.getInstalledAppForFile({
      id: 'misleading-audio-name',
      name: 'recording.md',
      virtualPath: '/Music/recording.md',
      type: 'document',
      mimeType: 'audio/ogg',
    })?.id).toBe(APP_ID.music_player);
  });

  it('uses extension fallback only for missing or generic MIME metadata', () => {
    const service = new ApplicationRegistryService();

    expect(service.getInstalledAppForFile({
      id: 'generic-markdown',
      name: 'Release.Notes.MD',
      virtualPath: '/Documents/Release.Notes.MD',
      type: 'document',
      mimeType: 'application/octet-stream',
    })?.id).toBe(APP_ID.markdown_reader);
    expect(service.getInstalledAppForFile({
      id: 'conflicting-markdown',
      name: 'Release Notes.md',
      virtualPath: '/Documents/Release Notes.md',
      type: 'document',
      mimeType: 'image/jpeg',
    })).toBeUndefined();
    expect(service.getInstalledAppForFile({
      id: 'dotfile',
      name: '.md',
      virtualPath: '/Documents/.md',
      type: 'document',
    })).toBeUndefined();
  });

  it('keeps association ties deterministic in catalog registration order', () => {
    const service = new ApplicationRegistryService();
    const firstHandler = createAppEntry({
      id: 'first-note-handler',
      fileAssociations: {extensions: ['notez']},
    });
    const secondHandler = createAppEntry({
      id: 'second-note-handler',
      fileAssociations: {extensions: ['notez']},
    });
    service.registerApp(firstHandler);
    service.registerApp(secondHandler);

    expect(service.getInstalledAppForFile({
      id: 'note',
      name: 'release.notez',
      virtualPath: '/Documents/release.notez',
      type: 'document',
    })).toBe(firstHandler);
  });

  it('does not dispatch files to uninstalled handlers', () => {
    const service = new ApplicationRegistryService();
    const uninstalledHandler = createAppEntry({
      id: 'pdf-viewer',
      installed: false,
      fileAssociations: {extensions: ['pdf']},
    });
    service.registerApp(uninstalledHandler);

    expect(service.getInstalledAppForFile({
      id: 'pdf',
      name: 'resume.pdf',
      virtualPath: '/resume.pdf',
      type: 'document',
    })).toBeUndefined();
  });

  it('keeps legacy imports on the canonical catalog, model, and service symbols', () => {
    expect(getLegacyApplicationCatalog).toBe(getDefaultApplicationCatalog);
    expect(LEGACY_APP_ID).toBe(APP_ID);
    expect(LegacyApplicationRegistryService).toBe(ApplicationRegistryService);
  });
});
