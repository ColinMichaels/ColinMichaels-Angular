import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faFacebookF,
  faInstagram,
  faLinkedinIn,
  faThreads,
  faXTwitter,
  faYoutube
} from '@fortawesome/free-brands-svg-icons';
import {faBell, faChevronLeft, faChevronRight} from '@fortawesome/free-solid-svg-icons';

import {BLOG_SOCIAL_CHANNELS, BlogSocialChannel} from '../../../../features/blog/models/blog-social-promotion.model';
import {BlogPost} from '../../../../features/blog/models/blog-post.model';
import {
  PUBLISHING_CALENDAR_FILTERS,
  PUBLISHING_CALENDAR_WEEKDAYS,
  PublishingCalendarDay,
  PublishingCalendarEvent,
  PublishingCalendarFilter,
} from './publishing-calendar.utils';

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit'});

interface CalendarChannelOption {
  id: BlogSocialChannel;
  label: string;
  icon: IconDefinition;
}

const calendarChannelOptions: readonly CalendarChannelOption[] = [
  {id: 'notify', label: 'Notify', icon: faBell},
  {id: 'youtube', label: 'YouTube', icon: faYoutube},
  {id: 'facebook', label: 'Facebook', icon: faFacebookF},
  {id: 'instagram', label: 'Instagram', icon: faInstagram},
  {id: 'threads', label: 'Threads', icon: faThreads},
  {id: 'x', label: 'X (Twitter)', icon: faXTwitter},
  {id: 'linkedin', label: 'LinkedIn', icon: faLinkedinIn},
];
const calendarChannelOptionsById = new Map(calendarChannelOptions.map(option => [option.id, option]));

