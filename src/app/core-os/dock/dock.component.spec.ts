import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {Router} from '@angular/router';
import {of, throwError} from 'rxjs';

import {ApplicationManagerService} from '@core-os/app-registry/application-manager.service';
import {AppEntry, AppType} from '@core-os/app-registry/application-manager.models';
import {AuthService, AdminAuthorization} from '../../services/auth.service';
import {NotificationService} from '../../components/game/services/notification.service';

import {DockComponent} from './dock.component';

describe('DockComponent', () => {
  let component: DockComponent;
  let fixture: ComponentFixture<DockComponent>;
  let appManager: jasmine.SpyObj<ApplicationManagerService>;
  let authService: jasmine.SpyObj<AuthService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let router: jasmine.SpyObj<Router>;
  let notesApp: AppEntry;

  afterEach(() => {
    document.querySelectorAll('.test-window-focus-target').forEach((element) => element.remove());
  });

  beforeEach(async () => {
    notesApp = {
      id: 'notes',
      title: 'Notes',
      component: class {},
      installed: true,
      running: false,
      maxInstances: 1,
      instanceIndex: 0,
      type: AppType.app,
      memory: 128,
    };
    appManager = jasmine.createSpyObj<ApplicationManagerService>(
      'ApplicationManagerService',
      [
        'openApplication',
        'closeApplication',
        'setApplicationFocus',
        'getApps',
        'getRunningApps',
        'getFocusedAppId',
      ],
      {registeredApps: [notesApp], openApplications: []}
    );
    appManager.getApps.and.returnValue([notesApp]);
    appManager.openApplication.and.returnValue(true);
    appManager.getFocusedAppId.and.returnValue('notes');

    authService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['getRoleAuthorization', 'logout'],
      {user$: of({uid: 'reader'}) as AuthService['user$']}
    );
    authService.getRoleAuthorization.and.returnValue(of({
      isAuthorized: true,
    } as AdminAuthorization));
    authService.logout.and.returnValue(of(void 0));

    notificationService = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['generateRandomNotification']
    );
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.resolveTo(true);
    router.navigateByUrl.and.resolveTo(true);
    await TestBed.configureTestingModule({
      imports: [DockComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: ApplicationManagerService, useValue: appManager},
        {provide: AuthService, useValue: authService},
        {provide: NotificationService, useValue: notificationService},
        {provide: Router, useValue: router},
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the dock and exposes authorized account actions', () => {
    const accountState = component as unknown as {
      isSignedIn: () => boolean;
      canOpenAdmin: () => boolean;
      canManageUsers: () => boolean;
    };

    expect(component).toBeTruthy();
    expect(accountState.isSignedIn()).toBeTrue();
    expect(accountState.canOpenAdmin()).toBeTrue();
    expect(accountState.canManageUsers()).toBeTrue();
  });

  it('uses a single Dock click to launch or focus an installed application', () => {
    const appButton = fixture.nativeElement.querySelector('.dock-icon') as HTMLButtonElement;

    appButton.click();

    expect(appButton.getAttribute('aria-label')).toBe('Open Notes');
    expect(appManager.openApplication).toHaveBeenCalledOnceWith('notes', undefined);
    expect(appManager.setApplicationFocus).not.toHaveBeenCalled();
  });

  it('does not show a launch bounce when the application cannot open', () => {
    appManager.openApplication.and.returnValue(false);

    component.openApp('notes');

    expect((component as unknown as {openingAppId: () => string | null}).openingAppId()).toBeNull();
  });

  it('moves keyboard focus from a launch item to the newly opened window', fakeAsync(() => {
    const windowTarget = document.createElement('button');
    windowTarget.className = 'test-window-focus-target';
    windowTarget.dataset['windowId'] = 'notes';
    document.body.appendChild(windowTarget);
    const appButton = fixture.nativeElement.querySelector('.dock-icon') as HTMLButtonElement;
    appButton.focus();

    appButton.click();
    tick(20);

    expect(document.activeElement).toBe(windowTarget);
    tick(450);
  }));

  it('moves keyboard focus from a Dock item to a restored window', fakeAsync(() => {
    notesApp.running = true;
    notesApp.minimized = true;
    fixture.detectChanges();
    const windowTarget = document.createElement('button');
    windowTarget.className = 'test-window-focus-target';
    windowTarget.dataset['windowId'] = 'notes';
    document.body.appendChild(windowTarget);
    const appButton = fixture.nativeElement.querySelector('.dock-icon') as HTMLButtonElement;
    appButton.focus();

    appButton.click();
    tick(20);

    expect(document.activeElement).toBe(windowTarget);
  }));

  it('delegates close, notification, navigation, and logout actions', () => {
    component.closeApp('notes');
    component.notify();
    component.navigateTo('/profile');
    component.logout();

    expect(appManager.closeApplication).toHaveBeenCalledOnceWith('notes');
    expect(notificationService.generateRandomNotification).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/profile');
    expect(authService.logout).toHaveBeenCalledTimes(1);
  });

  it('labels running and minimized applications from lifecycle state', () => {
    notesApp.running = true;
    expect(component.getDockActionLabel(notesApp)).toBe('Show Notes');

    notesApp.minimized = true;
    expect(component.getDockActionLabel(notesApp)).toBe('Restore Notes');
  });

  it('leaves logout failure reporting to the authentication service', () => {
    authService.logout.and.returnValue(throwError(() => new Error('sign-out failed')));

    expect(() => component.logout()).not.toThrow();
    expect(authService.logout).toHaveBeenCalledTimes(1);
  });
});
