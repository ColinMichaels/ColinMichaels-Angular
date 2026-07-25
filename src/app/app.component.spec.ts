import { TestBed } from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {
  AppComponent,
  shouldShowBlogMembershipCampaign,
  shouldShowOsNotifications,
  shouldShowReaderTools,
  shouldShowSiteHeader,
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
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('uses the dedicated shell for admin routes without enabling OS notifications', () => {
    expect(shouldShowSiteHeader('/admin')).toBeFalse();
    expect(shouldShowSiteHeader('/admin/cms/calendar?month=2026-07')).toBeFalse();
    expect(shouldShowOsNotifications('/admin/cms')).toBeFalse();
    expect(shouldShowSiteHeader('/blog')).toBeTrue();
  });

  it('shows reading assistance throughout Cat Corner but not on unrelated routes', () => {
    expect(shouldShowReaderTools('/cat-corner')).toBeTrue();
    expect(shouldShowReaderTools('/cat-corner/unlock?returnUrl=%2Fblog%2Fgretchen')).toBeTrue();
    expect(shouldShowReaderTools('/admin')).toBeFalse();
  });

  it('shows the membership campaign on public blog routes only', () => {
    expect(shouldShowBlogMembershipCampaign('/blog')).toBeTrue();
    expect(shouldShowBlogMembershipCampaign('/blog/member-benefits?source=social')).toBeTrue();
    expect(shouldShowBlogMembershipCampaign('/blog/preview/private-token')).toBeFalse();
    expect(shouldShowBlogMembershipCampaign('/topics')).toBeFalse();
  });

});
