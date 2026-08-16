import {TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

import {AuthService} from '../../services/auth.service';
import {BlogEngagementService} from '../../features/blog/services/blog-engagement.service';
import {SiteAnalyticsService} from '../analytics/site-analytics.service';
import {SiteFooterComponent} from './site-footer.component';

describe('SiteFooterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, SiteFooterComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {isAuthenticated: () => of(false)},
        },
        {
          provide: BlogEngagementService,
          useValue: {recordSiteShare: jasmine.createSpy('recordSiteShare').and.resolveTo({awarded: false, points: 0, total: 0})},
        },
        {
          provide: SiteAnalyticsService,
          useValue: {trackShare: jasmine.createSpy('trackShare')},
        },
      ],
    }).compileComponents();
  });

  it('renders the shared site navigation and ownership details', () => {
    const fixture = TestBed.createComponent(SiteFooterComponent);
    fixture.detectChanges();

    const footer = fixture.nativeElement as HTMLElement;
    const footerText = footer.textContent ?? '';

    expect(footer.querySelector('#site-footer')).not.toBeNull();
    expect(footer.querySelector('nav[aria-label="Footer navigation"]')).not.toBeNull();
    expect(footer.querySelector('a[href="/privacy"]')?.textContent?.trim()).toBe('Privacy Policy');
    expect(footer.querySelector('a[href="/contact"]')?.textContent?.trim()).toBe('Contact');
    expect(footerText).toContain(`© ${new Date().getFullYear()} Colin Michaels. All rights reserved.`);
    expect(footerText).toContain('Home');
    expect(footerText).toContain('Blog');
    expect(footer.querySelector('a[href="/authors"]')?.textContent?.trim()).toBe('Authors');
    expect(footer.querySelector('a[href="/write-for-us"]')?.textContent?.trim()).toBe('Write for Us');
    expect(footerText).toContain('Topics');
    expect(footerText).toContain('About');
    expect(footerText).toContain('Open OS');
    expect(footer.querySelector('[aria-label="Share ColinMichaels.com"]')).not.toBeNull();
  });
});
