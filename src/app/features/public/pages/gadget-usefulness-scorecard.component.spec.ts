import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {SiteAnalyticsService} from '../../../shared/analytics/site-analytics.service';
import {GadgetUsefulnessScorecardComponent} from './gadget-usefulness-scorecard.component';

describe('GadgetUsefulnessScorecardComponent', () => {
  let fixture: ComponentFixture<GadgetUsefulnessScorecardComponent>;
  let analytics: jasmine.SpyObj<SiteAnalyticsService>;

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<SiteAnalyticsService>('SiteAnalyticsService', ['trackResourceDownload']);

    await TestBed.configureTestingModule({
      imports: [GadgetUsefulnessScorecardComponent],
      providers: [
        provideRouter([]),
        {provide: SiteAnalyticsService, useValue: analytics},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GadgetUsefulnessScorecardComponent);
    fixture.detectChanges();
  });

  it('renders the recurring framework, five scores, evidence labels, and two downloads', () => {
    const element = fixture.nativeElement as HTMLElement;
    const downloads = Array.from(element.querySelectorAll<HTMLAnchorElement>('a[download]'));
    const youtubeLink = element.querySelector<HTMLAnchorElement>('a[href*="youtube.com"]');
    const scoreLink = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.textContent?.includes('See the five scores'));

    expect(element.querySelector('h1')?.textContent).toContain('Gadget Usefulness Scorecard');
    expect(element.textContent).toContain('Useful is more interesting than merely new');
    expect(element.textContent).toContain('How to score without pretending it is science');
    expect(element.textContent).toContain('Label the relationship to the gadget');
    expect(element.querySelectorAll('[aria-label="Five gadget usefulness criteria"] li')).toHaveSize(5);
    expect(element.querySelectorAll('[aria-label="Is It Actually Useful episode loop"] li')).toHaveSize(6);
    expect(downloads).toHaveSize(2);
    expect(downloads.every(link => link.getAttribute('href') === '/downloads/captain-colin-gadget-usefulness-scorecard.pdf')).toBeTrue();
    expect(downloads.every(link => link.getAttribute('download') === 'captain-colin-gadget-usefulness-scorecard.pdf')).toBeTrue();
    expect(scoreLink?.getAttribute('href')).toBe('/resources/gadget-usefulness-scorecard#five-scores');
    expect(youtubeLink?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('tracks a bounded scorecard selection from the resource page', () => {
    const element = fixture.nativeElement as HTMLElement;
    const download = element.querySelector<HTMLAnchorElement>('a[download]')!;
    download.addEventListener('click', (event: MouseEvent) => event.preventDefault());

    download.click();

    expect(analytics.trackResourceDownload).toHaveBeenCalledOnceWith(
      'captain-colin-gadget-usefulness-scorecard.pdf',
      'resource_page'
    );
  });
});
