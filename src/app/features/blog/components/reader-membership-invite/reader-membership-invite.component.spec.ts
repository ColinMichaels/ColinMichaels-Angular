import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {BehaviorSubject} from 'rxjs';

import {AuthService, AuthState, INITIAL_AUTH_STATE} from '../../../../services/auth.service';
import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {BlogMembershipCampaignStateService} from '../../services/blog-membership-campaign-state.service';
import {ReaderMembershipInviteComponent} from './reader-membership-invite.component';

describe('ReaderMembershipInviteComponent', () => {
  let fixture: ComponentFixture<ReaderMembershipInviteComponent>;
  let authState: BehaviorSubject<AuthState>;
  let campaignState: jasmine.SpyObj<BlogMembershipCampaignStateService>;
  let analytics: jasmine.SpyObj<SiteAnalyticsService>;

  beforeEach(async () => {
    authState = new BehaviorSubject<AuthState>(INITIAL_AUTH_STATE);
    campaignState = jasmine.createSpyObj<BlogMembershipCampaignStateService>(
      'BlogMembershipCampaignStateService',
      ['shouldPromptAnonymousReader', 'snooze']
    );
    campaignState.shouldPromptAnonymousReader.and.returnValue(true);
    analytics = jasmine.createSpyObj<SiteAnalyticsService>('SiteAnalyticsService', [
      'trackReaderMembershipInvite',
    ]);

    await TestBed.configureTestingModule({
      imports: [ReaderMembershipInviteComponent, RouterTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {authState$: authState.asObservable()},
        },
        {provide: BlogMembershipCampaignStateService, useValue: campaignState},
        {provide: SiteAnalyticsService, useValue: analytics},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReaderMembershipInviteComponent);
    fixture.componentRef.setInput('postSlug', 'a-useful-story');
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('waits for a confirmed anonymous session before showing the inline offer', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="reader-membership-invite"]')).toBeNull();

    authState.next({status: 'unauthenticated', user: null});
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="reader-membership-invite"]')).not.toBeNull();
    expect(analytics.trackReaderMembershipInvite).toHaveBeenCalledOnceWith('a-useful-story', 'view');

    fixture.detectChanges();
    expect(analytics.trackReaderMembershipInvite).toHaveBeenCalledTimes(1);
  });

  it('keeps every account action visible with the article redirect', () => {
    authState.next({status: 'unauthenticated', user: null});
    fixture.detectChanges();

    const links = [...fixture.nativeElement.querySelectorAll('a')] as HTMLAnchorElement[];
    const notNow = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(links.map(link => link.textContent?.trim())).toEqual([
      'Create free account',
      'I already have an account',
    ]);
    expect(links[0].getAttribute('href')).toContain('mode=register');
    expect(links[0].getAttribute('href')).toContain('redirectUrl=%2Fblog%2Fa-useful-story');
    expect(links[0].getAttribute('href')).toContain('source=blog-membership');
    expect(notNow.textContent?.trim()).toBe('Not now');

    links[0].click();
    expect(analytics.trackReaderMembershipInvite).toHaveBeenCalledWith('a-useful-story', 'register');
  });

  it('snoozes and removes the inline offer without blocking reading', () => {
    authState.next({status: 'unauthenticated', user: null});
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(campaignState.snooze).toHaveBeenCalledWith(30);
    expect(analytics.trackReaderMembershipInvite).toHaveBeenCalledWith('a-useful-story', 'dismiss');
    expect(fixture.nativeElement.querySelector('[data-testid="reader-membership-invite"]')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
