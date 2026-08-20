import {signal} from '@angular/core';
import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {User} from 'firebase/auth';
import {BehaviorSubject} from 'rxjs';

import {AuthService, AuthState, INITIAL_AUTH_STATE} from '../../../../services/auth.service';
import {PwaPushService} from '../../../../shared/pwa/pwa-push.service';
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

    expect(fixture.nativeElement.querySelector('[data-testid="blog-membership-campaign"]')).toBeNull();
  }));

  it('does not interrupt an anonymous reader on a wall-clock timer', fakeAsync(() => {
    fixture = TestBed.createComponent(BlogMembershipCampaignComponent);
    fixture.detectChanges();

    authState.next({status: 'unauthenticated', user: null});
    fixture.detectChanges();
    tick(10000);
    fixture.detectChanges();

    expect(campaignState.shouldPromptAnonymousReader).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="blog-membership-campaign"]')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  }));

  it('keeps the modal focus trap for a signed-in preference follow-up', fakeAsync(() => {
    const previousControl = document.createElement('button');
    previousControl.type = 'button';
    document.body.append(previousControl);
    previousControl.focus();
    campaignState.getPendingPreferences.and.returnValue({
      browserNotifications: false,
      newPostEmails: true,
      newsletter: false,
      createdAt: '2026-08-15T00:00:00.000Z',
    });

    fixture = TestBed.createComponent(BlogMembershipCampaignComponent);
    fixture.detectChanges();
    users.next(signedInUser);
    authState.next({status: 'authenticated', user: signedInUser});
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick();

    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector<HTMLElement>('[data-testid="blog-membership-campaign"]');
    const closeButton = element.querySelector<HTMLButtonElement>('button[aria-label="Close account benefits"]');

    expect(dialog?.hasAttribute('cdktrapfocus')).toBeTrue();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(closeButton);
    expect(element.textContent).toContain('Browser alerts remain off on this device.');

    closeButton?.click();
    fixture.detectChanges();
    tick();

    expect(campaignState.markCompleted).toHaveBeenCalled();
    expect(document.activeElement).toBe(previousControl);
    previousControl.remove();
  }));

  it('does not open an offer when a delayed signed-in session resolves', fakeAsync(() => {
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

});
