import {FinderAppComponent as CanonicalFinderAppComponent} from '@core-os/filesystem/finder-app/finder-app.component';
import {FinderWindowComponent as CanonicalFinderWindowComponent} from '@core-os/filesystem/finder-window/finder-window.component';
import {FinderAppComponent as LegacyFinderAppComponent} from './finder-app.component';
import {FinderWindowComponent as LegacyFinderWindowComponent} from '../finder-window/finder-window.component';

describe('legacy Finder exports', () => {
  it('resolve to the canonical Core OS component identities', () => {
    expect(LegacyFinderAppComponent).toBe(CanonicalFinderAppComponent);
    expect(LegacyFinderWindowComponent).toBe(CanonicalFinderWindowComponent);
  });
});
