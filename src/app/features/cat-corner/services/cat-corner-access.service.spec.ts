import {TestBed} from '@angular/core/testing';
import {firstValueFrom, of} from 'rxjs';

import {AuthService} from '../../../services/auth.service';
import {CAT_CORNER_ADDICT_ROLE} from '../../../shared/user-account/user-account.model';
import {CatCornerAccessService} from './cat-corner-access.service';

describe('CatCornerAccessService', () => {
  it('exposes authorization for the fixed Cat Corner role', async () => {
    const getRoleAuthorization = jasmine.createSpy('getRoleAuthorization').and.returnValue(of({
      uid: 'reader-1',
      email: 'reader@example.com',
      isAuthenticated: true,
      isAdmin: false,
      isAuthorized: true,
      claims: {roles: {[CAT_CORNER_ADDICT_ROLE]: true}},
      requiredRoles: [CAT_CORNER_ADDICT_ROLE],
    }));

    TestBed.configureTestingModule({
      providers: [
        CatCornerAccessService,
        {
          provide: AuthService,
          useValue: {
            getRoleAuthorization,
            refreshCurrentUserClaims: () => of(undefined),
          },
        },
      ],
    });

    const service = TestBed.inject(CatCornerAccessService);

    expect(await firstValueFrom(service.canAccess$)).toBeTrue();
    expect(getRoleAuthorization).toHaveBeenCalledOnceWith([CAT_CORNER_ADDICT_ROLE]);
  });

  it('fails clearly when the Firebase Functions provider is unavailable', async () => {
    TestBed.configureTestingModule({
      providers: [
        CatCornerAccessService,
        {
          provide: AuthService,
          useValue: {
            getRoleAuthorization: () => of({isAuthorized: false}),
            refreshCurrentUserClaims: () => of(undefined),
          },
        },
      ],
    });

    await expectAsync(firstValueFrom(TestBed.inject(CatCornerAccessService).claimAccess()))
      .toBeRejectedWithError('Firebase Functions is not initialized.');
  });
});