@Component({
  selector: 'app-publishing-calendar-month',
  imports: [FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="min-w-0" aria-label="Monthly publishing calendar">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-4 py-4 sm:px-5">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900"
            (click)="todaySelected.emit()"
          >
            Today
          </button>
          <button
            type="button"
            class="grid h-10 w-10 place-items-center border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900"
            aria-label="Previous month"
            (click)="previousMonthSelected.emit()"
          >
            <fa-icon [icon]="faChevronLeft" aria-hidden="true"></fa-icon>
          </button>
          <h2 class="min-w-40 px-2 text-xl font-semibold text-zinc-50 sm:text-2xl">{{ monthLabel }}</h2>
          <button
            type="button"
            class="grid h-10 w-10 place-items-center border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900"
            aria-label="Next month"
            (click)="nextMonthSelected.emit()"
          >
            <fa-icon [icon]="faChevronRight" aria-hidden="true"></fa-icon>
          </button>
        </div>

        @if (showFilters) {
          <div class="flex overflow-x-auto border border-zinc-700" aria-label="Calendar filters">
            @for (filterOption of calendarFilters; track filterOption.value) {
              <button
                type="button"
                [class]="filterButtonClass(filterOption.value)"
                [attr.aria-pressed]="activeFilter === filterOption.value"
                (click)="filterSelected.emit(filterOption.value)"
              >
                {{ filterOption.label }}
              </button>
            }
          </div>
        }
      </div>

      <div class="overflow-x-auto">
        <div [class]="compact ? 'min-w-[700px]' : 'min-w-[780px]'">
          <div class="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/60">
            @for (weekday of weekdayLabels; track weekday) {
              <div class="border-r border-zinc-800 px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 last:border-r-0">
                {{ weekday }}
              </div>
            }
          </div>

          <div class="grid grid-cols-7">
            @for (day of days; track day.dateKey) {
              <div [class]="dayCellClass(day)">
                <button
                  type="button"
                  [class]="dayNumberClass(day)"
                  [attr.aria-label]="dayAriaLabel(day)"
                  (click)="daySelected.emit(day)"
                >
                  {{ day.dayNumber }}
                </button>

                <span class="mt-2 grid gap-1.5 text-left">
                  @for (calendarEvent of day.events.slice(0, compact ? 2 : 3); track calendarEvent.id) {
                    <button
                      type="button"
                      [class]="eventClass(calendarEvent)"
                      (click)="selectEvent(calendarEvent, $event)"
                    >
                      <span class="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
                        <span [class]="eventDotClass(calendarEvent)"></span>
                        {{ eventTime(calendarEvent) }}
                      </span>
                      <span class="mt-1 block truncate text-xs font-medium text-zinc-100">
                        {{ eventTitle(calendarEvent) }}
                      </span>
                      @if (calendarEvent.type === 'post') {
                        <span class="mt-1 flex min-h-4 items-center gap-1.5 text-[10px] text-zinc-500">
                          @for (channel of postChannels(calendarEvent.post).slice(0, 4); track channel.id) {
                            <fa-icon [icon]="channel.icon" [title]="channel.label"></fa-icon>
                          }
                        </span>
                      } @else if (calendarEvent.announcement; as announcement) {
                        <span class="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500">
                          <fa-icon [icon]="channelOption(announcement.channel).icon" aria-hidden="true"></fa-icon>
                          {{ channelOption(announcement.channel).label }}
                        </span>
                      }
                    </button>
                  }
                  @if (day.events.length > (compact ? 2 : 3)) {
                    <span class="px-1 text-[10px] font-medium text-cyan-300">
                      +{{ day.events.length - (compact ? 2 : 3) }} more
                    </span>
                  }
                </span>
              </div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PublishingCalendarMonthComponent {
  @Input({required: true}) monthLabel = '';
  @Input({required: true}) days: readonly PublishingCalendarDay[] = [];
  @Input({required: true}) selectedDateKey = '';
  @Input() selectedEventId: string | null = null;
  @Input() activeFilter: PublishingCalendarFilter = 'all';
  @Input() showFilters = true;
  @Input() compact = false;

  @Output() todaySelected = new EventEmitter<void>();
  @Output() previousMonthSelected = new EventEmitter<void>();
  @Output() nextMonthSelected = new EventEmitter<void>();
  @Output() filterSelected = new EventEmitter<PublishingCalendarFilter>();
  @Output() daySelected = new EventEmitter<PublishingCalendarDay>();
  @Output() eventSelected = new EventEmitter<PublishingCalendarEvent>();

  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faChevronRight = faChevronRight;
  protected readonly calendarFilters = PUBLISHING_CALENDAR_FILTERS;
  protected readonly weekdayLabels = PUBLISHING_CALENDAR_WEEKDAYS;

  protected filterButtonClass(filter: PublishingCalendarFilter): string {
    const base = 'whitespace-nowrap border-r border-zinc-700 px-3 py-2 text-xs font-medium last:border-r-0';
    return this.activeFilter === filter
      ? `${base} bg-cyan-400 text-zinc-950`
      : `${base} text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100`;
  }

  protected dayCellClass(day: PublishingCalendarDay): string {
    const selected = day.dateKey === this.selectedDateKey;
    const height = this.compact ? 'min-h-28' : 'min-h-36';
    const base = `${height} border-b border-r border-zinc-800 p-2 text-left align-top transition last:border-r-0 hover:bg-zinc-900/70`;
    const currentMonth = day.isCurrentMonth ? 'bg-zinc-950' : 'bg-zinc-950/40 text-zinc-700';
    return selected ? `${base} ${currentMonth} ring-1 ring-inset ring-cyan-400` : `${base} ${currentMonth}`;
  }

  protected dayNumberClass(day: PublishingCalendarDay): string {
    if (day.isToday) {
      return 'inline-grid h-6 w-6 place-items-center bg-cyan-400 text-xs font-semibold text-zinc-950';
    }

    return day.isCurrentMonth ? 'text-xs font-medium text-zinc-300' : 'text-xs text-zinc-700';
  }

  protected dayAriaLabel(day: PublishingCalendarDay): string {
    return `${longDateFormatter.format(day.date)}, ${day.events.length} calendar item${day.events.length === 1 ? '' : 's'}`;
  }

  protected eventClass(calendarEvent: PublishingCalendarEvent): string {
    const selected = calendarEvent.id === this.selectedEventId;
    const base = 'block w-full overflow-hidden border px-2 py-1.5 text-left transition';
    const palette = calendarEvent.type === 'social'
      ? 'border-violet-500/40 bg-violet-500/10 hover:border-violet-400'
      : calendarEvent.post.status === 'published'
        ? 'border-emerald-500/35 bg-emerald-500/10 hover:border-emerald-400'
        : 'border-cyan-500/40 bg-cyan-500/10 hover:border-cyan-400';
    return selected ? `${base} ${palette} ring-1 ring-cyan-300` : `${base} ${palette}`;
  }

  protected eventDotClass(calendarEvent: PublishingCalendarEvent): string {
    if (calendarEvent.type === 'social') {
      return 'inline-block h-2 w-2 shrink-0 rounded-full bg-violet-400';
    }

    return calendarEvent.post.status === 'published'
      ? 'inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-400'
      : 'inline-block h-2 w-2 shrink-0 rounded-full bg-cyan-400';
  }

  protected eventTime(calendarEvent: PublishingCalendarEvent): string {
    return timeFormatter.format(new Date(calendarEvent.timestamp));
  }

  protected eventTitle(calendarEvent: PublishingCalendarEvent): string {
    const channel = calendarEvent.announcement?.channel;
    return calendarEvent.type === 'social' && channel
      ? `${this.channelOption(channel).label}: ${calendarEvent.post.title}`
      : calendarEvent.post.title;
  }

  protected channelOption(channel: BlogSocialChannel): CalendarChannelOption {
    return calendarChannelOptionsById.get(channel) ?? calendarChannelOptions[0];
  }

  protected postChannels(post: BlogPost): readonly CalendarChannelOption[] {
    const channels = new Set(
      (post.socialPromotion?.announcements ?? [])
        .filter(announcement => announcement.status !== 'cancelled')
        .map(announcement => announcement.channel)
    );
    return BLOG_SOCIAL_CHANNELS
      .filter(channel => channels.has(channel))
      .map(channel => this.channelOption(channel));
  }

  protected selectEvent(calendarEvent: PublishingCalendarEvent, domEvent: Event): void {
    domEvent.stopPropagation();
    this.eventSelected.emit(calendarEvent);
  }
}
