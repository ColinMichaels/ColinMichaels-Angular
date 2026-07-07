import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {User, UserCredential} from 'firebase/auth';
import {Observable, of} from 'rxjs';

import {AuthService} from '../../services/auth.service';
import {BASE_USER_ROLE, UserAccountDocument, UserAccountProfile} from '../user-account/user-account.model';
import {UserAccountService} from '../user-account/user-account.service';
import {UserProfileComponent} from './user-profile.component';

describe('UserProfileComponent', () => {
  const uid = 'reader-uid-123';
  const profile: UserAccountProfile = {
    uid,
    email: 'reader@example.com',
    displayName: 'Reader Example',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    providerIds: ['password'],
    roles: [],
    claims: {},
  };
  const accountDocument: UserAccountDocument = {
    uid,
    email: profile.email,
    displayName: profile.displayName,
    photoURL: null,
    providerIds: profile.providerIds,
    emailVerified: true,
    roles: [BASE_USER_ROLE],
    commentTrustStatus: 'new',
    points: {
      total: 0,
      postReads: 0,
      shares: 0,
      approvedComments: 0,
    },
    createdAt: '2026-07-07T12:00:00.000Z',
    updatedAt: '2026-07-07T12:00:00.000Z',
    lastSeenAt: '2026-07-07T12:00:00.000Z',
  };
  const authUser = {
    uid,
    email: profile.email,
    displayName: profile.displayName,
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
  } as unknown as User;

  let fixture: ComponentFixture<UserProfileComponent>;
  let authServiceMock: {
    user$: Observable<User | null>;
    getCurrentUserProfile: jasmine.Spy;
    linkFacebookProvider: jasmine.Spy;
  };

  beforeEach(async () => {
    authServiceMock = {
      user$: of(authUser),
      getCurrentUserProfile: jasmine.createSpy('getCurrentUserProfile').and.returnValue(of(profile)),
      linkFacebookProvider: jasmine.createSpy('linkFacebookProvider').and.returnValue(of({
        user: {
          ...authUser,
          providerData: [
            {providerId: 'password'},
            {providerId: 'facebook.com'},
          ],
        },
      } as UserCredential)),
    };

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        UserProfileComponent,
      ],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: UserAccountService,
          useValue: {
            listenToUserAccount: jasmine.createSpy('listenToUserAccount').and.returnValue(of(accountDocument)),
            listenToPointEvents: jasmine.createSpy('listenToPointEvents').and.returnValue(of([])),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserProfileComponent);
    fixture.detectChanges();
  });

  it('shows ordinary users only their assigned roles without exposing UID or unassigned role details', () => {
    const textContent = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(textContent).toContain('Reader Example');
    expect(textContent).toContain('User');
    expect(textContent).toContain('Can sign in, manage their profile, comment with moderation, and earn reader points.');
    expect(textContent).not.toContain(uid);
    expect(textContent).not.toContain('Admin');
    expect(textContent).not.toContain('Not assigned');
    expect(textContent).not.toContain('Full admin access');
  });

  it('lets users connect Facebook from their profile', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const connectButton = [...element.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Connect Facebook')) as HTMLButtonElement | undefined;

    connectButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const textContent = element.textContent ?? '';

    expect(authServiceMock.linkFacebookProvider).toHaveBeenCalled();
    expect(textContent).toContain('Facebook is now connected to this profile.');
    expect(textContent).toContain('Facebook connected');
  });
});
