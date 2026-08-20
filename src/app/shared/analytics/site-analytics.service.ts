import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, inject} from '@angular/core';

import {PATH_NAMES} from '../../app-route-paths';
import type {CreatorProfileId} from '../seo/site-identity';

export const SITE_ANALYTICS_MEASUREMENT_ID = 'G-6V5GQRZFBH';

export interface SiteAnalyticsContent {
  id: string;
  slug: string;
  categories?: readonly string[];
  contentType?: 'article' | 'page' | 'topic';
}

type AnalyticsPrimitive = string | number | boolean;
type AnalyticsParameters = Readonly<Record<string, AnalyticsPrimitive | null | undefined>>;
export type YouTubeAnalyticsSourceComponent =
  | 'homepage_youtube'
  | 'blog_index_youtube'
  | 'topic_drones_youtube'
  | 'article_drones_youtube'
  | 'article_companion_youtube';

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

const ARTICLE_PROGRESS_THRESHOLDS = [25, 50, 75, 95] as const;
const REDACTED_SEARCH_TERM = '[redacted]';
const MAX_SEARCH_TERM_LENGTH = 80;
const ACTIVE_READER_MINIMUM_SECONDS = 15;
const ACTIVE_READER_MINIMUM_MILLISECONDS = ACTIVE_READER_MINIMUM_SECONDS * 1_000;
type ReaderInteractionType = 'pointer' | 'keyboard' | 'touch';

