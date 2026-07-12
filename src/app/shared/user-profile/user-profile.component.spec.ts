import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {User, UserCredential} from 'firebase/auth';
import {Observable, of} from 'rxjs';

import {AuthService} from '../../services/auth.service';
import {BlogArticleLibraryService} from '../../features/blog/services/blog-article-library.service';
import {OfflineBlogPostService} from '../../features/blog/services/offline-blog-post.service';
import {PwaInstallService} from '../pwa/pwa-install.service';
import {PwaNativeControlsService} from '../pwa/pwa-native-controls.service';
import {PwaPushService} from '../pwa/pwa-push.service';
import {PwaStorageService} from '../pwa/pwa-storage.service';
import {
  BASE_USER_ROLE,
  CAT_CORNER_ADDICT_ROLE,
  UserAccountDocument,
  UserAccountProfile,
} from '../user-account/user-account.model';
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
        {
          provide: BlogArticleLibraryService,
          useValue: {
            records: signal([]),
            completed: signal([]),
            inProgress: signal([]),
            setFavorite: jasmine.createSpy('setFavorite'),
            setReadLater: jasmine.createSpy('setReadLater'),
          },
        },
        {
          provide: OfflineBlogPostService,
          useValue: {
            records: signal([]),
            remove: jasmine.createSpy('remove'),
            clearAll: jasmine.createSpy('clearAll'),
          },
        },
        {
          provide: PwaInstallService,
          useValue: {isStandalone: signal(false)},
        },
        {
          provide: PwaNativeControlsService,
          useValue: {
            shareSupported: signal(true),
            fullscreenSupported: signal(true),
            wakeLockSupported: signal(false),
            fullscreen: signal(false),
            keepAwakeRequested: signal(false),
            error: signal(null),
            available: signal(true),
            shareCurrentPage: jasmine.createSpy('shareCurrentPage'),
            toggleFullscreen: jasmine.createSpy('toggleFullscreen'),
            toggleWakeLock: jasmine.createSpy('toggleWakeLock'),
          },
        },
        {
          provide: PwaPushService,
          useValue: {
            available: signal(false),
            signedIn: signal(true),
            subscribed: signal(false),
            permission: signal('default'),
            busy: signal(false),
            statusMessage: signal(null),
            toggleSubscription: jasmine.createSpy('toggleSubscription'),
          },
        },
        {
          provide: PwaStorageService,
          useValue: {
            available: signal(false),
            persistenceSupported: signal(false),
            persisted: signal(false),
            busy: signal(false),
            usage: signal(null),
            quota: signal(null),
            statusMessage: signal(null),
            requestPersistence: jasmine.createSpy('requestPersistence'),
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

  it('owns personal reading lists and supported app settings on the profile page', () => {
    const textContent = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(textContent).toContain('Reading library');
    expect(textContent).toContain('Your reading');
    expect(textContent).toContain('Saved offline');
    expect(textContent).toContain('App & device');
    expect(textContent).toContain('App controls');
    expect(textContent).toContain('Share page');
    expect(textContent).toContain('Full screen');
  });

  it('renders the Cat Corner Addict role as a profile badge', () => {
    authServiceMock.getCurrentUserProfile.and.returnValue(of({
      ...profile,
      roles: [CAT_CORNER_ADDICT_ROLE],
      claims: {roles: {[CAT_CORNER_ADDICT_ROLE]: true}},
    }));
    fixture.destroy();
    fixture = TestBed.createComponent(UserProfileComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Cat Corner Addict');
    expect(element.querySelector('[aria-label="Cat Corner Addict badge"]')).not.toBeNull();
  });
});
