import {DOCUMENT} from '@angular/common';
import {Injectable, inject} from '@angular/core';

export interface PendingBlogMembershipPreferences {
  browserNotifications: boolean;
  newPostEmails: boolean;
  newsletter: boolean;
  createdAt: string;
}

interface CampaignDismissal {
  nextEligibleAt: string;
}

const DISMISSAL_STORAGE_KEY = 'cm.blog-membership-campaign.dismissal.v1';
const PENDING_STORAGE_KEY = 'cm.blog-membership-campaign.pending.v1';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function parsePendingBlogMembershipPreferences(
  value: string | null
): PendingBlogMembershipPreferences | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const createdAt = typeof parsed['createdAt'] === 'string' ? parsed['createdAt'] : '';

    if (
      typeof parsed['browserNotifications'] !== 'boolean'
      || typeof parsed['newPostEmails'] !== 'boolean'
      || typeof parsed['newsletter'] !== 'boolean'
      || !createdAt
    ) {
      return null;
    }

    return {
      browserNotifications: parsed['browserNotifications'],
      newPostEmails: parsed['newPostEmails'],
      newsletter: parsed['newsletter'],
      createdAt,
    };
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root',
})
export class BlogMembershipCampaignStateService {
  private readonly browserWindow = inject(DOCUMENT).defaultView;

  shouldPromptAnonymousReader(now = Date.now()): boolean {
    const dismissal = this.readDismissal();

    if (!dismissal) {
      return true;
    }

    const nextEligibleAt = new Date(dismissal.nextEligibleAt).getTime();
    return !Number.isFinite(nextEligibleAt) || nextEligibleAt <= now;
  }

  rememberPendingPreferences(
    preferences: Omit<PendingBlogMembershipPreferences, 'createdAt'>
  ): PendingBlogMembershipPreferences {
    const pending: PendingBlogMembershipPreferences = {
      ...preferences,
      createdAt: new Date().toISOString(),
    };

    try {
      this.browserWindow?.sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
    } catch {
      // Storage can be unavailable in private or locked-down browsing contexts.
    }

    return pending;
  }

  getPendingPreferences(): PendingBlogMembershipPreferences | null {
    try {
      return parsePendingBlogMembershipPreferences(
        this.browserWindow?.sessionStorage.getItem(PENDING_STORAGE_KEY) ?? null
      );
    } catch {
      return null;
    }
  }

  clearPendingPreferences(): void {
    try {
      this.browserWindow?.sessionStorage.removeItem(PENDING_STORAGE_KEY);
    } catch {
      // A failed cleanup should not block navigation or account use.
    }
  }

  snooze(days: number): void {
    const nextEligibleAt = new Date(Date.now() + Math.max(1, days) * DAY_IN_MS).toISOString();

    try {
      this.browserWindow?.localStorage.setItem(
        DISMISSAL_STORAGE_KEY,
        JSON.stringify({nextEligibleAt} satisfies CampaignDismissal)
      );
    } catch {
      // The campaign may reappear next session when persistence is unavailable.
    }
  }

  markCompleted(): void {
    this.snooze(365);
  }

  private readDismissal(): CampaignDismissal | null {
    try {
      const value = this.browserWindow?.localStorage.getItem(DISMISSAL_STORAGE_KEY);

      if (!value) {
        return null;
      }

      const parsed = JSON.parse(value) as Record<string, unknown>;
      return typeof parsed['nextEligibleAt'] === 'string'
        ? {nextEligibleAt: parsed['nextEligibleAt']}
        : null;
    } catch {
      return null;
    }
  }
}
