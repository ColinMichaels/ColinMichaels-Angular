import {Component, Directive, EventEmitter, Input, Output} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {ActivatedRoute} from '@angular/router';
import {of, Subject} from 'rxjs';

import {
  ApplicationInstance,
  AppType,
} from '@core-os/app-registry/application-manager.models';
import {ApplicationManagerService} from '@core-os/app-registry/application-manager.service';
import {ContextMenuService} from '@core-os/context-menu/context-menu.service';
import {DockComponent} from '@core-os/dock/dock.component';
import {SystemTrayComponent} from '@core-os/tray/system-tray.component';
import {TypewriterService} from '@core-os/terminal/typewriter.service';
import {TooltipDirective} from '@core-os/tooltip';
import {AppWindowComponent} from '@core-os/windowing/app-window/app-window.component';

import {LogService} from '../services/log.service';
import {NotificationService} from '../services/notification.service';
import {OsUserService} from '../services/os-user.service';
import {OverlayService} from '../services/overlay.service';
import {SoundService} from '../services/sound.service';
import {LevelLoaderComponent} from '../utils/level-loader/level-loader.component';
import {DesktopComponent} from './desktop.component';

@Component({
  selector: 'app-window-identity-content',
  standalone: true,
  template: '<input data-testid="window-draft" [value]="draft">',
})
class WindowIdentityContentComponent {
  draft = 'preserved draft';
}

@Component({selector: 'app-system-tray', standalone: true, template: ''})
class SystemTrayStubComponent {}

@Component({selector: 'app-dock', standalone: true, template: ''})
class DockStubComponent {}

@Component({selector: 'app-level-loader', standalone: true, template: ''})
class LevelLoaderStubComponent {
  @Output() loaded = new EventEmitter<void>();
  @Output() failed = new EventEmitter<string>();
}

@Directive({selector: '[appTooltip]', standalone: true})
class TooltipStubDirective {
  @Input('appTooltip') tooltipText = '';
  @Input() tooltipPosition = 'top';
}

class ApplicationManagerStub {
  private readonly focus$ = new Subject<string | null>();
  openApplication = jasmine.createSpy('openApplication');
  closeAllApps = jasmine.createSpy('closeAllApps');
  closeApplication = jasmine.createSpy('closeApplication');
  minimizeApplication = jasmine.createSpy('minimizeApplication').and.callFake((id: string) => {
    this.openApplications = this.openApplications.map((application) => ({
      ...application,
      minimized: application.id === id ? true : application.minimized,
    }));
  });
  setApplicationFocus = jasmine.createSpy('setApplicationFocus').and.callFake((id: string) => {
    const application = this.openApplications.find((candidate) => candidate.id === id);
    if (!application) {
      return false;
    }
    this.openApplications = [
      ...this.openApplications
        .filter((candidate) => candidate.id !== id)
        .map((candidate) => ({...candidate, focused: false})),
      {...application, focused: true, minimized: false},
    ];
    this.focus$.next(id);
    return true;
  });
  openApplications: ApplicationInstance[] = [
    this.createInstance('cli', 'Terminal', true),
    this.createInstance('finder', 'Finder', false),
  ];

  getFocus$() {
    return this.focus$.asObservable();
  }

  getFocusedAppId(): string {
    return this.openApplications.find((application) => application.focused)?.id ?? 'desktop';
  }

  getAppByID(id: string) {
    return this.openApplications.find((application) => application.id === id);
  }

  private createInstance(id: string, title: string, focused: boolean): ApplicationInstance {
    return {
      id,
      title,
      component: WindowIdentityContentComponent,
      maxInstances: 1,
      instanceIndex: 1,
      type: AppType.system,
      memory: 64,
      installed: true,
      running: true,
      focused,
      autofit: false,
      minimized: false,
      parent: null,
    };
  }
}

