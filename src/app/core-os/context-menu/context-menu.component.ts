import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Inject,
  Input,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {DOCUMENT, NgForOf, NgIf} from '@angular/common';
import {CONTEXT_MENU_DATA, ContextMenuConfig, ContextMenuItem} from './context-menu.service';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  imports: [NgIf, NgForOf, forwardRef(() => ContextMenuComponent)],
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    ':host { outline: none; display: block; }',
    '.context-menu-surface { position: relative; width: 200px; max-width: calc(100vw - 16px); overflow: visible; }',
    '.context-menu-items { max-height: calc(100vh - 16px); overflow: auto; }',
    '.submenu-panel { max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); overflow: visible; }',
  ]
})
export class ContextMenuComponent {
  @Input() inputConfig?: ContextMenuConfig;
  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly navigateBack = new EventEmitter<void>();

  @ViewChild('menuRoot') private menuRoot?: ElementRef<HTMLElement>;
  @ViewChildren('menuItem') private menuItemButtons?: QueryList<ElementRef<HTMLButtonElement>>;
  @ViewChildren('submenuPanel') private submenuPanels?: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren(ContextMenuComponent) private submenuComponents?: QueryList<ContextMenuComponent>;

  focusedIndex = 0;
  private openSubmenuKey: string | null = null;
  private readonly submenuPlacements = new Map<
    string,
    {openLeft: boolean; topOffset: number; horizontalOffset: number}
  >();

  constructor(
    @Inject(CONTEXT_MENU_DATA) public injectedConfig: ContextMenuConfig,
    private readonly changeDetector: ChangeDetectorRef,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  get menuConfig(): ContextMenuConfig {
    return this.inputConfig ?? this.injectedConfig;
  }

  get enabledItems(): ContextMenuItem[] {
    return this.menuConfig.items.filter(item => !item.separator && !item.disabled);
  }

  focusInitialItem(): void {
    this.focusItem(0);
  }

  isFocused(item: ContextMenuItem): boolean {
    return this.enabledItems[this.focusedIndex] === item;
  }

  isSubmenuOpen(item: ContextMenuItem): boolean {
    return this.openSubmenuKey === this.submenuKey(item);
  }

  submenuId(item: ContextMenuItem): string {
    return `${this.submenuKey(item)}-menu`;
  }

  submenuOpensLeft(item: ContextMenuItem): boolean {
    return this.submenuPlacements.get(this.submenuKey(item))?.openLeft ?? false;
  }

  submenuTopOffset(item: ContextMenuItem): number {
    return this.submenuPlacements.get(this.submenuKey(item))?.topOffset ?? 0;
  }

  submenuHorizontalOffset(item: ContextMenuItem): number {
    return this.submenuPlacements.get(this.submenuKey(item))?.horizontalOffset ?? 0;
  }

  submenuConfig(item: ContextMenuItem): ContextMenuConfig {
    return {
      menuId: item.id || `${this.menuConfig.menuId}-submenu`,
      items: item.submenu ?? [],
      userRoles: this.menuConfig.userRoles ?? [],
    };
  }

  syncFocusedItem(item: ContextMenuItem): void {
    const index = this.enabledItems.indexOf(item);
    if (index >= 0) {
      this.focusedIndex = index;
    }
  }

  openSubmenu(item: ContextMenuItem, focusFirstItem = false): void {
    if (!item.submenu?.length || item.disabled) {
      this.closeOpenSubmenuTree();
      return;
    }

    const nextSubmenuKey = this.submenuKey(item);
    if (this.openSubmenuKey !== nextSubmenuKey) {
      // Pointer navigation can replace a branch that keyboard focus still owns.
      // Clear its complete descendant state and keep focus on the visible trigger.
      this.closeOpenSubmenuTree();
    }

    this.openSubmenuKey = nextSubmenuKey;
    this.changeDetector.detectChanges();
    this.positionSubmenu(item);
    this.changeDetector.detectChanges();
    if (!focusFirstItem) {
      return;
    }

    this.submenuComponent(item)?.focusInitialItem();
  }

  closeSubmenu(item: ContextMenuItem): void {
    if (this.isSubmenuOpen(item)) {
      this.closeOpenSubmenuTree(false);
    }
  }

  closeOpenSubmenuTree(restoreFocusedOwner = true): void {
    const openItem = this.menuConfig.items.find(item => this.isSubmenuOpen(item));
    const openPanel = openItem
      ? this.submenuPanels?.find(panel => panel.nativeElement.id === this.submenuId(openItem))?.nativeElement
      : undefined;
    const activeElement = this.document.activeElement;
    const restoreTriggerFocus = restoreFocusedOwner
      && Boolean(activeElement && openPanel?.contains(activeElement));

    this.clearSubmenuState();
    if (openItem && restoreTriggerFocus) {
      this.changeDetector.detectChanges();
      this.focusItem(this.enabledItems.indexOf(openItem));
    }
  }

  onMenuScroll(): void {
    // Fly-outs are siblings of the scroll container so they are never clipped.
    // Dismiss the open tree when its trigger moves instead of leaving stale geometry,
    // returning focus to that trigger if the hidden fly-out owned active focus.
    this.closeOpenSubmenuTree();
  }

  returnFromSubmenu(item: ContextMenuItem): void {
    this.closeSubmenu(item);
    this.changeDetector.detectChanges();
    this.focusItem(this.enabledItems.indexOf(item));
  }

  onSelect(item: ContextMenuItem): void {
    if (item.disabled) {
      return;
    }
    if (item.submenu?.length) {
      this.openSubmenu(item, true);
      return;
    }

    try {
      item.action();
    } finally {
      this.dismissed.emit();
    }
  }

  handleKey(event: KeyboardEvent): void {
    const items = this.enabledItems;

    if (event.key === 'Escape') {
      this.dismissed.emit();
      this.consumeKey(event);
      return;
    }
    if (event.key === 'Tab') {
      this.dismissed.emit();
      event.stopPropagation();
      return;
    }
    if (event.key === 'ArrowLeft') {
      if (this.inputConfig) {
        this.navigateBack.emit();
      }
      this.consumeKey(event);
      return;
    }
    if (!items.length) {
      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        this.consumeKey(event);
      }
      return;
    }

    const currentItem = items[this.normalizedFocusedIndex(items.length)];
    switch (event.key) {
      case 'ArrowDown':
        this.focusItem((this.focusedIndex + 1) % items.length);
        this.consumeKey(event);
        break;
      case 'ArrowUp':
        this.focusItem((this.focusedIndex - 1 + items.length) % items.length);
        this.consumeKey(event);
        break;
      case 'Home':
        this.focusItem(0);
        this.consumeKey(event);
        break;
      case 'End':
        this.focusItem(items.length - 1);
        this.consumeKey(event);
        break;
      case 'ArrowRight':
        if (currentItem.submenu?.length) {
          this.openSubmenu(currentItem, true);
        }
        this.consumeKey(event);
        break;
      case 'Enter':
      case ' ':
        this.onSelect(currentItem);
        this.consumeKey(event);
        break;
    }
  }

