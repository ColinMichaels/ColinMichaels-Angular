import {BlogSocialAnnouncement} from '../../../../features/blog/models/blog-social-promotion.model';
import {BlogPost} from '../../../../features/blog/models/blog-post.model';

export type PublishingCalendarFilter = 'all' | 'scheduled' | 'published' | 'social';

export interface PublishingCalendarEvent {
  id: string;
  type: 'post' | 'social';
  timestamp: number;
  dateKey: string;
  post: BlogPost;
  announcement?: BlogSocialAnnouncement;
}

export interface PublishingCalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: readonly PublishingCalendarEvent[];
}

export const PUBLISHING_CALENDAR_FILTERS: readonly {
  value: PublishingCalendarFilter;
  label: string;
}[] = [
  {value: 'all', label: 'All content'},
  {value: 'scheduled', label: 'Scheduled'},
  {value: 'published', label: 'Published'},
  {value: 'social', label: 'Social'},
];

export const PUBLISHING_CALENDAR_WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function startOfPublishingMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function addPublishingDays(value: Date, dayCount: number): Date {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + dayCount);
  return nextDate;
}

export function toPublishingDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createPublishingCalendarEvents(posts: readonly BlogPost[]): readonly PublishingCalendarEvent[] {
  const events: PublishingCalendarEvent[] = [];

  for (const post of posts) {
    if (post.publishedAt && (post.status === 'scheduled' || post.status === 'published')) {
      const timestamp = new Date(post.publishedAt).getTime();

      if (Number.isFinite(timestamp)) {
        events.push({
          id: `post:${post.id}`,
          type: 'post',
          timestamp,
          dateKey: toPublishingDateKey(new Date(timestamp)),
          post,
        });
      }
    }

    for (const announcement of post.socialPromotion?.announcements ?? []) {
      if (announcement.status === 'cancelled') {
        continue;
      }

      const timestamp = new Date(announcement.scheduledAt ?? '').getTime();

      if (Number.isFinite(timestamp)) {
        events.push({
          id: `social:${post.id}:${announcement.id}`,
          type: 'social',
          timestamp,
          dateKey: toPublishingDateKey(new Date(timestamp)),
          post,
          announcement,
        });
      }
    }
  }

  return events.sort((left, right) => left.timestamp - right.timestamp);
}

export function publishingCalendarEventMatchesFilter(
  calendarEvent: PublishingCalendarEvent,
  filter: PublishingCalendarFilter
): boolean {
  switch (filter) {
    case 'all':
      if (calendarEvent.type !== 'social' || !calendarEvent.post.publishedAt) {
        return true;
      }

      return calendarEvent.dateKey !== toPublishingDateKey(new Date(calendarEvent.post.publishedAt));
    case 'social':
      return calendarEvent.type === 'social';
    case 'published':
      return calendarEvent.type === 'post' && calendarEvent.post.status === 'published';
    case 'scheduled':
      return calendarEvent.type === 'post' && calendarEvent.post.status === 'scheduled';
  }
}

export function createPublishingCalendarDays(
  month: Date,
  events: readonly PublishingCalendarEvent[],
  today = new Date()
): readonly PublishingCalendarDay[] {
  const firstDayOffset = (month.getDay() + 6) % 7;
  const firstGridDate = addPublishingDays(month, -firstDayOffset);
  const todayKey = toPublishingDateKey(today);
  const eventsByDate = new Map<string, PublishingCalendarEvent[]>();

  for (const calendarEvent of events) {
    const dateEvents = eventsByDate.get(calendarEvent.dateKey) ?? [];
    dateEvents.push(calendarEvent);
    eventsByDate.set(calendarEvent.dateKey, dateEvents);
  }

  return Array.from({length: 42}, (_, index) => {
    const date = addPublishingDays(firstGridDate, index);
    const dateKey = toPublishingDateKey(date);
    return {
      date,
      dateKey,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear(),
      isToday: dateKey === todayKey,
      events: eventsByDate.get(dateKey) ?? [],
    };
  });
}
