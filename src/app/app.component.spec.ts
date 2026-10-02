import {signal} from '@angular/core';
import {SeasonalService} from './features/seasonal/seasonal.service';
import {SiteAnalyticsService} from './shared/analytics/site-analytics.service';
import { TestBed } from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {
  AppComponent,
  getSiteSearchQuery,
  isBlogArticleRoute,
  shouldShowBlogMembershipCampaign,
  shouldShowOsNotifications,
  shouldShowReaderTools,
  shouldShowSiteHeader,
  shouldUseCoreOsTheme,
} from './app.component';
import {PwaPushService} from './shared/pwa/pwa-push.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        {provide: PwaPushService, useValue: {start: jasmine.createSpy('start')}},
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(fixture.nativeElement.classList).toContain('site-theme-scope');
    expect(fixture.nativeElement.classList).not.toContain('core-os-scope');
    expect(fixture.nativeElement.querySelector('app-site-footer')).not.toBeNull();
  });

  it('does not record extra page views when the season changes on the same route', () => {
    const seasonalRevision = signal(0);
    const seasonal = TestBed.inject(SeasonalService);
    spyOn(seasonal, 'setContext').and.callFake(() => { seasonalRevision(); });
    const track = spyOn(TestBed.inject(SiteAnalyticsService), 'trackPageView');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(track).toHaveBeenCalledTimes(1);
    seasonalRevision.set(1);
    fixture.detectChanges();
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('uses the dedicated shell for admin routes without enabling OS notifications', () => {
    expect(shouldShowSiteHeader('/admin')).toBeFalse();
    expect(shouldShowSiteHeader('/admin/cms/calendar?month=2026-07')).toBeFalse();
    expect(shouldShowOsNotifications('/admin/cms')).toBeFalse();
    expect(shouldShowSiteHeader('/blog')).toBeTrue();
  });

  it('assigns Core OS styling only to OS-owned routes', () => {
    expect(shouldUseCoreOsTheme('/os')).toBeTrue();
    expect(shouldUseCoreOsTheme('/os/terminal?source=site')).toBeTrue();
    expect(shouldUseCoreOsTheme('/login?redirectUrl=%2Fos')).toBeTrue();
    expect(shouldUseCoreOsTheme('/boot')).toBeTrue();
    expect(shouldUseCoreOsTheme('/sleep')).toBeTrue();
    expect(shouldUseCoreOsTheme('/external/https%3A%2F%2Fexample.com')).toBeTrue();
    expect(shouldUseCoreOsTheme('/admin')).toBeFalse();
    expect(shouldUseCoreOsTheme('/blog')).toBeFalse();
  });

  it('shows reading assistance throughout Cat Corner but not on unrelated routes', () => {
    expect(shouldShowReaderTools('/cat-corner')).toBeTrue();
    expect(shouldShowReaderTools('/cat-corner/unlock?returnUrl=%2Fblog%2Fgretchen')).toBeTrue();
    expect(shouldShowReaderTools('/admin')).toBeFalse();
  });

  it('shows the membership campaign on public blog routes only', () => {
    expect(shouldShowBlogMembershipCampaign('/blog')).toBeTrue();
    expect(shouldShowBlogMembershipCampaign('/blog', true)).toBeFalse();
    expect(shouldShowBlogMembershipCampaign('/blog/member-benefits?source=social')).toBeTrue();
    expect(shouldShowBlogMembershipCampaign('/blog/preview/private-token')).toBeFalse();
    expect(shouldShowBlogMembershipCampaign('/topics')).toBeFalse();
  });

  it('recognizes article routes and restores decoded search queries from URLs', () => {
    expect(isBlogArticleRoute('/blog/search-highlights?q=Firebase%20architecture')).toBeTrue();
    expect(isBlogArticleRoute('/blog/search?q=Firebase')).toBeFalse();
    expect(isBlogArticleRoute('/blog/category/technology')).toBeFalse();
    expect(getSiteSearchQuery('/blog/search-highlights?q=Firebase%20architecture#details'))
      .toBe('Firebase architecture');
    expect(getSiteSearchQuery('/blog/search-highlights')).toBe('');
  });

});
