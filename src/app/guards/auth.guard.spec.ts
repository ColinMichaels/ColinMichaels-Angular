import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {User} from 'firebase/auth';
import {firstValueFrom, Observable, of} from 'rxjs';

import {PATH_NAMES} from '../app-route-paths';
import {AuthService} from '../services/auth.service';
import {AuthGuard} from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let router: Router;
  let authServiceMock: {
    user$: Observable<User | null>;
  };
  const route = {} as ActivatedRouteSnapshot;

  async function canActivate(url: string): Promise<boolean | UrlTree> {
    return firstValueFrom(guard.canActivate(route, {url} as RouterStateSnapshot));
  }

  beforeEach(() => {
    authServiceMock = {
      user$: of(null),
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AuthGuard,
        {provide: AuthService, useValue: authServiceMock},
      ],
    });

    guard = TestBed.inject(AuthGuard);
    router = TestBed.inject(Router);
  });

  it('redirects signed-out users to login with the requested OS URL', async () => {
    const result = await canActivate(`/${PATH_NAMES.OS_MAIN}`);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?redirectUrl=%2Fos');
  });

  it('allows signed-in users through to the OS route', async () => {
    authServiceMock.user$ = of({
      uid: 'reader-uid',
      email: 'reader@example.com',
      displayName: 'Reader Example',
      emailVerified: true,
      isAnonymous: false,
      providerData: [],
    } as unknown as User);

    const result = await canActivate(`/${PATH_NAMES.OS_MAIN}`);

    expect(result).toBeTrue();
  });
});
