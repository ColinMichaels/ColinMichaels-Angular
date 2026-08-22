import {Component} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Subject} from 'rxjs';

import {ApplicationManagerService} from '@core-os/app-registry/application-manager.service';

import {AppWindowComponent} from './app-window.component';

@Component({
  selector: 'app-window-test-content',
  standalone: true,
  template: '<p data-testid="embedded-content">Embedded content</p>',
})
class EmbeddedContentComponent {
  params?: unknown;
}

const createAnimationController = (name: string) => {
  const listeners = new Map<string, EventListenerOrEventListenerObject[]>();
  const addEventListener = jasmine.createSpy(`add ${name} listener`).and.callFake(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    }
  );
  const animation = {
    addEventListener,
    cancel: jasmine.createSpy(`cancel ${name}`),
  } as unknown as Animation;

  return {
    animation,
    dispatch(type: string) {
      const event = new Event(type);
      listeners.get(type)?.forEach((listener) => {
        if (typeof listener === 'function') {
          listener.call(animation, event);
        } else {
          listener.handleEvent(event);
        }
      });
    },
  };
};

describe('AppWindowComponent', () => {
  let component: AppWindowComponent;
  let fixture: ComponentFixture<AppWindowComponent>;
  let focus$: Subject<string | null>;
  let appManager: jasmine.SpyObj<ApplicationManagerService>;

  afterEach(() => {
    document.body.style.userSelect = '';
    document.querySelectorAll('[data-dock-app-id]').forEach((element) => element.remove());
    document.querySelectorAll('.test-focus-target').forEach((element) => element.remove());
  });

  beforeEach(async () => {
    focus$ = new Subject<string | null>();
    appManager = jasmine.createSpyObj<ApplicationManagerService>(
      'ApplicationManagerService',
      [
        'closeApplication',
        'getAppByID',
        'getFocus$',
        'getFocusedAppId',
        'minimizeApplication',
        'setApplicationFocus',
      ]
    );
    appManager.getFocus$.and.returnValue(focus$.asObservable());
    appManager.getFocusedAppId.and.returnValue('desktop');
    appManager.getAppByID.and.returnValue({id: 'cli'} as ReturnType<ApplicationManagerService['getAppByID']>);

    await TestBed.configureTestingModule({
      imports: [AppWindowComponent],
      providers: [{provide: ApplicationManagerService, useValue: appManager}],
    }).compileComponents();

    fixture = TestBed.createComponent(AppWindowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'cli');
    fixture.componentRef.setInput('title', 'Terminal');
    fixture.componentRef.setInput('embeddedComponent', EmbeddedContentComponent);
    fixture.componentRef.setInput('params', {file: 'gameplay.doc.md'});
    fixture.detectChanges();
  });

  it('creates the window, loads its embedded component, and forwards parameters', () => {
    const embedded = fixture.debugElement.query(By.directive(EmbeddedContentComponent));

    expect(component).toBeTruthy();
    expect(embedded).not.toBeNull();
    expect((embedded.componentInstance as EmbeddedContentComponent).params).toEqual({
      file: 'gameplay.doc.md',
    });
    expect(fixture.nativeElement.querySelector('[data-testid="embedded-content"]')?.textContent)
      .toContain('Embedded content');
  });

  it('forwards later activation parameters without recreating the embedded app', () => {
    const embedded = fixture.debugElement.query(By.directive(EmbeddedContentComponent));
    const instance = embedded.componentInstance as EmbeddedContentComponent;

    fixture.componentRef.setInput('params', {path: 'trash'});
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(EmbeddedContentComponent)).componentInstance).toBe(instance);
    expect(instance.params).toEqual({path: 'trash'});
  });

  it('tracks focus events case-insensitively', () => {
    focus$.next('CLI');
    expect(component.focused).toBeTrue();

    focus$.next('finder');
    expect(component.focused).toBeFalse();
  });

  it('closes the matching application and removes the window from view', () => {
    component.closeApp();
    fixture.detectChanges();

    expect(appManager.closeApplication).toHaveBeenCalledOnceWith('cli');
    expect(fixture.nativeElement.querySelector('.app-window')).toBeNull();
  });

  it('exposes native window controls with clear accessible names', () => {
    const element = fixture.nativeElement as HTMLElement;
    const controls = Array.from(element.querySelectorAll<HTMLButtonElement>('[aria-label]'));
    const labels = controls.map((control) => control.getAttribute('aria-label'));

    expect(labels).toContain('Close Terminal');
    expect(labels).toContain('Minimize Terminal to Dock');
    expect(labels).toContain('Zoom Terminal');
  });

  it('promotes a background window when keyboard focus enters one of its controls', () => {
    appManager.setApplicationFocus.and.returnValue(true);
    component.focused = false;
    const closeButton = fixture.nativeElement.querySelector('[aria-label="Close Terminal"]') as HTMLButtonElement;

    closeButton.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));

    expect(appManager.setApplicationFocus).toHaveBeenCalledOnceWith('cli', 40, 40);
    expect(component.focused).toBeTrue();
  });

  it('does not treat a yellow-control double-click as a title-bar zoom', () => {
    const toggleMaximize = spyOn(component, 'toggleMaximize');
    const minimizeButton = fixture.nativeElement.querySelector(
      '[aria-label="Minimize Terminal to Dock"]'
    ) as HTMLButtonElement;

    minimizeButton.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));

    expect(toggleMaximize).not.toHaveBeenCalled();
  });

  it('does not add a third zoom toggle when the green control is double-clicked', () => {
    const toggleMaximize = spyOn(component, 'toggleMaximize').and.callThrough();
    const zoomButton = fixture.nativeElement.querySelector('[aria-label="Zoom Terminal"]') as HTMLButtonElement;

    zoomButton.click();
    zoomButton.click();
    zoomButton.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));

    expect(toggleMaximize).toHaveBeenCalledTimes(2);
    expect(component.isMaximized).toBeFalse();
  });

  it('minimizes immediately when no matching Dock target is rendered', () => {
    component.minimizeToDock();

    expect(appManager.minimizeApplication).toHaveBeenCalledOnceWith('cli');
  });

  it('animates toward the matching Dock icon before committing minimized state', () => {
    const dockTarget = document.createElement('button');
    dockTarget.dataset['dockAppId'] = 'cli';
    document.body.appendChild(dockTarget);
    const appWindow = fixture.nativeElement.querySelector('.app-window') as HTMLDivElement;
    const animationController = createAnimationController('minimize');
    const animate = spyOn(appWindow, 'animate').and.returnValue(animationController.animation);

    component.minimizeToDock();

    expect(animate).toHaveBeenCalled();
    expect(appManager.minimizeApplication).not.toHaveBeenCalled();

    animationController.dispatch('finish');
    expect(appManager.minimizeApplication).toHaveBeenCalledOnceWith('cli');
    expect(animationController.animation.cancel).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending minimize when Dock activation focuses the window again', () => {
    const dockTarget = document.createElement('button');
    dockTarget.dataset['dockAppId'] = 'cli';
    document.body.appendChild(dockTarget);
    const appWindow = fixture.nativeElement.querySelector('.app-window') as HTMLDivElement;
    const animationController = createAnimationController('minimize');
    spyOn(appWindow, 'animate').and.returnValue(animationController.animation);

    component.minimizeToDock();
    focus$.next('cli');

    expect(animationController.animation.cancel).toHaveBeenCalledTimes(1);
    animationController.dispatch('finish');
    expect(appManager.minimizeApplication).not.toHaveBeenCalled();
  });

  it('keeps a new minimize animation authoritative when it interrupts a restore', () => {
    const dockTarget = document.createElement('button');
    dockTarget.dataset['dockAppId'] = 'cli';
    document.body.appendChild(dockTarget);
    const appWindow = fixture.nativeElement.querySelector('.app-window') as HTMLDivElement;
    const restoreController = createAnimationController('restore');
    const minimizeController = createAnimationController('minimize');
    spyOn(appWindow, 'animate').and.returnValues(
      restoreController.animation,
      minimizeController.animation,
    );

    (component as unknown as {animateFromDock(): void}).animateFromDock();
    component.minimizeToDock();

    expect(restoreController.animation.cancel).toHaveBeenCalledTimes(1);
    restoreController.dispatch('finish');
    expect(appManager.minimizeApplication).not.toHaveBeenCalled();

    minimizeController.dispatch('finish');
    expect(appManager.minimizeApplication).toHaveBeenCalledOnceWith('cli');
    expect(minimizeController.animation.cancel).toHaveBeenCalledTimes(1);
  });

  it('moves DOM focus to the Dock after a reduced-motion minimize', fakeAsync(() => {
    const dockTarget = document.createElement('button');
    dockTarget.className = 'test-focus-target';
    dockTarget.dataset['dockAppId'] = 'cli';
    document.body.appendChild(dockTarget);
    spyOn(window, 'matchMedia').and.returnValue({matches: true} as MediaQueryList);

    component.minimizeToDock();
    tick(20);

    expect(document.activeElement).toBe(dockTarget);
  }));

  it('moves DOM focus to the next lifecycle-focused window after close', fakeAsync(() => {
    const nextWindow = document.createElement('button');
    nextWindow.className = 'test-focus-target';
    nextWindow.dataset['windowId'] = 'finder';
    document.body.appendChild(nextWindow);
    appManager.getFocusedAppId.and.returnValue('finder');

    component.closeApp();
    tick(20);

    expect(document.activeElement).toBe(nextWindow);
  }));

  it('zooms within configured bounds and restores the prior window bounds', () => {
    const appWindow = fixture.nativeElement.querySelector('.app-window') as HTMLDivElement;
    const initialBounds = {
      left: appWindow.style.left,
      top: appWindow.style.top,
      width: appWindow.style.width,
      height: appWindow.style.height,
    };

    component.toggleMaximize();
    expect(component.isMaximized).toBeTrue();
    expect(parseFloat(appWindow.style.width)).toBeLessThanOrEqual(component.maxWidth);
    expect(parseFloat(appWindow.style.height)).toBeLessThanOrEqual(component.maxHeight);

    component.toggleMaximize();
    expect(component.isMaximized).toBeFalse();
    expect(appWindow.style.left).toBe(initialBounds.left);
    expect(appWindow.style.top).toBe(initialBounds.top);
    expect(appWindow.style.width).toBe(initialBounds.width);
    expect(appWindow.style.height).toBe(initialBounds.height);
  });

  it('focuses a window from child interaction while preserving its current offset', () => {
    appManager.setApplicationFocus.and.returnValue(true);
    const child = document.createElement('span');
    const currentTarget = document.createElement('div');

    component.bringToFront({target: child, currentTarget} as unknown as MouseEvent);

    expect(appManager.setApplicationFocus).toHaveBeenCalledOnceWith('cli', 40, 40);
    expect(component.focused).toBeTrue();
  });

  it('clamps drag movement to the visible viewport', () => {
    const appWindow = fixture.nativeElement.querySelector('.app-window') as HTMLDivElement;
    const header = fixture.nativeElement.querySelector('.app-window-header') as HTMLDivElement;
    Object.defineProperties(appWindow, {
      offsetLeft: {configurable: true, value: 40},
      offsetTop: {configurable: true, value: 40},
      offsetWidth: {configurable: true, value: 300},
      offsetHeight: {configurable: true, value: 200},
    });

    header.dispatchEvent(new PointerEvent('pointerdown', {clientX: 50, clientY: 50, bubbles: true}));
    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: window.innerWidth + 500,
      clientY: window.innerHeight + 500,
      bubbles: true,
    }));

    expect(appWindow.style.left).toBe(`${window.innerWidth - 310}px`);
    expect(appWindow.style.top).toBe(`${window.innerHeight - 210}px`);
    document.dispatchEvent(new PointerEvent('pointerup', {bubbles: true}));
    expect(document.body.style.userSelect).toBe('');
  });

  it('constrains resize movement to the configured dimensions', () => {
    const appWindow = fixture.nativeElement.querySelector('.app-window') as HTMLDivElement;
    const resizeHandle = fixture.nativeElement.querySelector('[class*="cursor-nwse-resize"]') as HTMLDivElement;
    Object.defineProperties(appWindow, {
      offsetWidth: {configurable: true, value: 500},
      offsetHeight: {configurable: true, value: 500},
    });
    fixture.componentRef.setInput('maxWidth', 700);
    fixture.componentRef.setInput('maxHeight', 650);
    fixture.detectChanges();
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    resizeHandle.dispatchEvent(new PointerEvent('pointerdown', {clientX: 100, clientY: 100, bubbles: true}));
    document.dispatchEvent(new PointerEvent('pointermove', {clientX: 2000, clientY: 2000, bubbles: true}));

    expect(appWindow.style.width).toBe('700px');
    expect(appWindow.style.height).toBe('650px');
    expect(appWindow.classList).toContain('resizing');
    document.dispatchEvent(new PointerEvent('pointerup', {bubbles: true}));
    expect(appWindow.classList).not.toContain('resizing');
    expect(document.body.style.userSelect).toBe('');
  });

  it('removes pointer listeners and restores its owned selection lock during teardown', () => {
    const removeEventListener = spyOn(document, 'removeEventListener').and.callThrough();
    const header = fixture.nativeElement.querySelector('.app-window-header') as HTMLDivElement;
    document.body.style.userSelect = 'text';
    header.dispatchEvent(new PointerEvent('pointerdown', {clientX: 50, clientY: 50, bubbles: true}));

    expect(document.body.style.userSelect).toBe('none');

    fixture.destroy();

    expect(removeEventListener).toHaveBeenCalledWith('pointerup', jasmine.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('pointermove', jasmine.any(Function));
    expect(document.body.style.userSelect).toBe('text');
  });

  it('cancels an in-flight minimize animation during teardown', () => {
    const dockTarget = document.createElement('button');
    dockTarget.dataset['dockAppId'] = 'cli';
    document.body.appendChild(dockTarget);
    const appWindow = fixture.nativeElement.querySelector('.app-window') as HTMLDivElement;
    const animationController = createAnimationController('minimize');
    spyOn(appWindow, 'animate').and.returnValue(animationController.animation);

    component.minimizeToDock();
    fixture.destroy();

    expect(animationController.animation.cancel).toHaveBeenCalledTimes(1);
  });
});
