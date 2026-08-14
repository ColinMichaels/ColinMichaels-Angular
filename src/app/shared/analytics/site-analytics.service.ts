import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, inject} from '@angular/core';

import {PATH_NAMES} from '../../app-route-paths';

export const SITE_ANALYTICS_MEASUREMENT_ID = 'G-6V5GQRZFBH';

export interface SiteAnalyticsContent {
  id: string;
  slug: string;
  categories?: readonly string[];
  contentType?: 'article' | 'page' | 'topic';
}

type AnalyticsPrimitive = string | number | boolean;
type AnalyticsParameters = Readonly<Record<string, AnalyticsPrimitive | null | undefined>>;

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

const ARTICLE_PROGRESS_THRESHOLDS = [25, 50, 75, 95] as const;
const REDACTED_SEARCH_TERM = '[redacted]';
const MAX_SEARCH_TERM_LENGTH = 80;

@Injectable({providedIn: 'root'})
export class SiteAnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly recordedArticleThresholds = new Map<string, Set<number>>();
  private readonly recordedCompletedDays = new Set<string>();
  private lastPagePath = '';

  trackPageView(routeUrl: string): void {
    const pagePath = normalizeAnalyticsPagePath(routeUrl);
    if (pagePath === this.lastPagePath) {
      return;
    }

    const analyticsWindow = this.getAnalyticsWindow();
    if (!analyticsWindow) {
      return;
    }

    this.lastPagePath = pagePath;
    this.trackEvent('page_view', {
      page_location: `${analyticsWindow.location.origin}${pagePath}`,
      page_path: pagePath,
      page_title: this.document.title,
    });
  }

  trackArticleProgress(content: SiteAnalyticsContent, progressPercent: number, signedIn: boolean): void {
    const boundedProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));
    const recordedThresholds = this.recordedArticleThresholds.get(content.id) ?? new Set<number>();

    for (const threshold of ARTICLE_PROGRESS_THRESHOLDS) {
      if (boundedProgress < threshold || recordedThresholds.has(threshold)) {
        continue;
      }

      recordedThresholds.add(threshold);
      this.trackEvent('article_progress', {
        ...this.contentParameters(content),
        progress_percent: threshold,
        auth_state: this.authState(signedIn),
      });

      if (threshold === 95) {
        this.trackEvent('article_complete', {
          ...this.contentParameters(content),
          progress_percent: threshold,
          auth_state: this.authState(signedIn),
        });
      }
    }

    this.recordedArticleThresholds.set(content.id, recordedThresholds);
  }

  trackArticleSave(
    content: SiteAnalyticsContent,
    saveType: 'favorite' | 'read_later' | 'offline',
    added: boolean,
    signedIn: boolean
  ): void {
    this.trackEvent(added ? 'article_saved' : 'article_unsaved', {
      ...this.contentParameters(content),
      save_type: saveType,
      auth_state: this.authState(signedIn),
    });
  }

  trackShare(
    content: SiteAnalyticsContent | null,
    method: string,
    sourceComponent: 'article' | 'homepage',
    signedIn: boolean
  ): void {
    this.trackEvent('share', {
      ...(content ? this.contentParameters(content) : {content_type: 'website'}),
      method,
      source_component: sourceComponent,
      auth_state: this.authState(signedIn),
    });
  }

  trackShareLanding(): void {
    this.trackEvent('share_landing', {source_component: 'shared_link'});
  }

  trackCommentSubmit(
    content: SiteAnalyticsContent,
    reply: boolean,
    moderationStatus: 'approved' | 'pending'
  ): void {
    this.trackEvent('comment_submit', {
      ...this.contentParameters(content),
      reply,
      moderation_status: moderationStatus,
      auth_state: 'signed_in',
    });
  }

  trackDailyDiscoveryStart(challengeId: string, challengeType: string | undefined, signedIn: boolean): void {
    this.trackEvent('daily_discovery_start', {
      challenge_id: challengeId,
      challenge_type: challengeType || 'title_gap',
      auth_state: this.authState(signedIn),
    });
  }

  trackDailyDiscoveryAnswer(
    challengeId: string,
    challengeType: string | undefined,
    correct: boolean,
    dailyComplete: boolean,
    signedIn: boolean
  ): void {
    this.trackEvent('daily_discovery_answer', {
      challenge_id: challengeId,
      challenge_type: challengeType || 'title_gap',
      correct,
      daily_complete: dailyComplete,
      auth_state: this.authState(signedIn),
    });
  }

  trackDailyDiscoveryComplete(dateKey: string, totalQuestions: number, signedIn: boolean): void {
    if (this.recordedCompletedDays.has(dateKey)) {
      return;
    }

    this.recordedCompletedDays.add(dateKey);
    this.trackEvent('daily_discovery_complete', {
      total_questions: Math.max(1, Math.round(totalQuestions)),
      auth_state: this.authState(signedIn),
    });
  }

  trackSearch(searchTerm: string, resultCount: number, sourceComponent: 'search_page' | 'search_drawer'): void {
    const sanitizedSearchTerm = sanitizeAnalyticsSearchTerm(searchTerm);
    if (!sanitizedSearchTerm) {
      return;
    }

    this.trackEvent('search', {
      search_term: sanitizedSearchTerm,
      result_count: Math.max(0, Math.round(resultCount)),
      source_component: sourceComponent,
    });
  }

  trackContentSelection(
    content: SiteAnalyticsContent,
    sourceComponent: 'search_page' | 'search_drawer' | 'continue_reading' | 'related_reading',
    searchTerm = ''
  ): void {
    this.trackEvent('select_content', {
      ...this.contentParameters(content),
      source_component: sourceComponent,
      ...(searchTerm.trim() ? {search_term: sanitizeAnalyticsSearchTerm(searchTerm)} : {}),
    });
  }

  trackContinueReading(content: SiteAnalyticsContent, progressPercent: number, surface: string): void {
    this.trackEvent('continue_reading', {
      ...this.contentParameters(content),
      progress_percent: Math.max(0, Math.min(100, Math.round(progressPercent))),
      source_component: surface,
    });
  }

  trackContentReaction(
    content: SiteAnalyticsContent,
    reactionType: string,
    reactionUpdated: boolean,
    signedIn: boolean
  ): void {
    this.trackEvent('content_reaction', {
      ...this.contentParameters(content),
      reaction_type: reactionType,
      reaction_updated: reactionUpdated,
      auth_state: this.authState(signedIn),
    });
  }

  trackPollVote(
    content: SiteAnalyticsContent,
    pollId: string,
    optionId: string,
    voteUpdated: boolean,
    resultsVisible: boolean
  ): void {
    this.trackEvent('poll_vote', {
      ...this.contentParameters(content),
      poll_id: pollId,
      option_id: optionId,
      vote_updated: voteUpdated,
      results_visible: resultsVisible,
      auth_state: 'signed_in',
    });
  }

  private trackEvent(eventName: string, parameters: AnalyticsParameters): void {
    const analyticsWindow = this.getAnalyticsWindow();
    if (!analyticsWindow) {
      return;
    }

    const cleanParameters = Object.fromEntries(
      Object.entries(parameters).filter(([, value]) => value !== null && value !== undefined && value !== '')
    );
    const gtag = analyticsWindow.gtag ?? ((...args: unknown[]) => {
      analyticsWindow.dataLayer ??= [];
      analyticsWindow.dataLayer.push(args);
    });

    analyticsWindow.gtag = gtag;
    gtag('event', eventName, {
      ...cleanParameters,
      send_to: SITE_ANALYTICS_MEASUREMENT_ID,
    });
  }

  private getAnalyticsWindow(): AnalyticsWindow | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const analyticsWindow = this.document.defaultView as AnalyticsWindow | null;
    if (!analyticsWindow || !shouldCollectSiteAnalytics(analyticsWindow.location)) {
      return null;
    }

    return analyticsWindow;
  }

  private contentParameters(content: SiteAnalyticsContent): AnalyticsParameters {
    return {
      content_type: content.contentType ?? 'article',
      content_id: content.id,
      content_slug: content.slug,
      content_group: content.categories?.[0],
    };
  }

  private authState(signedIn: boolean): 'signed_in' | 'anonymous' {
    return signedIn ? 'signed_in' : 'anonymous';
  }
}

export function shouldCollectSiteAnalytics(location: Pick<Location, 'hostname' | 'pathname'>): boolean {
  const hostname = location.hostname.toLowerCase();
  const isLocal = hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname.endsWith('.local');
  const isAdmin = location.pathname === `/${PATH_NAMES.ADMIN}`
    || location.pathname.startsWith(`/${PATH_NAMES.ADMIN}/`);

  return !isLocal && !isAdmin;
}

export function normalizeAnalyticsPagePath(routeUrl: string): string {
  const path = routeUrl.split('#')[0].split('?')[0].trim();
  if (!path) {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export function sanitizeAnalyticsSearchTerm(searchTerm: string): string {
  const normalized = searchTerm.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  const containsEmail = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(normalized);
  const containsUrl = /(?:https?:\/\/|www\.)/i.test(normalized);
  const containsPhoneNumber = normalized.replace(/\D/g, '').length >= 7;

  if (containsEmail || containsUrl || containsPhoneNumber) {
    return REDACTED_SEARCH_TERM;
  }

  return normalized.slice(0, MAX_SEARCH_TERM_LENGTH);
}
