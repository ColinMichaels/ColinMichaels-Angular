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
  points: {
    total: 25,
    postReads: 10,
    shares: 0,
    approvedComments: 15,
    dailyDiscoveries: 0,
    manualAdjustments: 0,
  },
};

const leaderboardUser: AdminManagedUser = {
  ...managedUser,
  uid: 'leader-uid',
  email: 'leader@example.com',
  displayName: 'Power Reader',
  roles: [],
  customClaims: {},
  points: {
    total: 40,
    postReads: 5,
    shares: 10,
    approvedComments: 20,
    dailyDiscoveries: 10,
    manualAdjustments: -5,
  },
};

describe('UserManagementPageComponent', () => {
  let fixture: ComponentFixture<UserManagementPageComponent>;
  let startViewingAsUser: jasmine.Spy;
  let router: jasmine.SpyObj<Router>;
  let userManagement: jasmine.SpyObj<UserManagementService>;

  beforeEach(async () => {
    userManagement = jasmine.createSpyObj<UserManagementService>('UserManagementService', [
      'adjustUserPoints',
      'deleteUser',
      'listAllUsers',
      'listUsers',
      'setUserDisabled',
      'updateUserRoles',
    ]);
    userManagement.listUsers.and.callFake(async pageToken => ({
      users: pageToken ? [leaderboardUser] : [managedUser],
      nextPageToken: pageToken ? null : 'next-page',
      fetchedAt: '2026-07-17T12:00:00.000Z',
    }));
    userManagement.listAllUsers.and.resolveTo({
      users: [managedUser, leaderboardUser],
      nextPageToken: null,
      fetchedAt: '2026-07-17T12:00:00.000Z',
    });
    userManagement.setUserDisabled.and.callFake(async request => ({
      user: {...managedUser, disabled: request.disabled},
      updatedAt: '2026-08-05T12:00:00.000Z',
    }));
    userManagement.deleteUser.and.resolveTo({
      uid: managedUser.uid,
      deletedAt: '2026-08-05T12:00:00.000Z',
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
    const readerRow = findUserRow(element, 'Reader Example');
    const viewButton = findButton(readerRow, 'View as User');

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

  it('keeps paginated account management as the default user view', async () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(userManagement.listUsers).toHaveBeenCalledOnceWith(undefined);
    expect(userManagement.listAllUsers).not.toHaveBeenCalled();
    expect(element.querySelector('#points-leaderboard-title')).toBeNull();
    expect(element.textContent).toContain('Last Sign-In');
    expect(element.textContent).toContain('Manage Roles');
    expect(element.textContent).toContain('Disable Sign-In');
    expect(element.textContent).toContain('Delete Auth User');

    findButton(element, 'Next')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(userManagement.listUsers).toHaveBeenCalledWith('next-page');
    expect(findUserRow(element, 'Power Reader')).toBeDefined();
  });

  it('loads the separate points view and sorts each earned category', async () => {
    const element = fixture.nativeElement as HTMLElement;
    findTab(element, 'Points leaderboard')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const rows = () => Array.from(element.querySelectorAll<HTMLTableRowElement>('tbody tr'));

    expect(userManagement.listAllUsers).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Points leaderboard');
    expect(element.textContent).toContain('Current balances from reading posts, shares, approved comments, Daily Discovery');
    expect(element.textContent).toContain('Current Points');
    expect(element.textContent).toContain('65');
    expect(rows()[0].textContent).toContain('#1');
    expect(rows()[0].textContent).toContain('Power Reader');
    expect(findButton(rows()[0], 'Manage Points')).toBeDefined();
    expect(findButton(rows()[0], 'Manage Roles')).toBeUndefined();
    expect(findButton(rows()[0], 'Disable Sign-In')).toBeUndefined();
    expect(findButton(rows()[0], 'Delete Auth User')).toBeUndefined();
    expect(findButton(element, 'Total')?.closest('th')?.getAttribute('aria-sort')).toBe('descending');

    findButton(element, 'Reading')?.click();
    fixture.detectChanges();

    expect(rows()[0].textContent).toContain('Reader Example');
    expect(findButton(element, 'Reading')?.closest('th')?.getAttribute('aria-sort')).toBe('descending');

    findButton(element, 'Reading')?.click();
    fixture.detectChanges();

    expect(rows()[0].textContent).toContain('Power Reader');
    expect(findButton(element, 'Reading')?.closest('th')?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('shows the current point breakdown and opens the dedicated points editor', async () => {
    const element = fixture.nativeElement as HTMLElement;
    findTab(element, 'Points leaderboard')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const readerRow = findUserRow(element, 'Reader Example');

    expect(readerRow?.textContent).toContain('25');
    expect(readerRow?.textContent).toContain('10');
    expect(readerRow?.textContent).toContain('15');
    findButton(readerRow, 'Manage Points')?.click();
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')?.textContent).toContain('Manage points for Reader Example');
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain('Current total');
  });

  it('confirms and disables Firebase Auth sign-in without deleting the user', async () => {
    const element = fixture.nativeElement as HTMLElement;
    findButton(findUserRow(element, 'Reader Example'), 'Disable Sign-In')?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Disable sign-in?');
    expect(element.textContent).toContain('prevents the same address from simply signing up again');

    const dialog = element.querySelector<HTMLElement>('[role="dialog"]');
    findButton(dialog, 'Disable Sign-In')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(userManagement.setUserDisabled).toHaveBeenCalledOnceWith({
      uid: managedUser.uid,
      disabled: true,
    });
    expect(userManagement.deleteUser).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Disabled Firebase Auth sign-in for reader@example.com.');
    expect(element.textContent).toContain('Disabled');
  });

  it('requires the exact email or uid before deleting only the Auth record', async () => {
    const element = fixture.nativeElement as HTMLElement;
    findButton(findUserRow(element, 'Reader Example'), 'Delete Auth User')?.click();
    fixture.detectChanges();

    const dialog = element.querySelector<HTMLElement>('[role="dialog"]');
    const confirmButton = findButton(dialog, 'Delete Auth User');
    const confirmationInput = dialog?.querySelector<HTMLInputElement>('input');

    expect(dialog?.textContent).toContain('Existing profile data, comments, points, and authored content are intentionally preserved.');
    expect(confirmButton?.disabled).toBeTrue();

    if (confirmationInput) {
      confirmationInput.value = managedUser.email ?? '';
      confirmationInput.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();

    expect(confirmButton?.disabled).toBeFalse();
    confirmButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(userManagement.deleteUser).toHaveBeenCalledOnceWith({
      uid: managedUser.uid,
      confirmation: managedUser.email ?? '',
    });
    expect(element.textContent).toContain('Deleted the Firebase Auth record for reader@example.com.');
    expect(element.textContent).not.toContain('Reader Example');
  });
});

function findButton(root: ParentNode | null | undefined, label: string): HTMLButtonElement | undefined {
  return Array.from(root?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    .find(button => button.textContent?.trim() === label);
}

function findTab(root: ParentNode, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    .find(button => button.textContent?.includes(label));
}

function findUserRow(root: ParentNode, label: string): HTMLTableRowElement | undefined {
  return Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr'))
    .find(row => row.textContent?.includes(label));
}
