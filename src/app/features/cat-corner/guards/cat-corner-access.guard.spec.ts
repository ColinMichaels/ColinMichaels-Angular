import {TestBed} from '@angular/core/testing';
import {firstValueFrom, of} from 'rxjs';

import {CatCornerAccessGuard} from './cat-corner-access.guard';
import {CatCornerAccessService} from '../services/cat-corner-access.service';

describe('CatCornerAccessGuard', () => {
  it('allows members and full admins while declining the hidden route for other visitors', async () => {
    const authorization = {
      uid: 'reader-1',
      email: 'reader@example.com',
      isAuthenticated: true,
      isAdmin: false,
      isAuthorized: true,
      claims: {roles: {catCornerAddict: true}},
      requiredRoles: ['catCornerAddict'],
    };

    TestBed.configureTestingModule({
      providers: [
        CatCornerAccessGuard,
        {
          provide: CatCornerAccessService,
          useValue: {authorization$: of(authorization)},
        },
      ],
    });

    const guard = TestBed.inject(CatCornerAccessGuard);
    expect(await firstValueFrom(guard.canMatch())).toBeTrue();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CatCornerAccessGuard,
        {
          provide: CatCornerAccessService,
          useValue: {authorization$: of({...authorization, isAuthorized: false})},
        },
      ],
    });

    expect(await firstValueFrom(TestBed.inject(CatCornerAccessGuard).canMatch())).toBeFalse();
  });
});
