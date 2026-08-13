import {TestBed} from '@angular/core/testing';

import {SiteSearchOverlayService} from './site-search-overlay.service';

describe('SiteSearchOverlayService', () => {
  it('shares the current search query with page-level search behavior', () => {
    TestBed.configureTestingModule({providers: [SiteSearchOverlayService]});
    const service = TestBed.inject(SiteSearchOverlayService);

    service.setQuery('Firebase architecture');
    expect(service.query()).toBe('Firebase architecture');

    service.setQuery('');
    expect(service.query()).toBe('');
  });
});
