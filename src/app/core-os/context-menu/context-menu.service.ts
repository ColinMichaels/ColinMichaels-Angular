import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {DOCUMENT} from '@angular/common';
import {Inject, Injectable, InjectionToken, Injector, Type} from '@angular/core';
import { ComponentPortal } from '@angular/cdk/portal';
import {Subscription} from 'rxjs';
import {MenuTypeAComponent} from './menu-type-a.component';
import {MenuTypeBComponent} from './menu-type-b.component';
import {ContextMenuComponent} from './context-menu.component';

/**
 * Reusable configuration example:
 *
 * contextMenuService.open({
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

/** One actionable or structural entry in a Core OS context menu. */
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

export const CONTEXT_MENU_DATA = new InjectionToken<unknown>('CONTEXT_MENU_DATA');

/** Retained prototype registry; live desktop menus currently use the generic renderer. */
export const ContextMenuRegistry: Record<string, Type<unknown>> = {
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

  private assignMeta(item: ContextMenuItem, parent?: ContextMenuItem): ContextMenuItem {
    const id = item.id || this.nextId();
    const path = parent?.path ? `${parent.path}/${id}` : id;
    return { ...item, id, parentId: parent?.id, path };
  }

  private prepareItem(item: ContextMenuItem, parent?: ContextMenuItem): ContextMenuItem | null {
    this.validateItem(item);
    if (!this.userHasAccess(item)) {
      return null;
    }

    const prepared = this.assignMeta({...item, submenu: undefined}, parent);
    if (!item.submenu) {
      return prepared;
    }

    const children = item.submenu
      .map(child => this.prepareItem(child, prepared))
      .filter((child): child is ContextMenuItem => child !== null);
    if (!children.length) {
      return null;
    }

    prepared.submenu = children;
    return prepared;
  }

  addItem(item: Omit<ContextMenuItem, 'submenu'> & { submenu?: ContextMenuItem[] }): this {
    const prepared = this.prepareItem(item);
    if (prepared) {
      this.config.items.push(prepared);
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
    const prepared = this.prepareItem({label, action: () => {}, ...options, submenu: items});
    if (prepared) {
      this.config.items.push(prepared);
    }
    return this;
  }

  build(): ContextMenuConfig {
    return this.config;
  }
}


@Injectable({ providedIn: 'root' })
export class ContextMenuService {
  private overlayRef: OverlayRef | null = null;
  private restoreFocusTarget: HTMLElement | null = null;
  private overlaySubscriptions: Subscription | null = null;

  constructor(
    private readonly overlay: Overlay,
    private readonly injector: Injector,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  open(config: ContextMenuConfig, position: { x: number; y: number }): void {
    if (!this.overlayRef) {
      const activeElement = this.document.activeElement;
      this.restoreFocusTarget = activeElement instanceof HTMLElement ? activeElement : null;
    }
    this.disposeOverlay(false);

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo({ x: position.x, y: position.y })
      .withPositions([
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
      ])
      .withFlexibleDimensions(false)
      .withPush(true)
      .withViewportMargin(8);

    const overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'transparent',
      disposeOnNavigation: true,
      scrollStrategy: this.overlay.scrollStrategies.close(),
    });
    this.overlayRef = overlayRef;

    const injector = Injector.create({
      providers: [{ provide: CONTEXT_MENU_DATA, useValue: config }],
      parent: this.injector
    });

    const portal = new ComponentPortal(ContextMenuComponent, null, injector);
    const componentRef = overlayRef.attach(portal);
    const subscriptions = new Subscription();
    this.overlaySubscriptions = subscriptions;

    subscriptions.add(positionStrategy.positionChanges.subscribe(() => {
      if (this.overlayRef === overlayRef) {
        componentRef.instance.repositionOpenSubmenu();
      }
    }));

    subscriptions.add(componentRef.instance.dismissed.subscribe(() => {
      if (this.overlayRef === overlayRef) {
        this.close();
      }
    }));
    subscriptions.add(overlayRef.backdropClick().subscribe(() => {
      if (this.overlayRef === overlayRef) {
        this.close();
      }
    }));
    subscriptions.add(overlayRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape' && this.overlayRef === overlayRef) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      }
    }));
    subscriptions.add(overlayRef.detachments().subscribe(() => {
      if (this.overlayRef !== overlayRef) {
        return;
      }

      // CDK scroll and navigation strategies can detach or dispose the portal
      // without calling close(). Clear service state immediately, then dispose
      // on the next microtask so a navigation-triggered dispose can finish first.
      this.disposeOverlay(true, false);
      queueMicrotask(() => overlayRef.dispose());
    }));

    queueMicrotask(() => {
      if (this.overlayRef === overlayRef && overlayRef.hasAttached()) {
        componentRef.instance.focusInitialItem();
      }
    });
  }

  close(): void {
    this.disposeOverlay(true);
  }

  private disposeOverlay(restoreFocus: boolean, disposeRef = true): void {
    const overlayRef = this.overlayRef;
    this.overlayRef = null;
    this.overlaySubscriptions?.unsubscribe();
    this.overlaySubscriptions = null;
    if (disposeRef) {
      overlayRef?.dispose();
    }

    if (!restoreFocus) {
      return;
    }

    const focusTarget = this.restoreFocusTarget;
    this.restoreFocusTarget = null;
    if (focusTarget?.isConnected) {
      focusTarget.focus();
    }
  }
}
