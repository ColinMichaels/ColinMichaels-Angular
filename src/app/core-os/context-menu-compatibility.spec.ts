import {ContextMenuComponent as CanonicalContextMenuComponent} from './context-menu/context-menu.component';
import {
  CONTEXT_MENU_DATA as CANONICAL_CONTEXT_MENU_DATA,
  ContextMenuBuilder as CanonicalContextMenuBuilder,
  ContextMenuRegistry as CanonicalContextMenuRegistry,
  ContextMenuService as CanonicalContextMenuService,
} from './context-menu/context-menu.service';
import {MenuTypeAComponent as CanonicalMenuTypeAComponent} from './context-menu/menu-type-a.component';
import {MenuTypeBComponent as CanonicalMenuTypeBComponent} from './context-menu/menu-type-b.component';
import {ContextMenuComponent as LegacyContextMenuComponent} from '../components/game/templates/context-menu/context-menu.component';
import {
  CONTEXT_MENU_DATA as LEGACY_CONTEXT_MENU_DATA,
  ContextMenuBuilder as LegacyContextMenuBuilder,
  ContextMenuRegistry as LegacyContextMenuRegistry,
  ContextMenuService as LegacyContextMenuService,
} from '../components/game/services/context-menu.service';
import {MenuTypeAComponent as LegacyMenuTypeAComponent} from '../components/game/menus/menu-type-a.component';
import {MenuTypeBComponent as LegacyMenuTypeBComponent} from '../components/game/menus/menu-type-b.component';

describe('Core OS context-menu compatibility exports', () => {
  it('preserves the public service, builder, token, and registry identities', () => {
    expect(LegacyContextMenuService).toBe(CanonicalContextMenuService);
    expect(LegacyContextMenuBuilder).toBe(CanonicalContextMenuBuilder);
    expect(LEGACY_CONTEXT_MENU_DATA).toBe(CANONICAL_CONTEXT_MENU_DATA);
    expect(LegacyContextMenuRegistry).toBe(CanonicalContextMenuRegistry);
  });

  it('preserves the component identities used by overlays and registry entries', () => {
    expect(LegacyContextMenuComponent).toBe(CanonicalContextMenuComponent);
    expect(LegacyMenuTypeAComponent).toBe(CanonicalMenuTypeAComponent);
    expect(LegacyMenuTypeBComponent).toBe(CanonicalMenuTypeBComponent);
    expect(CanonicalContextMenuRegistry['type-a']).toBe(CanonicalMenuTypeAComponent);
    expect(CanonicalContextMenuRegistry['type-b']).toBe(CanonicalMenuTypeBComponent);
  });
});
