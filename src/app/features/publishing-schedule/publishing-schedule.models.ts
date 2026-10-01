import {BlogPost} from '../blog/models/blog-post.model';
import {isBlogPost, isRecord} from '../blog/utils/blog-validation.util';

export type PublishingScheduleAccess = 'public' | 'early' | 'locked';
export interface PublishingScheduleEntry {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly coverImage: string;
  readonly publishedAt: string;
  readonly earlyAccessAt: string | null;
  readonly status: 'scheduled' | 'published';
  readonly access: PublishingScheduleAccess;
}
export interface PublishingScheduleResponse {
  readonly serverNow: string;
  readonly entries: readonly PublishingScheduleEntry[];
}
export interface ScheduledReaderResponse {
  readonly serverNow: string;
  readonly access: 'public' | 'early';
  readonly post: BlogPost;
}

export function isScheduleSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
}

export function parsePublishingSchedule(value: unknown): PublishingScheduleResponse {
  if (!isRecord(value) || !isDate(value['serverNow']) || !Array.isArray(value['entries'])
    || value['entries'].length > 200) {
    throw new Error('Invalid publishing schedule response.');
  }
  const ids = new Set<string>();
  const entries = value['entries'].map((entry: unknown): PublishingScheduleEntry => {
    if (!isRecord(entry) || typeof entry['id'] !== 'string' || !entry['id'] || entry['id'].length > 200
      || ids.has(entry['id']) || !isScheduleSlug(entry['slug'])
      || typeof entry['title'] !== 'string' || typeof entry['excerpt'] !== 'string'
      || typeof entry['coverImage'] !== 'string' || !isDate(entry['publishedAt'])
      || (entry['earlyAccessAt'] !== null && !isDate(entry['earlyAccessAt']))
      || !['scheduled', 'published'].includes(String(entry['status']))
      || !['public', 'early', 'locked'].includes(String(entry['access']))
      || (entry['access'] === 'public' && entry['status'] !== 'published')
      || (entry['access'] === 'early' && entry['status'] !== 'scheduled')) {
      throw new Error('Invalid publishing schedule entry.');
    }
    ids.add(entry['id']);
    // Keep the metadata allowlist explicit: a callable must never smuggle a body into this list.
    return Object.freeze({id: entry['id'], slug: entry['slug'], title: entry['title'], excerpt: entry['excerpt'],
      coverImage: entry['coverImage'], publishedAt: entry['publishedAt'], earlyAccessAt: entry['earlyAccessAt'],
      status: entry['status'] as PublishingScheduleEntry['status'], access: entry['access'] as PublishingScheduleAccess});
  });
  return Object.freeze({serverNow: value['serverNow'], entries: Object.freeze(entries)});
}

export function parseScheduledReader(value: unknown, slug: string): ScheduledReaderResponse {
  if (!isRecord(value) || !isDate(value['serverNow']) || !['public', 'early'].includes(String(value['access']))
    || !isBlogPost(value['post']) || value['post'].slug !== slug
    || (value['access'] === 'public' && value['post'].status !== 'published')
    || (value['access'] === 'early' && value['post'].status !== 'scheduled')) {
    throw new Error('Invalid reader response.');
  }
  return {serverNow: value['serverNow'], access: value['access'] as 'public' | 'early', post: value['post']};
}

/** Eligibility comes only from the server response; the browser clock never unlocks a link. */
export function publishingScheduleReadPath(entry: PublishingScheduleEntry): string | null {
  if (entry.access === 'public' && entry.status === 'published') return `/blog/${entry.slug}`;
  if (entry.access === 'early' && entry.status === 'scheduled') return `/schedule/read/${entry.slug}`;
  return null;
}
