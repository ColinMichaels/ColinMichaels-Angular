import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {BehaviorSubject, of, Subject, throwError} from 'rxjs';

import {ApplicationManagerService} from '@core-os/app-registry/application-manager.service';
import {FileSystemService, VIEW_MODES} from '../../components/game/services/file-system.service';
import {OsUserService} from '../../components/game/services/os-user.service';
import {AuthService} from '../../services/auth.service';

import {SystemTrayComponent} from './system-tray.component';

describe('SystemTrayComponent', () => {
  let component: SystemTrayComponent;
  let fixture: ComponentFixture<SystemTrayComponent>;
  let appManager: jasmine.SpyObj<ApplicationManagerService>;
  let fileService: jasmine.SpyObj<FileSystemService>;
  let authService: jasmine.SpyObj<AuthService>;
  let viewMode$: BehaviorSubject<VIEW_MODES>;

  beforeEach(async () => {
    appManager = jasmine.createSpyObj<ApplicationManagerService>(
      'ApplicationManagerService',
      ['openApplication', 'closeApplication', 'closeAllApps', 'getFocusedAppId'],
      {
        registeredApps: [],
        openApplications: [],
        usedMemory: 1024,
        totalMemory: 4096,
      }
    );
    appManager.getFocusedAppId.and.returnValue('desktop');

    viewMode$ = new BehaviorSubject<VIEW_MODES>(VIEW_MODES.list);
    fileService = jasmine.createSpyObj<FileSystemService>(
      'FileSystemService',
      ['setViewMode'],
      {viewMode$: viewMode$.asObservable()}
    );
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    authService.logout.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [SystemTrayComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        {provide: ApplicationManagerService, useValue: appManager},
        {provide: FileSystemService, useValue: fileService},
        {provide: OsUserService, useValue: {user: {name: 'Colin'}}},
        {provide: AuthService, useValue: authService},
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SystemTrayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the tray with named native menu controls', () => {
    const appleMenu = fixture.nativeElement.querySelector(
      'button[aria-label="Apple menu"]'
    ) as HTMLButtonElement;

    expect(component).toBeTruthy();
    expect(appleMenu.type).toBe('button');
    expect(appleMenu.getAttribute('aria-expanded')).toBe('false');

    appleMenu.click();
    fixture.detectChanges();

    expect(appleMenu.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="menu"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="menuitem"]')?.tagName).toBe('BUTTON');
  });

  it('keeps exactly one tray menu open at a time', () => {
    component.toggleMenu('file');
    expect(component.menuOpen()).toBe('file');

    component.toggleMenu('view');
    expect(component.menuOpen()).toBe('view');

    component.toggleMenu('view');
    expect(component.menuOpen()).toBe('');
  });

  it('mirrors and delegates the shared filesystem view mode', () => {
    viewMode$.next(VIEW_MODES.grid);
    expect(component.viewMode()).toBe(VIEW_MODES.grid);

    component.setViewMode(VIEW_MODES.columns);

    expect(component.viewMode()).toBe(VIEW_MODES.columns);
    expect(fileService.setViewMode).toHaveBeenCalledOnceWith(VIEW_MODES.columns);
  });

  it('delegates application lifecycle actions and formats memory totals', () => {
    component.openApp('finder');
    component.closeApp('finder');
    component.closeAllApps();

    expect(appManager.openApplication).toHaveBeenCalledOnceWith('finder');
    expect(appManager.closeApplication).toHaveBeenCalledOnceWith('finder');
    expect(appManager.closeAllApps).toHaveBeenCalledTimes(1);
    expect(component.inGbs(component.usedMemory)).toBe('1.00');
    expect(component.inGbs(component.totalMemory)).toBe('4.00');
    expect(component.inGbs(0)).toBe('0.00');
    expect(component.userName).toBe('Colin');
  });

  it('terminates the authenticated session from the tray logout action', () => {
    component.toggleMenu('apple');
    fixture.detectChanges();
    const logoutButton = Array.from(
      fixture.nativeElement.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLButtonElement>
    ).find(item => item.textContent?.includes('Log Out')) as HTMLButtonElement;

    expect(logoutButton.tagName).toBe('BUTTON');
    logoutButton.click();
    fixture.detectChanges();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(component.menuOpen()).toBe('');
    expect(component.logoutPending()).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps the tray open and surfaces a logout failure', () => {
    authService.logout.and.returnValue(throwError(() => new Error('sign-out failed')));
    component.toggleMenu('apple');
    fixture.detectChanges();
    const logoutButton = Array.from(
      fixture.nativeElement.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLButtonElement>
    ).find(item => item.textContent?.includes('Log Out')) as HTMLButtonElement;

    logoutButton.click();
    fixture.detectChanges();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(component.menuOpen()).toBe('apple');
    expect(component.logoutPending()).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Unable to log out. Try again.');
  });

  it('prevents duplicate session termination while logout is pending', () => {
    const logout$ = new Subject<void>();
    authService.logout.and.returnValue(logout$);

    component.logout();
    component.logout();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(component.logoutPending()).toBeTrue();

    logout$.next();
    logout$.complete();

    expect(component.logoutPending()).toBeFalse();
  });

  it('lets an in-flight session termination reach its terminal event after tray teardown', () => {
    const logout$ = new Subject<void>();
    authService.logout.and.returnValue(logout$);

    component.logout();
    fixture.destroy();

    expect(logout$.observed).toBeTrue();

    logout$.next();
    logout$.complete();

    expect(logout$.observed).toBeFalse();
  });
});
