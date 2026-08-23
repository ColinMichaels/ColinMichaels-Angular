import {AppWindowComponent as LegacyAppWindowComponent} from '../../components/game/templates/app-window/app-window.component';
import {
  WindowHeaderComponent as LegacyWindowHeaderComponent
} from '../../components/game/templates/app-window/window-header/window-header.component';

import {AppWindowComponent, WindowHeaderComponent} from './index';

describe('Core OS windowing compatibility exports', () => {
  it('keeps the legacy app-window path on the canonical component identity', () => {
    expect(LegacyAppWindowComponent).toBe(AppWindowComponent);
  });

  it('keeps the legacy window-header path on the canonical component identity', () => {
    expect(LegacyWindowHeaderComponent).toBe(WindowHeaderComponent);
  });
});
