import { CanActivateFn } from '@angular/router';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function parseSafeExternalUrl(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(raw).trim();
    const parsed = new URL(decoded);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export const redirectGuard: CanActivateFn = (route) => {
  const externalUrl = route.params['externalUrl'];
  if (!externalUrl) return true;

  const safeUrl = parseSafeExternalUrl(externalUrl);
  if (!safeUrl) return false;

  window.open(safeUrl, '_blank', 'noopener,noreferrer');
  return false;
};