describe('Desktop window identity integration', () => {
  let fixture: ComponentFixture<DesktopComponent>;
  let appManager: ApplicationManagerStub;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(async () => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = jasmine.createSpy('matchMedia').and.returnValue({matches: false} as MediaQueryList);
    appManager = new ApplicationManagerStub();

    TestBed.overrideComponent(DesktopComponent, {
      remove: {
        imports: [LevelLoaderComponent, SystemTrayComponent, DockComponent, TooltipDirective],
      },
      add: {
        imports: [LevelLoaderStubComponent, SystemTrayStubComponent, DockStubComponent, TooltipStubDirective],
      },
    });

    await TestBed.configureTestingModule({
      imports: [DesktopComponent],
      providers: [
        {provide: ApplicationManagerService, useValue: appManager},
        {provide: ContextMenuService, useValue: {open: jasmine.createSpy('open'), close: jasmine.createSpy('close')}},
        {provide: OverlayService, useValue: {showOverlay: jasmine.createSpy('showOverlay')}},
        {provide: NotificationService, useValue: {show: jasmine.createSpy('show')}},
        {provide: OsUserService, useValue: {user: {name: 'Test User', level: 1}}},
        {provide: TypewriterService, useValue: {enqueueLine: jasmine.createSpy('enqueueLine')}},
        {provide: SoundService, useValue: {play: jasmine.createSpy('play')}},
        {provide: LogService, useValue: {debug: jasmine.createSpy('debug')}},
        {provide: ActivatedRoute, useValue: {paramMap: of({get: () => null})}},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DesktopComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.querySelectorAll('.test-dock-target').forEach((element) => element.remove());
  });

  it('preserves window and embedded component identity across immutable lifecycle updates', fakeAsync(() => {
    const initialWindows = fixture.debugElement.queryAll(By.directive(AppWindowComponent));
    const terminalWindow = initialWindows.find(
      (window) => (window.componentInstance as AppWindowComponent).id === 'cli'
    );
    const finderWindow = initialWindows.find(
      (window) => (window.componentInstance as AppWindowComponent).id === 'finder'
    );

    expect(initialWindows.length).toBe(2);
    expect((terminalWindow?.componentInstance as AppWindowComponent).focused).toBeTrue();
    expect((finderWindow?.componentInstance as AppWindowComponent).focused).toBeFalse();

    const embeddedContent = terminalWindow?.query(By.directive(WindowIdentityContentComponent));
    const embeddedInstance = embeddedContent?.componentInstance as WindowIdentityContentComponent;
    embeddedInstance.draft = 'keep this edit';

    appManager.openApplications = appManager.openApplications.map((application) => ({
      ...application,
      focused: application.id === 'finder',
      minimized: application.id === 'cli',
    }));
    fixture.detectChanges();

    appManager.openApplications = appManager.openApplications.map((application) => ({
      ...application,
      minimized: false,
    }));
    fixture.detectChanges();
    tick(20);

    const updatedTerminalWindow = fixture.debugElement.queryAll(By.directive(AppWindowComponent)).find(
      (window) => (window.componentInstance as AppWindowComponent).id === 'cli'
    );
    const updatedEmbeddedContent = updatedTerminalWindow?.query(By.directive(WindowIdentityContentComponent));

    expect(updatedTerminalWindow?.componentInstance).toBe(terminalWindow?.componentInstance);
    expect(updatedEmbeddedContent?.componentInstance).toBe(embeddedInstance);
    expect((updatedEmbeddedContent?.componentInstance as WindowIdentityContentComponent).draft).toBe('keep this edit');
    expect((updatedTerminalWindow?.componentInstance as AppWindowComponent).focused).toBeFalse();
  }));

  it('preserves pointer-focused descendant DOM focus when a background window moves to the front', fakeAsync(() => {
    const initialFinderWindow = fixture.debugElement.queryAll(By.directive(AppWindowComponent)).find(
      (window) => (window.componentInstance as AppWindowComponent).id === 'finder'
    );
    const finderControl = initialFinderWindow?.query(By.css('[data-testid="window-draft"]'))
      .nativeElement as HTMLInputElement;

    finderControl.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
    finderControl.focus();
    fixture.detectChanges();
    tick(20);

    const updatedFinderWindow = fixture.debugElement.queryAll(By.directive(AppWindowComponent)).find(
      (window) => (window.componentInstance as AppWindowComponent).id === 'finder'
    );
    expect(appManager.getFocusedAppId()).toBe('finder');
    expect(updatedFinderWindow?.componentInstance).toBe(initialFinderWindow?.componentInstance);
    expect(document.activeElement).toBe(finderControl);
  }));

  it('renders the native animation finish event as minimized without manual change detection', () => {
    const dockTarget = document.createElement('button');
    dockTarget.className = 'test-dock-target';
    dockTarget.dataset['dockAppId'] = 'cli';
    document.body.appendChild(dockTarget);
    const terminalWindow = fixture.debugElement.queryAll(By.directive(AppWindowComponent)).find(
      (window) => (window.componentInstance as AppWindowComponent).id === 'cli'
    );

    const renderedWindow = (terminalWindow?.nativeElement as HTMLElement).querySelector('.app-window') as HTMLElement;
    (terminalWindow?.componentInstance as AppWindowComponent).minimizeToDock();
    const animation = renderedWindow.getAnimations().find(
      (candidate) => candidate.effect?.getTiming().duration === 480
    );

    expect(animation).toBeDefined();
    animation?.dispatchEvent(new Event('finish'));

    expect(appManager.minimizeApplication).toHaveBeenCalledOnceWith('cli');
    expect(renderedWindow.classList).toContain('hidden');
  });
});
