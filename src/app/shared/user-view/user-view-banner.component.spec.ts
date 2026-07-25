import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {of} from 'rxjs';

import {AuthService, UserViewSession} from '../../services/auth.service';
import {UserViewBannerComponent} from './user-view-banner.component';

describe('UserViewBannerComponent', () => {
  let fixture: ComponentFixture<UserViewBannerComponent>;
  let stopViewingAsUser: jasmine.Spy;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const session: UserViewSession = {
      uid: 'reader-uid',
      email: 'reader@example.com',
      displayName: 'Reader Example',
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      providerIds: ['password'],
      roles: ['viewer'],
      claims: {roles: {viewer: true}},
      actorUid: 'admin-uid',
      actorEmail: 'admin@example.com',
      disabled: false,
    };
    stopViewingAsUser = jasmine.createSpy('stopViewingAsUser');
    const authService = {
      userView$: of(session),
      stopViewingAsUser,
    };
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [UserViewBannerComponent],
      providers: [
        {provide: AuthService, useValue: authService},
        {provide: Router, useValue: router},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserViewBannerComponent);
    fixture.detectChanges();
  });

  it('keeps the viewed identity, safety boundary, and exit action visible', async () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Reader Example');
    expect(element.textContent).toContain('viewer');
    expect(element.textContent).toContain('Firebase requests still use your admin account');

    element.querySelector<HTMLButtonElement>('button')?.click();
    await fixture.whenStable();

    expect(stopViewingAsUser).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/', 'admin', 'users']);
  });
});
