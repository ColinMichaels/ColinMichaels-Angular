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

  it('tracks site-to-YouTube choices as content selections without sending video copy', () => {
    service.trackYouTubeOutbound(' video-123 ', 'video_watch');
    service.trackYouTubeOutbound('channel-456', 'subscribe', 'topic_drones_youtube');
    service.trackYouTubeOutbound('video-789', 'video_title', 'article_drones_youtube');
    service.trackYouTubeOutbound('video-companion', 'video_watch', 'article_companion_youtube');
    service.trackYouTubeOutbound('video-sidebar', 'video_watch', 'blog_index_youtube');

    expect(gtag).toHaveBeenCalledWith('event', 'select_content', jasmine.objectContaining({
      content_type: 'video',
      content_id: 'video-123',
      content_group: 'youtube',
      source_component: 'homepage_youtube',
      method: 'video_watch',
    }));
    expect(gtag).toHaveBeenCalledWith('event', 'select_content', jasmine.objectContaining({
      content_type: 'channel',
      content_id: 'channel-456',
      content_group: 'youtube',
      source_component: 'topic_drones_youtube',
      method: 'subscribe',
    }));
    expect(gtag).toHaveBeenCalledWith('event', 'select_content', jasmine.objectContaining({
      content_type: 'video',
      content_id: 'video-789',
      content_group: 'youtube',
      source_component: 'article_drones_youtube',
      method: 'video_title',
    }));
    expect(gtag).toHaveBeenCalledWith('event', 'select_content', jasmine.objectContaining({
      content_type: 'video',
      content_id: 'video-companion',
      content_group: 'youtube',
      source_component: 'article_companion_youtube',
      method: 'video_watch',
    }));
    expect(gtag).toHaveBeenCalledWith('event', 'select_content', jasmine.objectContaining({
      content_type: 'video',
      content_id: 'video-sidebar',
      content_group: 'youtube',
      source_component: 'blog_index_youtube',
      method: 'video_watch',
    }));
  });

  it('tracks a bounded creator-profile handoff without sending a URL or visitor identity', () => {
    service.trackCreatorProfileOutbound('instagram');

    expect(gtag).toHaveBeenCalledOnceWith('event', 'select_content', {
      content_type: 'profile',
      content_id: 'instagram',
      content_group: 'creator_profile',
      source_component: 'homepage_social',
      method: 'outbound',
      send_to: SITE_ANALYTICS_MEASUREMENT_ID,
    });
  });

  it('tracks printable resource downloads with a bounded file identifier', () => {
    service.trackResourceDownload(' Captain Colin Drone Flight Field Notes.pdf ');
    service.trackResourceDownload(' Captain Colin Gadget Usefulness Scorecard.pdf ', 'resource_page');
    service.trackResourceDownload('   ');

    expect(gtag).toHaveBeenCalledTimes(2);
    expect(gtag).toHaveBeenCalledWith('event', 'select_content', jasmine.objectContaining({
      content_type: 'resource',
      content_id: 'captain-colin-drone-flight-field-notes',
      content_group: 'download',
      source_component: 'topic_guide',
      method: 'download',
    }));
    expect(gtag).toHaveBeenCalledWith('event', 'select_content', jasmine.objectContaining({
      content_id: 'captain-colin-gadget-usefulness-scorecard',
      source_component: 'resource_page',
      method: 'download',
    }));
  });

  it('tracks the bounded after-article membership invitation without account data', () => {
    service.trackReaderMembershipInvite(' Useful Reader Story ', 'view');
    service.trackReaderMembershipInvite(' Useful Reader Story ', 'register');
    service.trackReaderMembershipInvite('   ', 'dismiss');

    expect(gtag).toHaveBeenCalledTimes(2);
    expect(gtag).toHaveBeenCalledWith('event', 'reader_membership_invite', jasmine.objectContaining({
      content_type: 'article',
      content_slug: 'useful-reader-story',
      source_component: 'after_article',
      method: 'view',
      auth_state: 'anonymous',
      send_to: SITE_ANALYTICS_MEASUREMENT_ID,
    }));
    expect(gtag).toHaveBeenCalledWith('event', 'reader_membership_invite', jasmine.objectContaining({
      content_slug: 'useful-reader-story',
      method: 'register',
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
