import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {SiteAnalyticsService} from '../../../shared/analytics/site-analytics.service';
import {PersonalAircraftBuyerVerificationComponent} from './personal-aircraft-buyer-verification.component';

describe('PersonalAircraftBuyerVerificationComponent', () => {
  let fixture: ComponentFixture<PersonalAircraftBuyerVerificationComponent>;
  let analytics: jasmine.SpyObj<SiteAnalyticsService>;

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<SiteAnalyticsService>('SiteAnalyticsService', ['trackResourceDownload']);

    await TestBed.configureTestingModule({
      imports: [PersonalAircraftBuyerVerificationComponent],
      providers: [
        provideRouter([]),
        {provide: SiteAnalyticsService, useValue: analytics},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonalAircraftBuyerVerificationComponent);
    fixture.detectChanges();
  });

  it('renders the evidence boundary, decision questions, official sources, and two download actions', () => {
    const element = fixture.nativeElement as HTMLElement;
    const downloads = Array.from(element.querySelectorAll<HTMLAnchorElement>('a[download]'));
    const externalSources = Array.from(element.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]'));

    expect(element.querySelector('h1')?.textContent).toContain('Personal Aircraft Buyer Verification');
    expect(element.textContent).toContain('A filmed flight proves less than a purchase requires');
    expect(element.textContent).toContain('Part 103 is a narrow category, not a marketing label');
    expect(element.textContent).toContain('Make the deposit terms survive the sales call');
    expect(element.textContent).toContain('not financial, legal, aviation, safety, or purchase advice');
    expect(element.querySelectorAll('[aria-label="Buyer verification sequence"] li')).toHaveSize(6);
    expect(downloads).toHaveSize(2);
    expect(downloads.every(link => link.getAttribute('href') === '/downloads/captain-colin-personal-aircraft-buyer-verification.pdf')).toBeTrue();
    expect(downloads.every(link => link.getAttribute('download') === 'captain-colin-personal-aircraft-buyer-verification.pdf')).toBeTrue();
    expect(externalSources).toHaveSize(5);
    expect(externalSources.every(link => link.getAttribute('rel') === 'noopener noreferrer')).toBeTrue();
  });

  it('tracks a bounded worksheet selection from the resource page', () => {
    const element = fixture.nativeElement as HTMLElement;
    const download = element.querySelector<HTMLAnchorElement>('a[download]')!;
    download.addEventListener('click', event => event.preventDefault());

    download.click();

    expect(analytics.trackResourceDownload).toHaveBeenCalledOnceWith(
      'captain-colin-personal-aircraft-buyer-verification.pdf',
      'resource_page'
    );
  });
});
