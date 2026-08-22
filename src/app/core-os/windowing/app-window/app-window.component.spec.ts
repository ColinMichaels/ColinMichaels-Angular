import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
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

describe('AppWindowComponent', () => {
  let component: AppWindowComponent;
  let fixture: ComponentFixture<AppWindowComponent>;
  let focus$: Subject<string | null>;
  let appManager: jasmine.SpyObj<ApplicationManagerService>;

  afterEach(() => {
    document.body.style.userSelect = '';
  });

  beforeEach(async () => {
    focus$ = new Subject<string | null>();
    appManager = jasmine.createSpyObj<ApplicationManagerService>(
      'ApplicationManagerService',
      ['closeApplication', 'getAppByID', 'getFocus$', 'setApplicationFocus']
    );
    appManager.getFocus$.and.returnValue(focus$.asObservable());
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
});