  repositionOpenSubmenu(): void {
    const openItem = this.menuConfig.items.find(item => this.isSubmenuOpen(item));
    if (openItem) {
      this.positionSubmenu(openItem);
      this.changeDetector.detectChanges();
      this.submenuComponent(openItem)?.repositionOpenSubmenu();
    }
  }

  private focusItem(index: number): void {
    const buttons = (this.menuItemButtons?.toArray() ?? [])
      .map(item => item.nativeElement)
      .filter(button => !button.disabled);

    if (!buttons.length) {
      this.menuRoot?.nativeElement.focus();
      return;
    }

    const normalizedIndex = ((index % buttons.length) + buttons.length) % buttons.length;
    this.focusedIndex = normalizedIndex;
    buttons[normalizedIndex].focus();
  }

  private normalizedFocusedIndex(itemCount: number): number {
    if (this.focusedIndex < 0 || this.focusedIndex >= itemCount) {
      this.focusedIndex = 0;
    }
    return this.focusedIndex;
  }

  private submenuKey(item: ContextMenuItem): string {
    const fallbackIndex = this.menuConfig.items.indexOf(item);
    return item.id || `${this.menuConfig.menuId}-${fallbackIndex}`;
  }

  private submenuComponent(item: ContextMenuItem): ContextMenuComponent | undefined {
    return this.submenuComponents?.find(component => component.inputConfig?.items === item.submenu);
  }

  private clearSubmenuState(): void {
    this.submenuComponents?.forEach(component => component.clearSubmenuState());
    this.openSubmenuKey = null;
  }

  private positionSubmenu(item: ContextMenuItem): void {
    const menuWindow = this.document.defaultView;
    const submenuId = this.submenuId(item);
    const submenuPanel = this.submenuPanels?.find(panel => panel.nativeElement.id === submenuId)?.nativeElement;
    const itemIndex = this.menuConfig.items.filter(candidate => !candidate.separator).indexOf(item);
    const trigger = this.menuItemButtons?.get(itemIndex)?.nativeElement;
    const menuRoot = this.menuRoot?.nativeElement;
    if (!menuWindow || !submenuPanel || !trigger || !menuRoot) {
      return;
    }

    const margin = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const submenuRect = submenuPanel.getBoundingClientRect();
    const menuRootRect = menuRoot.getBoundingClientRect();
    const maxPanelWidth = Math.max(0, menuWindow.innerWidth - (margin * 2));
    const maxPanelHeight = Math.max(0, menuWindow.innerHeight - (margin * 2));
    const submenuWidth = Math.min(submenuRect.width || submenuPanel.offsetWidth, maxPanelWidth);
    const submenuHeight = Math.min(submenuRect.height || submenuPanel.offsetHeight, maxPanelHeight);
    const rightSpace = menuWindow.innerWidth - triggerRect.right - margin;
    const leftSpace = triggerRect.left - margin;
    const openLeft = rightSpace < submenuWidth && leftSpace > rightSpace;
    const naturalLeft = openLeft ? triggerRect.left - submenuWidth : triggerRect.right;
    const maxLeft = Math.max(margin, menuWindow.innerWidth - margin - submenuWidth);
    const fittedLeft = Math.min(Math.max(naturalLeft, margin), maxLeft);
    const maxTop = Math.max(margin, menuWindow.innerHeight - margin - submenuHeight);
    const fittedTop = Math.min(Math.max(triggerRect.top, margin), maxTop);

    this.submenuPlacements.set(this.submenuKey(item), {
      openLeft,
      topOffset: fittedTop - menuRootRect.top,
      horizontalOffset: fittedLeft - menuRootRect.left,
    });
  }

  private consumeKey(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }
}
