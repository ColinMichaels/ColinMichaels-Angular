import {DOCUMENT} from '@angular/common';
import {PLATFORM_ID} from '@angular/core';
import {TestBed} from '@angular/core/testing';

import {
  SITE_ANALYTICS_MEASUREMENT_ID,
  SiteAnalyticsService,
  normalizeAnalyticsPagePath,
  sanitizeAnalyticsSearchTerm,
  shouldCollectSiteAnalytics,
} from './site-analytics.service';

describe('SiteAnalyticsService', () => {
  let service: SiteAnalyticsService;
  let gtag: jasmine.Spy;

  beforeEach(() => {
    gtag = jasmine.createSpy('gtag');
    const analyticsWindow = {
      location: {
        hostname: 'colinmichaels.com',
        pathname: '/blog/test-post',
        origin: 'https://colinmichaels.com',
      },
      gtag,
    };

    TestBed.configureTestingModule({
      providers: [
        {provide: DOCUMENT, useValue: {defaultView: analyticsWindow, title: 'Test article'}},
        {provide: PLATFORM_ID, useValue: 'browser'},
      ],
    });
    service = TestBed.inject(SiteAnalyticsService);
  });

  it('records each article milestone once and emits a separate completion event at 95 percent', () => {
    const content = {id: 'post-1', slug: 'test-post', categories: ['Technology']};

    service.trackArticleProgress(content, 52, false);
    service.trackArticleProgress(content, 100, false);
    service.trackArticleProgress(content, 100, false);

    expect(gtag.calls.allArgs().map(args => args[1])).toEqual([
      'article_progress',
      'article_progress',
      'article_progress',
      'article_progress',
      'article_complete',
    ]);
    expect(gtag).toHaveBeenCalledWith('event', 'article_complete', jasmine.objectContaining({
      content_id: 'post-1',
      content_slug: 'test-post',
      content_group: 'Technology',
      progress_percent: 95,
      auth_state: 'anonymous',
      send_to: SITE_ANALYTICS_MEASUREMENT_ID,
    }));
  });

  it('tracks only one Daily Discovery completion per date', () => {
    service.trackDailyDiscoveryComplete('2026-08-13', 10, true);
    service.trackDailyDiscoveryComplete('2026-08-13', 10, true);

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'daily_discovery_complete', jasmine.objectContaining({
      total_questions: 10,
      auth_state: 'signed_in',
    }));
  });

  it('records one query-free page view for each route path', () => {
    service.trackPageView('/blog/test-post?q=person@example.com#comments');
    service.trackPageView('/blog/test-post?utm_source=newsletter');

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'page_view', jasmine.objectContaining({
      page_location: 'https://colinmichaels.com/blog/test-post',
      page_path: '/blog/test-post',
      page_title: 'Test article',
      send_to: SITE_ANALYTICS_MEASUREMENT_ID,
    }));
  });

  it('tracks reactions and successful poll votes without sending labels or user ids', () => {
    const content = {id: 'post-1', slug: 'test-post', categories: ['Technology']};

    service.trackContentReaction(content, 'useful', false, false);
    service.trackPollVote(content, 'poll-1', 'option-a', true, false);

    expect(gtag).toHaveBeenCalledWith('event', 'content_reaction', jasmine.objectContaining({
      content_slug: 'test-post',
      reaction_type: 'useful',
      reaction_updated: false,
      auth_state: 'anonymous',
    }));
    expect(gtag).toHaveBeenCalledWith('event', 'poll_vote', jasmine.objectContaining({
      poll_id: 'poll-1',
      option_id: 'option-a',
      vote_updated: true,
      results_visible: false,
      auth_state: 'signed_in',
    }));
  });

  it('redacts likely personal search terms before they reach Google Analytics', () => {
    service.trackSearch('person@example.com', 0, 'search_page');

    expect(gtag).toHaveBeenCalledWith('event', 'search', jasmine.objectContaining({
      search_term: '[redacted]',
      result_count: 0,
      source_component: 'search_page',
    }));
    expect(sanitizeAnalyticsSearchTerm('  angular   firebase  ')).toBe('angular firebase');
    expect(sanitizeAnalyticsSearchTerm('Call 215-555-0100')).toBe('[redacted]');
  });
});

describe('shouldCollectSiteAnalytics', () => {
  it('excludes local development and protected Admin routes', () => {
    expect(shouldCollectSiteAnalytics({hostname: 'localhost', pathname: '/blog'})).toBeFalse();
    expect(shouldCollectSiteAnalytics({hostname: 'colinmichaels.com', pathname: '/admin/users'})).toBeFalse();
    expect(shouldCollectSiteAnalytics({hostname: 'colinmichaels.com', pathname: '/blog'})).toBeTrue();
  });
});

describe('normalizeAnalyticsPagePath', () => {
  it('removes fragments and query parameters that could contain personal text', () => {
    expect(normalizeAnalyticsPagePath('/blog/story?q=reader@example.com#comments')).toBe('/blog/story');
    expect(normalizeAnalyticsPagePath('topics/angular')).toBe('/topics/angular');
    expect(normalizeAnalyticsPagePath('')).toBe('/');
  });
});
