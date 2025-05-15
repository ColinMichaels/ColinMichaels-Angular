import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {Injectable, InjectionToken, Injector, Type} from '@angular/core';
import { ComponentPortal } from '@angular/cdk/portal';
import {MenuTypeAComponent} from '../menus/menu-type-a.component';
import {MenuTypeBComponent} from '../menus/menu-type-b.component';
import {ContextMenuComponent} from '../templates/context-menu/context-menu.component';

// context-menu.service.ts
/**
 *
 * this.contextMenuFactory.open({
 *   menuId: 'main-actions',
 *   userRoles: ['admin', 'editor'],
 *   items: [
 *     { label: 'Open', action: () => this.openItem() },
 *     { separator: true },
 *     {
 *       label: 'Admin Tools',
 *       roles: ['admin'],
 *       submenu: [
 *         { label: 'User Manager', action: () => this.manageUsers() },
 *         { label: 'System Logs', action: () => this.viewLogs() },
 *       ]
 *     },
 *     { label: 'Settings', roles: ['editor'], action: () => this.openSettings() },
 *   ]
 * }, { x: event.clientX, y: event.clientY });
 */

/// context-menu.model.ts
export interface ContextMenuItem {
  id?: string;
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  roles?: string[];
  parentId?: string;
  path?: string;
}

export interface ContextMenuConfig {
  menuId: string;
  items: ContextMenuItem[];
  userRoles?: string[];
}

export const CONTEXT_MENU_DATA = new InjectionToken<any>('CONTEXT_MENU_DATA');

export const ContextMenuRegistry: Record<string, Type<any>> = {
  'type-a': MenuTypeAComponent,
  'type-b': MenuTypeBComponent,
};

/**
 * Class representing a builder for creating context menu configurations.
 */
let contextMenuIdCounter = 0;

export class ContextMenuBuilder {
  private config: ContextMenuConfig;
  private idPrefix: string;

  constructor(menuId: string, userRoles: string[] = []) {
    this.config = {
      menuId,
      items: [],
      userRoles
    };
    this.idPrefix = `${menuId}-${Date.now()}`;
  }

  private nextId(): string {
    return `${this.idPrefix}-${++contextMenuIdCounter}`;
  }

  private validateItem(item: ContextMenuItem): void {
    if (!item.label && !item.separator) {
      throw new Error('ContextMenuItem must have a label or be a separator');
    }
    if (item.submenu && (!Array.isArray(item.submenu) || item.submenu.length === 0)) {
      throw new Error('Submenu must be a non-empty array if defined');
    }
  }

  private userHasAccess(item: ContextMenuItem): boolean {
    if (!item.roles || item.roles.length === 0) return true;
    if (!this.config.userRoles) return false;
    return item.roles.some(role => this.config.userRoles!.includes(role));
  }

  private assignMeta(item: ContextMenuItem, parentId?: string): ContextMenuItem {
    const id = item.id || this.nextId();
    const path = parentId ? `${parentId}/${id}` : id;
    return { ...item, id, parentId, path };
  }

  addItem(item: Omit<ContextMenuItem, 'submenu'> & { submenu?: ContextMenuItem[] }): this {
    this.validateItem(item);
    if (this.userHasAccess(item)) {
      const meta = this.assignMeta(item);
      this.config.items.push(meta);
    }
    return this;
  }

  addSeparator(): this {
    const sep = this.assignMeta({ label: '', action: () => {}, separator: true });
    this.config.items.push(sep);
    return this;
  }

  addSubmenu(label: string, items: ContextMenuItem[], options?: Partial<Omit<ContextMenuItem, 'label' | 'submenu'>>): this {
    if (!items || items.length === 0) throw new Error('Submenu must have at least one item');
    const filtered = items.filter(i => this.userHasAccess(i));
    if (filtered.length === 0) return this;

    const parentMeta = this.assignMeta({ label, action: () => {}, ...options });
    parentMeta.submenu = filtered.map(i => this.assignMeta(i, parentMeta.id));
    this.config.items.push(parentMeta);
    return this;
  }

  build(): ContextMenuConfig {
    return this.config;
  }
}


@Injectable({ providedIn: 'root' })
export class ContextMenuService {
  private overlayRef: OverlayRef | null = null;

  constructor(private overlay: Overlay, private injector: Injector) {}

  open(config: ContextMenuConfig, position: { x: number; y: number }): void {
    this.close();

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo({ x: position.x, y: position.y })
      .withPositions([{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top' }]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'transparent'
    });

    const injector = Injector.create({
      providers: [{ provide: CONTEXT_MENU_DATA, useValue: config }],
      parent: this.injector
    });

    const portal = new ComponentPortal(ContextMenuComponent, null, injector);
    this.overlayRef.attach(portal);

    this.overlayRef.backdropClick().subscribe(() => this.close());
  }

  close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
