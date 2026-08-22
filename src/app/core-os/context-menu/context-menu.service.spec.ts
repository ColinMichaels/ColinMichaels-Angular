import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentRef, EventEmitter, Injector} from '@angular/core';
import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {Subject} from 'rxjs';
import {ContextMenuComponent} from './context-menu.component';
import {ContextMenuBuilder, ContextMenuConfig, ContextMenuService} from './context-menu.service';

describe('ContextMenuBuilder', () => {
  it('filters role-gated entries and assigns stable parent metadata to submenus', () => {
    const config = new ContextMenuBuilder('desktop', ['admin'])
      .addItem({label: 'Visible', action: () => {}})
      .addItem({label: 'Editor only', roles: ['editor'], action: () => {}})
      .addSubmenu('Admin', [
        {
          label: 'Allowed',
          roles: ['admin'],
          action: () => {},
          submenu: [
            {label: 'Deep allowed', roles: ['admin'], action: () => {}},
            {label: 'Deep denied', roles: ['editor'], action: () => {}},
          ],
        },
        {label: 'Denied', roles: ['editor'], action: () => {}},
      ])
      .build();

    expect(config.items.map(item => item.label)).toEqual(['Visible', 'Admin']);
    expect(config.items[1].submenu?.map(item => item.label)).toEqual(['Allowed']);
    const allowed = config.items[1].submenu![0];
    const deepAllowed = allowed.submenu![0];
    expect(allowed.parentId).toBe(config.items[1].id);
    expect(allowed.path).toBe(`${config.items[1].id}/${allowed.id}`);
    expect(allowed.submenu?.map(item => item.label)).toEqual(['Deep allowed']);
    expect(deepAllowed.parentId).toBe(allowed.id);
    expect(deepAllowed.path).toBe(`${config.items[1].id}/${allowed.id}/${deepAllowed.id}`);
  });

  it('rejects missing labels and empty submenus', () => {
    expect(() => new ContextMenuBuilder('invalid').addItem({label: '', action: () => {}}))
      .toThrowError('ContextMenuItem must have a label or be a separator');
    expect(() => new ContextMenuBuilder('invalid').addSubmenu('Empty', []))
      .toThrowError('Submenu must have at least one item');
  });
});

