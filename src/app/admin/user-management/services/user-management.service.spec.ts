import {TestBed} from '@angular/core/testing';

import {UserAccountDocument} from '../../../shared/user-account/user-account.model';
import {UserAccountService} from '../../../shared/user-account/user-account.service';
import {AdminManagedUser, AdminUsersResponse} from '../models/user-management.models';
import {UserManagementService} from './user-management.service';

const firstUser = createManagedUser('first-user', 20);
const secondUser = createManagedUser('second-user', 40);

interface UserManagementServiceTestHarness {
  callListUsers(request: { pageSize: number; pageToken?: string }): Promise<AdminUsersResponse>;
}

describe('UserManagementService', () => {
  it('loads every Firebase Auth page for a complete sortable leaderboard', async () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(UserManagementService);
    const listUsers = spyOn(service, 'listUsers').and.returnValues(
      Promise.resolve(createResponse([firstUser], 'next-page')),
      Promise.resolve(createResponse([secondUser], null))
    );

    const result = await service.listAllUsers();

    expect(listUsers.calls.allArgs()).toEqual([
      [undefined, 100, true],
      ['next-page', 100, true],
    ]);
    expect(result.users).toEqual([firstUser, secondUser]);
    expect(result.nextPageToken).toBeNull();
  });

  it('hydrates legacy callable responses from the same user account points shown on profiles', async () => {
    const userAccountService = jasmine.createSpyObj<UserAccountService>('UserAccountService', ['getUserAccount']);
    userAccountService.getUserAccount.and.resolveTo({
      uid: firstUser.uid,
      points: firstUser.points,
    } as UserAccountDocument);
    TestBed.configureTestingModule({
      providers: [{provide: UserAccountService, useValue: userAccountService}],
    });
    const service = TestBed.inject(UserManagementService);
    const harness = service as unknown as UserManagementServiceTestHarness;
    const legacyUser = {...firstUser} as Partial<AdminManagedUser>;
    delete legacyUser.points;
    spyOn(harness, 'callListUsers').and.resolveTo(
      createResponse([legacyUser as AdminManagedUser], null)
    );

    const result = await service.listAllUsers();

    expect(userAccountService.getUserAccount).toHaveBeenCalledOnceWith(firstUser.uid);
    expect(result.users[0].points).toEqual(firstUser.points);
  });

  it('uses a complete callable point projection without a duplicate profile read', async () => {
    const userAccountService = jasmine.createSpyObj<UserAccountService>('UserAccountService', ['getUserAccount']);
    TestBed.configureTestingModule({
      providers: [{provide: UserAccountService, useValue: userAccountService}],
    });
    const service = TestBed.inject(UserManagementService);
    const harness = service as unknown as UserManagementServiceTestHarness;
    spyOn(harness, 'callListUsers').and.resolveTo(createResponse([firstUser], null));

    const result = await service.listUsers(undefined, 100, true);

    expect(userAccountService.getUserAccount).not.toHaveBeenCalled();
    expect(result.users[0].points).toEqual(firstUser.points);
  });
});

function createManagedUser(uid: string, total: number): AdminManagedUser {
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: uid,
    photoURL: null,
    providerIds: ['password'],
    disabled: false,
    emailVerified: true,
    createdAt: '2026-08-01T12:00:00.000Z',
    lastSignInAt: '2026-08-09T12:00:00.000Z',
    roles: [],
    customClaims: {},
    points: {
      total,
      postReads: total,
      shares: 0,
      approvedComments: 0,
      dailyDiscoveries: 0,
      manualAdjustments: 0,
    },
  };
}

function createResponse(users: readonly AdminManagedUser[], nextPageToken: string | null): AdminUsersResponse {
  return {
    users,
    nextPageToken,
    fetchedAt: '2026-08-10T12:00:00.000Z',
  };
}
