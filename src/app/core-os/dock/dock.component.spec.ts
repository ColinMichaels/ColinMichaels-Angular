import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {Router} from '@angular/router';
import {of, throwError} from 'rxjs';

import {ApplicationManagerService} from '@core-os/app-registry/application-manager.service';
import {AuthService, AdminAuthorization} from '../../services/auth.service';
import {NotificationService} from '../../components/game/services/notification.service';
import {SvgService} from '../../components/game/services/svg.service';

import {DockComponent} from './dock.component';

describe('DockComponent', () => {
  let component: DockComponent;
  let fixture: ComponentFixture<DockComponent>;
  let appManager: jasmine.SpyObj<ApplicationManagerService>;
  let authService: jasmine.SpyObj<AuthService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let router: jasmine.SpyObj<Router>;
  let svgService: jasmine.SpyObj<SvgService>;

  beforeEach(async () => {
    appManager = jasmine.createSpyObj<ApplicationManagerService>(
      'ApplicationManagerService',
      ['openApplication', 'closeApplication', 'setApplicationFocus', 'getApps', 'getRunningApps'],
      {registeredApps: [], openApplications: []}
    );
    appManager.getApps.and.returnValue([{
      id: 'notes',
      title: 'Notes',
      installed: true,
      running: false,
    } as ReturnType<ApplicationManagerService['getApps']>[number]]);

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
    svgService = jasmine.createSpyObj<SvgService>('SvgService', ['loadIcons']);
    svgService.loadIcons.and.returnValue([]);

    await TestBed.configureTestingModule({
      imports: [DockComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: ApplicationManagerService, useValue: appManager},
        {provide: AuthService, useValue: authService},
        {provide: NotificationService, useValue: notificationService},
        {provide: Router, useValue: router},
        {provide: SvgService, useValue: svgService},
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

  it('uses single-click focus and double-click launch for registered applications', () => {
    const appButton = fixture.nativeElement.querySelector('.dock-icon') as HTMLButtonElement;

    appButton.click();
    appButton.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));

    expect(appManager.setApplicationFocus).toHaveBeenCalledWith('notes');
    expect(appManager.openApplication).toHaveBeenCalledWith('notes', undefined);
  });

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

  it('loads the preserved static system icon set through the icon service', () => {
    void component.staticApps;

    expect(svgService.loadIcons).toHaveBeenCalledWith([
      'safari',
      'notes',
      'calendar',
      'clock',
      'phone',
      'camera',
    ], 'system');
  });

  it('leaves logout failure reporting to the authentication service', () => {
    authService.logout.and.returnValue(throwError(() => new Error('sign-out failed')));

    expect(() => component.logout()).not.toThrow();
    expect(authService.logout).toHaveBeenCalledTimes(1);
  });
});
