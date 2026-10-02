import {BlogReaderRelease} from '../models/blog-post.model';

export function isBlogReaderRelease(value: unknown): value is BlogReaderRelease | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const release = value as Record<string, unknown>;
  return Object.keys(release).length === 2 && typeof release['announceInSchedule'] === 'boolean'
    && (release['earlyAccessAt'] === null || (typeof release['earlyAccessAt'] === 'string'
      && isReleaseTimestamp(release['earlyAccessAt'])));
}

function isReleaseTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00.000Z`);
  return Number.isFinite(Date.parse(value)) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === datePart;
}

export function normalizeBlogReaderRelease(value: unknown): BlogReaderRelease | undefined {
  if (!isBlogReaderRelease(value) || value === undefined) return undefined;
  return {announceInSchedule: value.announceInSchedule,
    earlyAccessAt: value.earlyAccessAt ? new Date(value.earlyAccessAt).toISOString() : null};
}

export function getReaderReleaseDateError(earlyAccessAt: string, publishedAt: string): string | null {
  if (!earlyAccessAt.trim()) return null;
  const early = Date.parse(earlyAccessAt);
  const publication = Date.parse(publishedAt);
  if (!Number.isFinite(early)) return 'Choose a valid member early access time.';
  if (!Number.isFinite(publication) || early >= publication) return 'Member early access must begin before the public publish date.';
  return null;
}
