import {signal} from '@angular/core';
import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {User} from 'firebase/auth';
import {BehaviorSubject, of} from 'rxjs';

import {AuthService, AuthState, INITIAL_AUTH_STATE} from '../../../../services/auth.service';
import {PwaPushService} from '../../../../shared/pwa/pwa-push.service';
import {UserAccountService} from '../../../../shared/user-account/user-account.service';
import {BlogMembershipCampaignStateService} from '../../services/blog-membership-campaign-state.service';
import {BlogMembershipCampaignComponent} from './blog-membership-campaign.component';

describe('BlogMembershipCampaignComponent auth readiness', () => {
  let fixture: ComponentFixture<BlogMembershipCampaignComponent>;
  let authState: BehaviorSubject<AuthState>;
  let users: BehaviorSubject<User | null>;
  let campaignState: jasmine.SpyObj<BlogMembershipCampaignStateService>;

  const signedInUser = {uid: 'reader-uid'} as User;

  beforeEach(async () => {
    authState = new BehaviorSubject<AuthState>(INITIAL_AUTH_STATE);
    users = new BehaviorSubject<User | null>(null);
    campaignState = jasmine.createSpyObj<BlogMembershipCampaignStateService>(
      'BlogMembershipCampaignStateService',
      [
        'getPendingPreferences',
        'shouldPromptAnonymousReader',
        'clearPendingPreferences',
        'markCompleted',
        'snooze',
        'rememberPendingPreferences',
      ]
    );
    campaignState.getPendingPreferences.and.returnValue(null);
    campaignState.shouldPromptAnonymousReader.and.returnValue(true);

    const userAccounts = jasmine.createSpyObj<UserAccountService>(
      'UserAccountService',
      ['listenToUserAccount', 'updateCommunicationPreferences']
    );
    userAccounts.listenToUserAccount.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [BlogMembershipCampaignComponent, RouterTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            authState$: authState.asObservable(),
            user$: users.asObservable(),
          },
        },
        {provide: BlogMembershipCampaignStateService, useValue: campaignState},
        {provide: UserAccountService, useValue: userAccounts},
        {
          provide: PwaPushService,
          useValue: {
            available: signal(false),
            busy: signal(false),
            statusMessage: signal<string | null>(null),
            enableNotifications: jasmine.createSpy('enableNotifications').and.resolveTo(false),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => fixture?.destroy());

  it('does not treat an initializing auth session as an anonymous reader', fakeAsync(() => {
    fixture = TestBed.createComponent(BlogMembershipCampaignComponent);
    fixture.detectChanges();

    tick(6400);
    fixture.detectChanges();

    expect(campaignState.shouldPromptAnonymousReader).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="blog-membership-campaign"]')).toBeNull();
  }));

  it('opens only after Firebase resolves the reader as unauthenticated', fakeAsync(() => {
    fixture = TestBed.createComponent(BlogMembershipCampaignComponent);
    fixture.detectChanges();

    authState.next({status: 'unauthenticated', user: null});
    fixture.detectChanges();
    tick(3199);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="blog-membership-campaign"]')).toBeNull();

    tick(1);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="blog-membership-campaign"]')).not.toBeNull();
  }));

  it('cancels an anonymous offer when a delayed signed-in session resolves', fakeAsync(() => {
    fixture = TestBed.createComponent(BlogMembershipCampaignComponent);
    fixture.detectChanges();

    authState.next({status: 'unauthenticated', user: null});
    fixture.detectChanges();
    tick(2000);

    users.next(signedInUser);
    authState.next({status: 'authenticated', user: signedInUser});
    fixture.detectChanges();
    tick(2000);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="blog-membership-campaign"]')).toBeNull();
  }));

  it('closes an open anonymous offer if Firebase later restores a signed-in reader', fakeAsync(() => {
    fixture = TestBed.createComponent(BlogMembershipCampaignComponent);
    fixture.detectChanges();

    authState.next({status: 'unauthenticated', user: null});
    fixture.detectChanges();
    tick(3200);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="blog-membership-campaign"]')).not.toBeNull();

    users.next(signedInUser);
    authState.next({status: 'authenticated', user: signedInUser});
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="blog-membership-campaign"]')).toBeNull();
  }));
});
