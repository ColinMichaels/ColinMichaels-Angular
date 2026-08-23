import {DockComponent as LegacyDockComponent} from '../components/game/system/dock/dock.component';
import {
  SystemTrayComponent as LegacySystemTrayComponent
} from '../components/game/system/system-tray/system-tray.component';

import {DockComponent} from './dock';
import {SystemTrayComponent} from './tray';

describe('Core OS dock and tray compatibility exports', () => {
  it('keeps the legacy dock path on the canonical component identity', () => {
    expect(LegacyDockComponent).toBe(DockComponent);
  });

  it('keeps the legacy system-tray path on the canonical component identity', () => {
    expect(LegacySystemTrayComponent).toBe(SystemTrayComponent);
  });
});
