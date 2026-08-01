import {DOCUMENT} from '@angular/common';
import {Injectable, inject} from '@angular/core';

import {PATH_NAMES} from '../app-route-paths';

interface StoredAuthReturnUrl {
  url: string;
  createdAt: string;
}

export const AUTH_RETURN_URL_STORAGE_KEY = 'cm.auth.return-url.v1';
export const AUTH_RETURN_URL_MAX_AGE_MS = 15 * 60 * 1000;

const AUTH_RETURN_URL_BASE = 'https://colinmichaels.local';

export function normalizeAuthReturnUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const candidate = value.trim();

  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return null;
  }

  try {
    const parsed = new URL(candidate, AUTH_RETURN_URL_BASE);

    if (parsed.origin !== AUTH_RETURN_URL_BASE) {
      return null;
    }

    const loginPath = `/${PATH_NAMES.OS_LOGIN}`;
    const logoutPath = `/${PATH_NAMES.LOGOUT}`;

    if (
      parsed.pathname === loginPath
      || parsed.pathname.startsWith(`${loginPath}/`)
      || parsed.pathname === logoutPath
    ) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

@Injectable({providedIn: 'root'})
export class AuthReturnUrlService {
  private readonly browserWindow = inject(DOCUMENT).defaultView;

  rememberDestination(value: unknown): string | null {
    const url = normalizeAuthReturnUrl(value);

    if (!url) {
      return null;
    }

    const stored: StoredAuthReturnUrl = {
      url,
      createdAt: new Date().toISOString(),
    };

    try {
      this.browserWindow?.sessionStorage.setItem(AUTH_RETURN_URL_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Redirect sign-in can still continue when browser storage is unavailable.
    }

    return url;
  }

  resolveDestination(value: unknown, now = Date.now()): string | null {
    const requestedUrl = normalizeAuthReturnUrl(value);

    if (requestedUrl) {
      return requestedUrl;
    }

    try {
      const storedValue = this.browserWindow?.sessionStorage.getItem(AUTH_RETURN_URL_STORAGE_KEY);

      if (!storedValue) {
        return null;
      }

      const stored = JSON.parse(storedValue) as Partial<StoredAuthReturnUrl>;
      const createdAt = typeof stored.createdAt === 'string' ? new Date(stored.createdAt).getTime() : Number.NaN;
      const storedUrl = normalizeAuthReturnUrl(stored.url);

      if (!storedUrl || !Number.isFinite(createdAt) || now - createdAt > AUTH_RETURN_URL_MAX_AGE_MS) {
        this.clearDestination();
        return null;
      }

      return storedUrl;
    } catch {
      this.clearDestination();
      return null;
    }
  }

  clearDestination(): void {
    try {
      this.browserWindow?.sessionStorage.removeItem(AUTH_RETURN_URL_STORAGE_KEY);
    } catch {
      // A failed cleanup should not block authentication or navigation.
    }
  }
}
