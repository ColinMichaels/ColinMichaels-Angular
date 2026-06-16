import {BehaviorSubject} from 'rxjs';

const AUTH_DEBUG_STORAGE_KEY = 'authDebug';
const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on']);
const MAX_DEBUG_EVENTS = 100;

export interface AuthDebugEvent {
  scope: string;
  event: string;
  details?: unknown;
  timestamp: Date;
}

const authDebugEventsSubject = new BehaviorSubject<readonly AuthDebugEvent[]>([]);

export const authDebugEvents$ = authDebugEventsSubject.asObservable();

function getWindow(): Window | null {
  return typeof window === 'undefined' ? null : window;
}

function isLocalHost(activeWindow: Window): boolean {
  const hostname = activeWindow.location.hostname;

  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isAuthDebugEnabled(): boolean {
  const activeWindow = getWindow();

  if (!activeWindow) {
    return false;
  }

  const queryValue = new URLSearchParams(activeWindow.location.search).get(AUTH_DEBUG_STORAGE_KEY);

  if (queryValue !== null) {
    const isEnabled = ENABLED_VALUES.has(queryValue.toLowerCase());

    try {
      activeWindow.localStorage.setItem(AUTH_DEBUG_STORAGE_KEY, String(isEnabled));
    } catch {
      return isEnabled;
    }

    return isEnabled;
  }

  try {
    const storedValue = activeWindow.localStorage.getItem(AUTH_DEBUG_STORAGE_KEY);

    if (storedValue !== null) {
      return storedValue === 'true';
    }

    return isLocalHost(activeWindow);
  } catch {
    return isLocalHost(activeWindow);
  }
}

export function writeAuthDebug(scope: string, event: string, details?: unknown): void {
  if (!isAuthDebugEnabled()) {
    return;
  }

  authDebugEventsSubject.next([
    ...authDebugEventsSubject.value,
    {
      scope,
      event,
      details,
      timestamp: new Date(),
    },
  ].slice(-MAX_DEBUG_EVENTS));
  console.info(`[${scope}] ${event}`, details ?? '');
}

export function clearAuthDebugEvents(): void {
  authDebugEventsSubject.next([]);
}
