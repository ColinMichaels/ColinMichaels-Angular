import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ContextMenuComponent} from './context-menu.component';
import {CONTEXT_MENU_DATA, ContextMenuConfig, ContextMenuItem} from './context-menu.service';

describe('ContextMenuComponent', () => {
  let component: ContextMenuComponent;
  let fixture: ComponentFixture<ContextMenuComponent>;
  let openAction: jasmine.Spy;
  let nestedAction: jasmine.Spy;
  let submenuItem: ContextMenuItem;
  let config: ContextMenuConfig;

  beforeEach(async () => {
    openAction = jasmine.createSpy('openAction');
    nestedAction = jasmine.createSpy('nestedAction');
    submenuItem = {
      id: 'more',
      label: 'More',
      action: () => {},
      submenu: [
        {id: 'nested-open', label: 'Nested Open', action: nestedAction},
        {id: 'nested-other', label: 'Nested Other', action: () => {}},
      ],
    };
    config = {
      menuId: 'test-menu',
      items: [
        {id: 'open', label: 'Open', action: openAction},
        {id: 'separator', label: '', action: () => {}, separator: true},
        {id: 'disabled', label: 'Disabled', action: () => {}, disabled: true},
        submenuItem,
      ],
    };

    await TestBed.configureTestingModule({
      imports: [ContextMenuComponent],
      providers: [{provide: CONTEXT_MENU_DATA, useValue: config}],
    }).compileComponents();

    fixture = TestBed.createComponent(ContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders named menu, item, separator, disabled, and submenu semantics', () => {
    const menu = fixture.nativeElement.querySelector('[role="menu"]') as HTMLElement;
    const items = fixture.nativeElement.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLButtonElement>;

    expect(menu.getAttribute('aria-label')).toBe('test-menu context menu');
    expect(fixture.nativeElement.querySelector('[role="separator"]')).toBeTruthy();
    expect(items[0].textContent).toContain('Open');
    expect(items[1].disabled).toBeTrue();
    expect(items[2].getAttribute('aria-haspopup')).toBe('menu');
    expect(items[2].getAttribute('aria-expanded')).toBe('false');
  });

  it('moves real DOM focus across enabled items and supports Home and End', () => {
    component.focusInitialItem();
    expect((document.activeElement as HTMLElement).textContent).toContain('Open');

    component.handleKey(keyboardEvent('ArrowDown'));
    expect((document.activeElement as HTMLElement).textContent).toContain('More');

    component.handleKey(keyboardEvent('Home'));
    expect((document.activeElement as HTMLElement).textContent).toContain('Open');

    component.handleKey(keyboardEvent('End'));
    expect((document.activeElement as HTMLElement).textContent).toContain('More');
  });

  it('wraps ArrowUp and ArrowDown without focusing separators or disabled items', () => {
    component.focusInitialItem();
    component.handleKey(keyboardEvent('ArrowUp'));
    expect((document.activeElement as HTMLElement).textContent).toContain('More');

    component.handleKey(keyboardEvent('ArrowDown'));
    expect((document.activeElement as HTMLElement).textContent).toContain('Open');
  });

  it('runs an enabled action and always requests overlay dismissal', () => {
    const dismissed = spyOn(component.dismissed, 'emit');

    component.onSelect(config.items[0]);

    expect(openAction).toHaveBeenCalledTimes(1);
    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('still requests dismissal when an action throws', () => {
    const dismissed = spyOn(component.dismissed, 'emit');
    const failure = new Error('action failed');
    const item = {label: 'Failure', action: () => { throw failure; }};

    expect(() => component.onSelect(item)).toThrow(failure);
    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('does not run or dismiss for a disabled item', () => {
    const disabledAction = spyOn(config.items[2], 'action');
    const dismissed = spyOn(component.dismissed, 'emit');

    component.onSelect(config.items[2]);

    expect(disabledAction).not.toHaveBeenCalled();
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('renders the requested submenu configuration instead of recursing over the root config', () => {
    component.openSubmenu(submenuItem);
    fixture.detectChanges();

    const submenu = firstSubmenu(component);

    expect(submenu.menuConfig.items).toBe(submenuItem.submenu!);
    expect(submenu.menuConfig.items.map(item => item.label)).toEqual(['Nested Open', 'Nested Other']);
    expect(component.isSubmenuOpen(submenuItem)).toBeTrue();
  });

  it('contains nested ArrowRight and uses ArrowLeft to restore parent-item focus', () => {
    component.focusInitialItem();
    component.handleKey(keyboardEvent('ArrowDown'));
    component.handleKey(keyboardEvent('ArrowRight'));
    fixture.detectChanges();

    expect((document.activeElement as HTMLElement).textContent).toContain('Nested Open');
    (document.activeElement as HTMLElement).dispatchEvent(keyboardEvent('ArrowDown'));
    expect((document.activeElement as HTMLElement).textContent).toContain('Nested Other');

    const nestedLeaf = document.activeElement as HTMLElement;
    nestedLeaf.dispatchEvent(keyboardEvent('ArrowRight'));
    expect(document.activeElement).toBe(nestedLeaf);

    nestedLeaf.dispatchEvent(keyboardEvent('ArrowLeft'));

    expect((document.activeElement as HTMLElement).textContent).toContain('More');
    expect(component.isSubmenuOpen(submenuItem)).toBeFalse();
  });

  it('lets an all-disabled submenu return to its parent with ArrowLeft', () => {
    submenuItem.submenu = [{id: 'unavailable', label: 'Unavailable', action: () => {}, disabled: true}];
    fixture.detectChanges();

    component.openSubmenu(submenuItem, true);
    fixture.detectChanges();
    expect((document.activeElement as HTMLElement).getAttribute('role')).toBe('menu');

    (document.activeElement as HTMLElement).dispatchEvent(keyboardEvent('ArrowLeft'));

    expect((document.activeElement as HTMLElement).textContent).toContain('More');
    expect(component.isSubmenuOpen(submenuItem)).toBeFalse();
  });

  it('flips and vertically fits a submenu near the viewport edge', () => {
    const submenuId = component.submenuId(submenuItem);
    const submenuPanel = fixture.nativeElement.querySelector(`#${submenuId}`) as HTMLElement;
    const menuRoot = fixture.nativeElement.querySelector('[role="menu"]') as HTMLElement;
    const menuButtons = Array.from(
      fixture.nativeElement.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLButtonElement>,
    );
    const trigger = menuButtons.find(button => button.textContent?.includes('More'))!;
    let triggerRect = {
      left: 50,
      right: 90,
      top: 40,
      bottom: 70,
      width: 40,
      height: 30,
    } as DOMRect;
    spyOn(menuRoot, 'getBoundingClientRect').and.returnValue({
      left: 50,
      right: 250,
      top: 40,
      bottom: 140,
      width: 200,
      height: 100,
    } as DOMRect);
    spyOn(trigger, 'getBoundingClientRect').and.callFake(() => triggerRect);
    spyOn(submenuPanel, 'getBoundingClientRect').and.returnValue({
      left: 310,
      right: 510,
      top: 250,
      bottom: 450,
      width: 200,
      height: 200,
    } as DOMRect);
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(320);
    spyOnProperty(window, 'innerHeight', 'get').and.returnValue(300);

    component.openSubmenu(submenuItem);
    fixture.detectChanges();

    expect(component.submenuOpensLeft(submenuItem)).toBeFalse();
    expect(component.submenuTopOffset(submenuItem)).toBe(0);
    expect(component.submenuHorizontalOffset(submenuItem)).toBe(40);
    expect(submenuPanel.style.left).toBe('40px');

    triggerRect = {
      left: 270,
      right: 310,
      top: 250,
      bottom: 280,
      width: 40,
      height: 30,
    } as DOMRect;
    component.repositionOpenSubmenu();
    fixture.detectChanges();

    expect(component.submenuOpensLeft(submenuItem)).toBeTrue();
    expect(component.submenuTopOffset(submenuItem)).toBe(52);
    expect(component.submenuHorizontalOffset(submenuItem)).toBe(20);
    expect(submenuPanel.style.top).toBe('52px');
    expect(submenuPanel.style.left).toBe('20px');
  });

  it('recursively repositions and constrains a deep oversized submenu', () => {
    const nestedParent = submenuItem.submenu![0];
    nestedParent.submenu = [{id: 'deep-action', label: 'Deep Action', action: () => {}}];
    fixture.detectChanges();

    component.openSubmenu(submenuItem);
    fixture.detectChanges();
    const nestedMenu = firstSubmenu(component);
    nestedMenu.openSubmenu(nestedParent);
    fixture.detectChanges();

    const nestedPanel = fixture.nativeElement.querySelector(
      `#${nestedMenu.submenuId(nestedParent)}`,
    ) as HTMLElement;
    const nestedRoot = nestedPanel.parentElement!;
    spyOn(nestedRoot, 'getBoundingClientRect').and.returnValue({
      left: 100,
      right: 300,
      top: 50,
      bottom: 250,
      width: 200,
      height: 200,
    } as DOMRect);
    const nestedTrigger = Array.from(
      fixture.nativeElement.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLButtonElement>,
    ).find(button => button.textContent?.includes('Nested Open'))!;
    spyOn(nestedTrigger, 'getBoundingClientRect').and.returnValue({
      left: 280,
      right: 310,
      top: 250,
      bottom: 280,
      width: 30,
      height: 30,
    } as DOMRect);
    spyOn(nestedPanel, 'getBoundingClientRect').and.returnValue({
      left: 310,
      right: 810,
      top: 250,
      bottom: 750,
      width: 500,
      height: 500,
    } as DOMRect);
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(320);
    spyOnProperty(window, 'innerHeight', 'get').and.returnValue(300);

    component.repositionOpenSubmenu();
    fixture.detectChanges();

    const styles = getComputedStyle(nestedPanel);
    const nestedScroller = nestedRoot.querySelector(':scope > .context-menu-items') as HTMLElement;
    expect(nestedMenu.submenuOpensLeft(nestedParent)).toBeTrue();
    expect(nestedMenu.submenuTopOffset(nestedParent)).toBe(-42);
    expect(nestedMenu.submenuHorizontalOffset(nestedParent)).toBe(-92);
    expect(nestedPanel.style.top).toBe('-42px');
    expect(nestedPanel.style.left).toBe('-92px');
    expect(nestedScroller.contains(nestedPanel)).toBeFalse();
    expect(getComputedStyle(nestedScroller).overflow).toBe('auto');
    expect(styles.maxWidth).not.toBe('none');
    expect(styles.maxHeight).not.toBe('none');
    expect(styles.overflow).toBe('visible');
  });

  it('keeps a rendered deep submenu visible and hit-testable outside the parent scroller', () => {
    const nestedParent = submenuItem.submenu![0];
    nestedParent.submenu = [{id: 'deep-action', label: 'Deep Action', action: () => {}}];
    fixture.detectChanges();

    component.openSubmenu(submenuItem);
    fixture.detectChanges();
    const nestedMenu = firstSubmenu(component);
    nestedMenu.openSubmenu(nestedParent);
    fixture.detectChanges();
    component.repositionOpenSubmenu();
    fixture.detectChanges();

    const nestedPanel = fixture.nativeElement.querySelector(
      `#${nestedMenu.submenuId(nestedParent)}`,
    ) as HTMLElement;
    const parentScroller = nestedPanel.parentElement!.querySelector(
      ':scope > .context-menu-items',
    ) as HTMLElement;
    const deepButton = Array.from(
      fixture.nativeElement.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLButtonElement>,
    ).find(button => button.textContent?.includes('Deep Action'))!;
    const rect = deepButton.getBoundingClientRect();
    const hitTarget = document.elementFromPoint(
      Math.min(window.innerWidth - 1, Math.max(0, rect.left + 4)),
      Math.min(window.innerHeight - 1, Math.max(0, rect.top + 4)),
    );

    expect(parentScroller.contains(nestedPanel)).toBeFalse();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    expect(hitTarget === deepButton || deepButton.contains(hitTarget)).toBeTrue();
  });

  it('closes the open submenu tree when its independent item list scrolls', () => {
    const nestedParent = submenuItem.submenu![0];
    nestedParent.submenu = [{id: 'deep-action', label: 'Deep Action', action: () => {}}];
    fixture.detectChanges();

    component.openSubmenu(submenuItem, true);
    fixture.detectChanges();
    const nestedMenu = firstSubmenu(component);
    nestedMenu.openSubmenu(nestedParent, true);
    fixture.detectChanges();
    expect((document.activeElement as HTMLElement).textContent).toContain('Deep Action');

    const itemScroller = fixture.nativeElement.querySelector(
      '[role="menu"] > .context-menu-items',
    ) as HTMLElement;
    itemScroller.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isSubmenuOpen(submenuItem)).toBeFalse();
    expect(nestedMenu.isSubmenuOpen(nestedParent)).toBeFalse();
    expect((document.activeElement as HTMLElement).textContent).toContain('More');
    expect(
      fixture.nativeElement.querySelector('[aria-controls="more-menu"]').getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('restores the owning trigger when pointer exit hides a keyboard-focused submenu tree', () => {
    const nestedParent = submenuItem.submenu![0];
    nestedParent.submenu = [{id: 'deep-action', label: 'Deep Action', action: () => {}}];
    fixture.detectChanges();

    component.openSubmenu(submenuItem, true);
    fixture.detectChanges();
    const nestedMenu = firstSubmenu(component);
    nestedMenu.openSubmenu(nestedParent, true);
    fixture.detectChanges();
    expect((document.activeElement as HTMLElement).textContent).toContain('Deep Action');

    const rootMenu = fixture.nativeElement.querySelector('[role="menu"]') as HTMLElement;
    rootMenu.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    expect(component.isSubmenuOpen(submenuItem)).toBeFalse();
    expect(nestedMenu.isSubmenuOpen(nestedParent)).toBeFalse();
    expect((document.activeElement as HTMLElement).textContent).toContain('More');
  });

  it('clears stale descendants and restores visible focus when pointer hover replaces a keyboard branch', () => {
    const nestedParent = submenuItem.submenu![0];
    nestedParent.submenu = [{id: 'deep-action', label: 'Deep Action', action: () => {}}];
    const siblingItem: ContextMenuItem = {
      id: 'alternate',
      label: 'Alternate',
      action: () => {},
      submenu: [{id: 'alternate-action', label: 'Alternate Action', action: () => {}}],
    };
    config.items.push(siblingItem);
    fixture.detectChanges();

    component.openSubmenu(submenuItem, true);
    fixture.detectChanges();
    const nestedMenu = firstSubmenu(component);
    nestedMenu.openSubmenu(nestedParent, true);
    fixture.detectChanges();
    expect((document.activeElement as HTMLElement).textContent).toContain('Deep Action');

    const alternateButton = Array.from(
      fixture.nativeElement.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLButtonElement>,
    ).find(button => button.textContent?.includes('Alternate'))!;
    alternateButton.parentElement!.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(component.isSubmenuOpen(siblingItem)).toBeTrue();
    expect(nestedMenu.isSubmenuOpen(nestedParent)).toBeFalse();
    expect((document.activeElement as HTMLElement).textContent).toContain('More');

    component.openSubmenu(submenuItem);
    fixture.detectChanges();
    expect(nestedMenu.isSubmenuOpen(nestedParent)).toBeFalse();
  });

  it('activates the focused item with Enter and Space', () => {
    const dismissed = spyOn(component.dismissed, 'emit');
    component.focusInitialItem();

    component.handleKey(keyboardEvent('Enter'));
    component.handleKey(keyboardEvent(' '));

    expect(openAction).toHaveBeenCalledTimes(2);
    expect(dismissed).toHaveBeenCalledTimes(2);
  });

  it('requests dismissal on Escape and Tab', () => {
    const dismissed = spyOn(component.dismissed, 'emit');

    component.handleKey(keyboardEvent('Escape'));
    component.handleKey(keyboardEvent('Tab'));

    expect(dismissed).toHaveBeenCalledTimes(2);
  });
});

function keyboardEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true});
}

function firstSubmenu(component: ContextMenuComponent): ContextMenuComponent {
  return (component as unknown as {
    submenuComponents: {first: ContextMenuComponent};
  }).submenuComponents.first;
}
