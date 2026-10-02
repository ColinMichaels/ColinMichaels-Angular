import {InjectionToken} from '@angular/core';

import {seasonalPath} from './seasonal.config';

export type SeasonalHideout = 'reading' | 'guide' | 'discovery';
const THREE_HIDEOUTS: readonly SeasonalHideout[] = Object.freeze(['reading', 'guide', 'discovery']);
const AUTHOR_HIDEOUTS: readonly SeasonalHideout[] = Object.freeze(['reading', 'discovery']);
const NO_HIDEOUTS: readonly SeasonalHideout[] = Object.freeze([]);
const ROUTE_HIDEOUTS: Readonly<Record<string, readonly SeasonalHideout[]>> = Object.freeze({
  '/': THREE_HIDEOUTS,
  '/blog': THREE_HIDEOUTS,
  '/topics/gadgets-toys': THREE_HIDEOUTS,
  '/topics/drones-fpv': THREE_HIDEOUTS,
  '/topics/labs-projects': THREE_HIDEOUTS,
  '/authors': AUTHOR_HIDEOUTS,
});

/** A fresh tab/reload starts a new layout; in-page visits rotate from it. */
export const SEASONAL_HIDING_SEED = new InjectionToken<number>('Seasonal hiding seed', {
  providedIn: 'root',
  factory: () => globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ?? 0,
});

export function seasonalHideoutsFor(url: string): readonly SeasonalHideout[] {
  const path = seasonalPath(url);
  return path ? ROUTE_HIDEOUTS[path] ?? NO_HIDEOUTS : NO_HIDEOUTS;
}

/** Keep the original item ordinal, including found items, to avoid moving a remaining find. */
export function seasonalHideoutFor(editionId: string, url: string, ordinal: number,
  seed: number, visit: number): SeasonalHideout | undefined {
  const hideouts = seasonalHideoutsFor(url);
  if (!hideouts.length) return undefined;
  let hash = 0;
  for (const character of `${editionId}:${seasonalPath(url)}`) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  }
  return hideouts[(hash + seed + visit + ordinal) % hideouts.length];
}