@Injectable({providedIn: 'root'})
export class SiteAnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly recordedArticleThresholds = new Map<string, Set<number>>();
  private readonly recordedCompletedDays = new Set<string>();
  private readonly recordedActiveReaderPaths = new Set<string>();
  private lastPagePath = '';
  private activeReaderPath = '';
  private activeReaderVisibleMilliseconds = 0;
  private activeReaderBecameVisibleAt = 0;
  private activeReaderInteraction: ReaderInteractionType | null = null;
  private activeReaderTimer: number | null = null;
  private activeReaderWindow: AnalyticsWindow | null = null;
  private activeReaderTrackingInitialized = false;

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
    this.startActiveReaderTracking(pagePath, analyticsWindow);
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
    sourceComponent: 'article' | 'homepage' | 'site_footer',
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

  trackYouTubeOutbound(
    contentId: string,
    action: 'video_thumbnail' | 'video_title' | 'video_watch' | 'channel' | 'subscribe',
    sourceComponent: YouTubeAnalyticsSourceComponent = 'homepage_youtube'
  ): void {
    const normalizedContentId = contentId.trim().slice(0, 64);
    if (!normalizedContentId) {
      return;
    }

    this.trackEvent('select_content', {
      content_type: action.startsWith('video_') ? 'video' : 'channel',
      content_id: normalizedContentId,
      content_group: 'youtube',
      source_component: sourceComponent,
      method: action,
    });
  }

  trackCreatorProfileOutbound(profileId: CreatorProfileId): void {
    this.trackEvent('select_content', {
      content_type: 'profile',
      content_id: profileId,
      content_group: 'creator_profile',
      source_component: 'homepage_social',
      method: 'outbound',
    });
  }

  trackResourceDownload(
    resourceId: string,
    sourceComponent: 'topic_guide' | 'resource_page' = 'topic_guide'
  ): void {
    const normalizedResourceId = resourceId
      .trim()
      .toLowerCase()
      .replace(/\.pdf$/i, '')
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);

    if (!normalizedResourceId) {
      return;
    }

    this.trackEvent('select_content', {
      content_type: 'resource',
      content_id: normalizedResourceId,
      content_group: 'download',
      source_component: sourceComponent,
      method: 'download',
    });
  }

  trackReaderMembershipInvite(
    postSlug: string,
    action: 'view' | 'register' | 'login' | 'dismiss'
  ): void {
    const normalizedPostSlug = postSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);

    if (!normalizedPostSlug) {
      return;
    }

    this.trackEvent('reader_membership_invite', {
      content_type: 'article',
      content_slug: normalizedPostSlug,
      source_component: 'after_article',
      method: action,
      auth_state: 'anonymous',
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

  /**
   * Records a deliberately conservative quality signal for report segmentation.
   * It is not a bot verdict: it requires a browser-originated input and at least
   * 15 seconds on the same visible page, but capable automation can imitate both.
   */
  private startActiveReaderTracking(pagePath: string, analyticsWindow: AnalyticsWindow): void {
    this.clearActiveReaderTimer();
    this.activeReaderPath = pagePath;
    this.activeReaderVisibleMilliseconds = 0;
    this.activeReaderBecameVisibleAt = this.isDocumentVisible() ? Date.now() : 0;
    this.activeReaderInteraction = null;
    this.activeReaderWindow = analyticsWindow;

    if (!this.activeReaderTrackingInitialized && typeof this.document.addEventListener === 'function') {
      this.activeReaderTrackingInitialized = true;
      this.document.addEventListener('pointerdown', event => this.recordActiveReaderInteraction(event, 'pointer'), {passive: true});
      this.document.addEventListener('keydown', event => this.recordActiveReaderInteraction(event, 'keyboard'));
      this.document.addEventListener('touchstart', event => this.recordActiveReaderInteraction(event, 'touch'), {passive: true});
      this.document.addEventListener('visibilitychange', () => this.handleActiveReaderVisibilityChange());
    }

    this.scheduleActiveReaderCheck(pagePath);
  }

  private recordActiveReaderInteraction(event: Event, interactionType: ReaderInteractionType): void {
    if (!event.isTrusted || !this.activeReaderPath || this.recordedActiveReaderPaths.has(this.activeReaderPath)) {
      return;
    }

    this.activeReaderInteraction ??= interactionType;
    this.trackActiveReader(this.activeReaderPath);
  }

  private trackActiveReader(pagePath: string): void {
    if (
      pagePath !== this.activeReaderPath
      || this.recordedActiveReaderPaths.has(pagePath)
      || !this.activeReaderInteraction
      || !this.isDocumentVisible()
    ) {
      return;
    }

    if (this.activeReaderVisibleDuration() < ACTIVE_READER_MINIMUM_MILLISECONDS) {
      this.scheduleActiveReaderCheck(pagePath);
      return;
    }

    this.recordedActiveReaderPaths.add(pagePath);
    this.clearActiveReaderTimer();
    this.trackEvent('active_reader', {
      page_path: pagePath,
      active_seconds: ACTIVE_READER_MINIMUM_SECONDS,
      interaction_type: this.activeReaderInteraction,
    });
  }

  private isDocumentVisible(): boolean {
    return this.document.visibilityState !== 'hidden';
  }

  private handleActiveReaderVisibilityChange(): void {
    if (!this.activeReaderPath) {
      return;
    }

    if (this.isDocumentVisible()) {
      this.activeReaderBecameVisibleAt = Date.now();
      this.scheduleActiveReaderCheck(this.activeReaderPath);
      return;
    }

    this.activeReaderVisibleMilliseconds = this.activeReaderVisibleDuration();
    this.activeReaderBecameVisibleAt = 0;
    this.clearActiveReaderTimer();
  }

  private activeReaderVisibleDuration(): number {
    return this.activeReaderVisibleMilliseconds
      + (this.activeReaderBecameVisibleAt ? Date.now() - this.activeReaderBecameVisibleAt : 0);
  }

  private scheduleActiveReaderCheck(pagePath: string): void {
    const analyticsWindow = this.activeReaderWindow;
    if (
      !analyticsWindow
      || !this.isDocumentVisible()
      || this.recordedActiveReaderPaths.has(pagePath)
      || typeof analyticsWindow.setTimeout !== 'function'
    ) {
      return;
    }

    this.clearActiveReaderTimer();
    const waitMilliseconds = Math.max(0, ACTIVE_READER_MINIMUM_MILLISECONDS - this.activeReaderVisibleDuration());
    this.activeReaderTimer = analyticsWindow.setTimeout(() => this.trackActiveReader(pagePath), waitMilliseconds);
  }

  private clearActiveReaderTimer(): void {
    const analyticsWindow = this.activeReaderWindow;
    if (this.activeReaderTimer !== null && typeof analyticsWindow?.clearTimeout === 'function') {
      analyticsWindow.clearTimeout(this.activeReaderTimer);
    }

    this.activeReaderTimer = null;
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
