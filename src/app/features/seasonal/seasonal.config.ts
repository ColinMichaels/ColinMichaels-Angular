import {getSeasonalEdition, SEASONAL_EDITIONS} from './seasonal.catalog';
import {SeasonalConfig, SeasonalEdition} from './seasonal.models';

export const SEASONAL_CONFIG: Readonly<SeasonalConfig> = Object.freeze({
  enabled: true,
  mode: 'calendar',
  manualEditionId: 'scary-christmas-2026',
  timeZone: 'America/New_York',
});

export const SEASONAL_PREFERENCE_STORAGE_KEY = 'cm.seasonal-preference.v1';

export function seasonalPath(url: string): string | null {
  if (!url.startsWith('/') || url.startsWith('//')) {
    return null;
  }

  try {
    const rawPath = url.split(/[?#]/, 1)[0];
    const path = decodeURIComponent(rawPath);
    if (path.includes(';') || /%2f|%5c/i.test(rawPath) || path.includes('\\')) {
      return null;
    }
    return path.length > 1 ? path.replace(/\/$/, '') : path;
  } catch {
    return null;
  }
}

/** Route shapes only; repositories still determine publication and existence. */
export function isSeasonalReadingRoute(url: string): boolean {
  const path = seasonalPath(url);
  if (path === '/' || path === '/blog' || path === '/authors') {
    return true;
  }
  if (!path) {
    return false;
  }
  const slug = '[a-z0-9]+(?:-[a-z0-9]+)*';
  return new RegExp(`^/(?:topics|authors)/${slug}$`).test(path)
    || new RegExp(`^/blog/(?:category|tag)/${slug}$`).test(path)
    || (new RegExp(`^/blog/${slug}$`).test(path) && path !== '/blog/preview');
}

export function getSeasonalArchiveEdition(url: string): SeasonalEdition | null {
  const path = seasonalPath(url);
  const match = path?.match(/^\/archive\/seasons\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  return match ? getSeasonalEdition(match[1]) : null;
}

/** Only known edition pages, never the archive index or an unknown identifier. */
export function isSeasonalArchiveRoute(url: string): boolean {
  return getSeasonalArchiveEdition(url) !== null;
}

export function seasonalDateKey(now: Date, timeZone = SEASONAL_CONFIG.timeZone): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values['year']}-${values['month']}-${values['day']}`;
  } catch {
    return null;
  }
}

/** Editorial display windows are inclusive local dates, not observance times. */
export function chooseCalendarEdition(
  now: Date,
  config: Readonly<SeasonalConfig> = SEASONAL_CONFIG,
  editions: readonly SeasonalEdition[] = SEASONAL_EDITIONS,
): SeasonalEdition | null {
  if (!config.enabled || config.mode !== 'calendar') {
    return null;
  }
  const date = seasonalDateKey(now, config.timeZone);
  if (!date) {
    return null;
  }
  return editions.filter(edition => edition.approvedForCalendar && edition.dateStatus !== 'needs-review'
    && validDisplayDate(edition.displayStart) && validDisplayDate(edition.displayEnd)
    && edition.displayStart <= edition.displayEnd
    && edition.displayStart <= date && date <= edition.displayEnd)
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))[0] ?? null;
}

function validDisplayDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  try {
    return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
  } catch {
    return false;
  }
}

export function chooseEdition(
  url: string,
  now: Date = new Date(),
  config: Readonly<SeasonalConfig> = SEASONAL_CONFIG,
  editions: readonly SeasonalEdition[] = SEASONAL_EDITIONS,
): SeasonalEdition | null {
  const archive = getSeasonalArchiveEdition(url);
  if (archive) {
    return archive;
  }
  if (!config.enabled || config.mode === 'off' || !isSeasonalReadingRoute(url)) {
    return null;
  }
  if (config.mode === 'calendar') {
    return chooseCalendarEdition(now, config, editions);
  }
  return editions.find(edition => edition.id === config.manualEditionId) ?? null;
}

export function seasonalStorageKey(editionId: string): string {
  return `cm.${editionId}.v1`;
}
