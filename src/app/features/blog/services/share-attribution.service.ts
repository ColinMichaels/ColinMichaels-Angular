import {isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, inject} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter, startWith, Subscription} from 'rxjs';

import {SiteAnalyticsService} from '../../../shared/analytics/site-analytics.service';
import {BlogEngagementService} from './blog-engagement.service';

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{20,80}$/;
const SHARE_VISIT_STORAGE_KEY = 'share-attribution.visit-id';
const SHARE_RECORDED_STORAGE_PREFIX = 'share-attribution.recorded.';

@Injectable({providedIn: 'root'})
export class ShareAttributionService {
  private readonly engagement = inject(BlogEngagementService);
  private readonly analytics = inject(SiteAnalyticsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private subscription: Subscription | null = null;

  start(): void {
    if (this.subscription || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.subscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(new NavigationEnd(0, this.router.url, this.router.url))
    ).subscribe(event => this.recordLandingFromUrl(event.urlAfterRedirects));
  }

  private recordLandingFromUrl(url: string): void {
    const shareId = this.getShareId(url);
    if (!shareId) {
      return;
    }

    const recordedKey = `${SHARE_RECORDED_STORAGE_PREFIX}${shareId}`;
    try {
      if (sessionStorage.getItem(recordedKey) === 'true') {
        return;
      }
      sessionStorage.setItem(recordedKey, 'true');
    } catch {
      // Continue with server-side idempotency when session storage is unavailable.
    }

    void this.engagement.recordShareLanding({
      shareId,
      visitId: this.getOrCreateVisitId(),
    }).then(result => {
      if (result.recorded) {
        this.analytics.trackShareLanding();
      } else {
        this.removeRecordedMarker(recordedKey);
      }
    }).catch(() => this.removeRecordedMarker(recordedKey));
  }

  private getShareId(url: string): string | null {
    const query = url.split('?')[1]?.split('#')[0] ?? '';
    const shareId = new URLSearchParams(query).get('share')?.trim() ?? '';

    return SHARE_ID_PATTERN.test(shareId) ? shareId : null;
  }

  private getOrCreateVisitId(): string {
    try {
      const existing = sessionStorage.getItem(SHARE_VISIT_STORAGE_KEY);
      if (existing && SHARE_ID_PATTERN.test(existing)) {
        return existing;
      }

      const visitId = createOpaqueShareId();
      sessionStorage.setItem(SHARE_VISIT_STORAGE_KEY, visitId);
      return visitId;
    } catch {
      return createOpaqueShareId();
    }
  }

  private removeRecordedMarker(recordedKey: string): void {
    try {
      sessionStorage.removeItem(recordedKey);
    } catch {
      // A later navigation can retry only when storage is available.
    }
  }
}

export function createOpaqueShareId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, '');
  }

  const randomPart = Math.random().toString(36).slice(2).padEnd(16, '0');
  return `${Date.now().toString(36)}${randomPart}`.slice(0, 32);
}
