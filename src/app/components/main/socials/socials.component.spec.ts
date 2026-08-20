import { ComponentFixture, TestBed } from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {RouterTestingModule} from '@angular/router/testing';

import { SocialsComponent } from './socials.component';
import {SiteAnalyticsService} from '../../../shared/analytics/site-analytics.service';
import {CREATOR_PROFILE_URLS} from '../../../shared/seo/site-identity';

describe('SocialsComponent', () => {
  let component: SocialsComponent;
  let fixture: ComponentFixture<SocialsComponent>;
  let analytics: jasmine.SpyObj<SiteAnalyticsService>;

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<SiteAnalyticsService>('SiteAnalyticsService', [
      'trackCreatorProfileOutbound',
    ]);
    await TestBed.configureTestingModule({
      imports: [SocialsComponent, RouterTestingModule],
      providers: [{provide: SiteAnalyticsService, useValue: analytics}],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SocialsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not duplicate the OS launch entry in the footer links', () => {
    expect(component.links.some(link => link.title === 'game')).toBeFalse();
  });

  it('keeps informational links out of the fixed social bar', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('a[href="/privacy"]')).toBeNull();
    expect(element.textContent).not.toContain('Contact');
  });

  it('only captures pointer events on the actual profile links', () => {
    const host = fixture.nativeElement as HTMLElement;
    const navigation = host.querySelector<HTMLElement>('nav');
    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('nav a'));

    expect(getComputedStyle(host).pointerEvents).toBe('none');
    expect(navigation?.classList).toContain('pointer-events-none');
    expect(links.every(link => link.classList.contains('pointer-events-auto'))).toBeTrue();
  });

  it('uses canonical, accessible creator-profile links and tracks the selected platform', () => {
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Follow Colin Michaels"] a'));
    const instagramLink = links.find(link => link.href === CREATOR_PROFILE_URLS.instagram);

    expect(links.length).toBe(5);
    expect(element.querySelector('button')).toBeNull();
    expect(links.every(link => link.target === '_blank')).toBeTrue();
    expect(links.every(link => link.rel.split(' ').includes('me'))).toBeTrue();
    expect(links.every(link => Boolean(link.getAttribute('aria-label')))).toBeTrue();
    expect(instagramLink?.getAttribute('aria-label')).toBe('Follow Colin Michaels on Instagram');

    const instagramDebugLink = fixture.debugElement.queryAll(By.css('a'))
      .find(link => link.nativeElement.href === CREATOR_PROFILE_URLS.instagram);
    instagramDebugLink?.triggerEventHandler('click');

    expect(analytics.trackCreatorProfileOutbound).toHaveBeenCalledOnceWith('instagram');
  });

  it('keeps all profile targets usable in a 390-pixel mobile footer', () => {
    const host = fixture.nativeElement as HTMLElement;
    host.style.position = 'relative';
    host.style.display = 'block';
    host.style.width = '390px';
    fixture.detectChanges();

    const navigation = host.querySelector<HTMLElement>('nav');
    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('nav a'));

    expect(navigation?.classList).toContain('flex-wrap');
    expect(links.every(link => link.classList.contains('h-11'))).toBeTrue();
    expect(links.every(link => link.classList.contains('w-11'))).toBeTrue();
    expect(navigation?.scrollWidth).toBeLessThanOrEqual(navigation?.clientWidth ?? 0);
  });
});
