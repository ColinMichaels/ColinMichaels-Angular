import {DeferBlockState, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

import {AuthService} from '../../services/auth.service';
import {BlogEngagementService} from '../../features/blog/services/blog-engagement.service';
import {SiteAnalyticsService} from '../analytics/site-analytics.service';
import {CelebrationService} from '../celebration/celebration.service';
import {SiteFooterComponent} from './site-footer.component';

describe('SiteFooterComponent', () => {
  let recordSiteShare: jasmine.Spy;
  let celebrateConfirmedPointAward: jasmine.Spy;

  beforeEach(async () => {
    recordSiteShare = jasmine.createSpy('recordSiteShare').and.resolveTo({awarded: false, points: 0, total: 0});
    celebrateConfirmedPointAward = jasmine.createSpy('celebrateConfirmedPointAward');

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, SiteFooterComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {isAuthenticated: () => of(false)},
        },
        {
          provide: BlogEngagementService,
          useValue: {recordSiteShare},
        },
        {
          provide: CelebrationService,
          useValue: {celebrateConfirmedPointAward},
        },
        {
          provide: SiteAnalyticsService,
          useValue: {trackShare: jasmine.createSpy('trackShare')},
        },
      ],
    }).compileComponents();
  });

  it('renders the shared site navigation and defers non-critical sharing controls', async () => {
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
    expect(footer.querySelector('[aria-label="Share ColinMichaels.com"]')).toBeNull();

    const deferBlocks = await fixture.getDeferBlocks();
    await Promise.all(deferBlocks.map(deferBlock => deferBlock.render(DeferBlockState.Complete)));

    expect(footer.querySelector('[aria-label="Share ColinMichaels.com"]')).not.toBeNull();
  });

  it('celebrates only the server-confirmed site-share award', async () => {
    recordSiteShare.and.resolveTo({awarded: true, points: 5, total: 5});
    const fixture = TestBed.createComponent(SiteFooterComponent);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as {recordSiteShare(event: unknown): void}).recordSiteShare({
      provider: 'copy',
      shareId: null,
      shareUrl: 'https://colinmichaels.com',
    });
    await Promise.resolve();

    expect(recordSiteShare).toHaveBeenCalledWith({provider: 'copy'});
    expect(celebrateConfirmedPointAward).toHaveBeenCalledOnceWith({awarded: true, points: 5, total: 5});
  });
});