describe('ContextMenuService', () => {
  let service: ContextMenuService;
  let overlay: jasmine.SpyObj<Overlay>;
  let overlayRef: jasmine.SpyObj<OverlayRef>;
  let component: Pick<ContextMenuComponent, 'dismissed' | 'focusInitialItem' | 'repositionOpenSubmenu'>;
  let backdropClicks: Subject<MouseEvent>;
  let keydownEvents: Subject<KeyboardEvent>;
  let detachments: Subject<void>;
  let positionStrategy: {
    withPositions: jasmine.Spy;
    withFlexibleDimensions: jasmine.Spy;
    withPush: jasmine.Spy;
    withViewportMargin: jasmine.Spy;
    positionChanges: Subject<unknown>;
  };
  let flexibleConnectedTo: jasmine.Spy;
  let closeScrollStrategy: jasmine.Spy;
  let invoker: HTMLButtonElement;
  const config: ContextMenuConfig = {
    menuId: 'desktop',
    items: [{label: 'Open', action: () => {}}],
  };

  beforeEach(() => {
    backdropClicks = new Subject<MouseEvent>();
    keydownEvents = new Subject<KeyboardEvent>();
    detachments = new Subject<void>();
    component = {
      dismissed: new EventEmitter<void>(),
      focusInitialItem: jasmine.createSpy('focusInitialItem'),
      repositionOpenSubmenu: jasmine.createSpy('repositionOpenSubmenu'),
    };
    overlayRef = jasmine.createSpyObj<OverlayRef>('OverlayRef', [
      'attach',
      'dispose',
      'backdropClick',
      'keydownEvents',
      'detachments',
      'hasAttached',
    ]);
    overlayRef.attach.and.returnValue({instance: component} as unknown as ComponentRef<ContextMenuComponent>);
    overlayRef.backdropClick.and.returnValue(backdropClicks);
    overlayRef.keydownEvents.and.returnValue(keydownEvents);
    overlayRef.detachments.and.returnValue(detachments);
    overlayRef.hasAttached.and.returnValue(true);

    positionStrategy = {
      withPositions: jasmine.createSpy('withPositions'),
      withFlexibleDimensions: jasmine.createSpy('withFlexibleDimensions'),
      withPush: jasmine.createSpy('withPush'),
      withViewportMargin: jasmine.createSpy('withViewportMargin'),
      positionChanges: new Subject<unknown>(),
    };
    positionStrategy.withPositions.and.returnValue(positionStrategy);
    positionStrategy.withFlexibleDimensions.and.returnValue(positionStrategy);
    positionStrategy.withPush.and.returnValue(positionStrategy);
    positionStrategy.withViewportMargin.and.returnValue(positionStrategy);
    flexibleConnectedTo = jasmine.createSpy('flexibleConnectedTo').and.returnValue(positionStrategy);
    closeScrollStrategy = jasmine.createSpy('closeScrollStrategy').and.returnValue({});

    overlay = jasmine.createSpyObj<Overlay>('Overlay', ['position', 'create'], {
      scrollStrategies: {close: closeScrollStrategy} as unknown as Overlay['scrollStrategies'],
    });
    overlay.position.and.returnValue(
      {flexibleConnectedTo} as unknown as ReturnType<Overlay['position']>,
    );
    overlay.create.and.returnValue(overlayRef);

    invoker = document.createElement('button');
    document.body.appendChild(invoker);
    invoker.focus();

    service = new ContextMenuService(overlay, Injector.create({providers: []}), document);
  });

  afterEach(() => {
    service.close();
    invoker.remove();
  });

  it('creates a pushed four-way overlay and focuses its first enabled item', fakeAsync(() => {
    service.open(config, {x: 120, y: 240});
    flushMicrotasks();

    expect(flexibleConnectedTo).toHaveBeenCalledWith({x: 120, y: 240});
    expect(positionStrategy.withPositions.calls.mostRecent().args[0]).toHaveSize(4);
    expect(positionStrategy.withFlexibleDimensions).toHaveBeenCalledWith(false);
    expect(positionStrategy.withPush).toHaveBeenCalledWith(true);
    expect(positionStrategy.withViewportMargin).toHaveBeenCalledWith(8);
    expect(overlay.create).toHaveBeenCalledWith(jasmine.objectContaining({
      hasBackdrop: true,
      backdropClass: 'transparent',
      disposeOnNavigation: true,
    }));
    expect(component.focusInitialItem).toHaveBeenCalledTimes(1);

    positionStrategy.positionChanges.next({});
    expect(component.repositionOpenSubmenu).toHaveBeenCalledTimes(1);
  }));

  it('closes on component dismissal and restores focus to the invoker', () => {
    const focus = spyOn(invoker, 'focus').and.callThrough();
    service.open(config, {x: 10, y: 20});

    component.dismissed.emit();

    expect(overlayRef.dispose).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalled();
  });

  it('cleans up a scroll-strategy detachment and cancels queued menu focus', fakeAsync(() => {
    const focus = spyOn(invoker, 'focus').and.callThrough();
    service.open(config, {x: 10, y: 20});

    detachments.next();
    flushMicrotasks();

    expect(component.focusInitialItem).not.toHaveBeenCalled();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(overlayRef.dispose).toHaveBeenCalledTimes(1);
  }));

  it('forgets the prior invoker after a navigation disposal before the next menu opens', fakeAsync(() => {
    const priorFocus = spyOn(invoker, 'focus').and.callThrough();
    service.open(config, {x: 10, y: 20});
    flushMicrotasks();

    detachments.next();
    detachments.complete();
    flushMicrotasks();

    const nextInvoker = document.createElement('button');
    document.body.appendChild(nextInvoker);
    nextInvoker.focus();
    const nextFocus = spyOn(nextInvoker, 'focus').and.callThrough();
    const nextDetachments = new Subject<void>();
    const secondRef = jasmine.createSpyObj<OverlayRef>('SecondOverlayRef', [
      'attach',
      'dispose',
      'backdropClick',
      'keydownEvents',
      'detachments',
      'hasAttached',
    ]);
    secondRef.attach.and.returnValue({instance: component} as unknown as ComponentRef<ContextMenuComponent>);
    secondRef.backdropClick.and.returnValue(new Subject<MouseEvent>());
    secondRef.keydownEvents.and.returnValue(new Subject<KeyboardEvent>());
    secondRef.detachments.and.returnValue(nextDetachments);
    secondRef.hasAttached.and.returnValue(true);
    overlay.create.and.returnValue(secondRef);

    service.open(config, {x: 30, y: 40});
    component.dismissed.emit();

    expect(priorFocus).toHaveBeenCalledTimes(1);
    expect(nextFocus).toHaveBeenCalledTimes(1);
    expect(secondRef.dispose).toHaveBeenCalledTimes(1);
    nextInvoker.remove();
  }));

  it('closes on backdrop click and Escape', () => {
    service.open(config, {x: 10, y: 20});
    backdropClicks.next(new MouseEvent('click'));
    expect(overlayRef.dispose).toHaveBeenCalledTimes(1);

    overlayRef.dispose.calls.reset();
    service.open(config, {x: 30, y: 40});
    const escape = new KeyboardEvent('keydown', {key: 'Escape', cancelable: true});
    keydownEvents.next(escape);

    expect(escape.defaultPrevented).toBeTrue();
    expect(overlayRef.dispose).toHaveBeenCalledTimes(1);
  });

  it('replaces an open overlay without restoring focus until the replacement closes', () => {
    const firstRef = overlayRef;
    const secondRef = jasmine.createSpyObj<OverlayRef>('SecondOverlayRef', [
      'attach',
      'dispose',
      'backdropClick',
      'keydownEvents',
      'detachments',
      'hasAttached',
    ]);
    secondRef.attach.and.returnValue({instance: component} as unknown as ComponentRef<ContextMenuComponent>);
    secondRef.backdropClick.and.returnValue(new Subject<MouseEvent>());
    secondRef.keydownEvents.and.returnValue(new Subject<KeyboardEvent>());
    secondRef.detachments.and.returnValue(new Subject<void>());
    secondRef.hasAttached.and.returnValue(true);
    overlay.create.and.returnValues(firstRef, secondRef);
    const focus = spyOn(invoker, 'focus').and.callThrough();

    service.open(config, {x: 10, y: 20});
    service.open(config, {x: 30, y: 40});

    expect(firstRef.dispose).toHaveBeenCalledTimes(1);
    expect(focus).not.toHaveBeenCalled();

    service.close();
    expect(secondRef.dispose).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
