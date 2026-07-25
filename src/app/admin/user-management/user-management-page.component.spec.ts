import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {User} from 'firebase/auth';
import {of} from 'rxjs';

import {AuthService} from '../../services/auth.service';
import {AdminManagedUser} from './models/user-management.models';
import {UserManagementService} from './services/user-management.service';
import {UserManagementPageComponent} from './user-management-page.component';

const managedUser: AdminManagedUser = {
  uid: 'reader-uid',
  email: 'reader@example.com',
  displayName: 'Reader Example',
  photoURL: null,
  providerIds: ['password'],
  disabled: false,
  emailVerified: true,
  createdAt: '2026-07-01T12:00:00.000Z',
  lastSignInAt: '2026-07-16T12:00:00.000Z',
  roles: ['viewer'],
  customClaims: {roles: {viewer: true}},
};

describe('UserManagementPageComponent', () => {
  let fixture: ComponentFixture<UserManagementPageComponent>;
  let startViewingAsUser: jasmine.Spy;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const userManagement = jasmine.createSpyObj<UserManagementService>('UserManagementService', [
      'listUsers',
      'updateUserRoles',
    ]);
    userManagement.listUsers.and.resolveTo({
      users: [managedUser],
      nextPageToken: null,
      fetchedAt: '2026-07-17T12:00:00.000Z',
    });
    startViewingAsUser = jasmine.createSpy('startViewingAsUser').and.resolveTo();
    const authService = {
      user$: of({uid: 'admin-uid'} as User),
      startViewingAsUser,
    };
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [UserManagementPageComponent],
      providers: [
        {provide: UserManagementService, useValue: userManagement},
        {provide: AuthService, useValue: authService},
        {provide: Router, useValue: router},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('confirms the read-oriented boundary before starting a user view', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const viewButton = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'View as User');

    viewButton?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('View the application as Reader Example?');
    expect(element.textContent).toContain('Firebase still authenticates requests as your admin account');

    const startButton = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Start View');
    startButton?.click();
    await fixture.whenStable();

    expect(startViewingAsUser).toHaveBeenCalledOnceWith(managedUser);
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/');
  });
});
