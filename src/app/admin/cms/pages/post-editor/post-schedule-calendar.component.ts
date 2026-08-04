import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal} from '@angular/core';

import {BlogPost} from '../../../../features/blog/models/blog-post.model';
import {PublishingCalendarMonthComponent} from '../publishing-calendar/publishing-calendar-month.component';
import {
  PublishingCalendarDay,
  PublishingCalendarEvent,
  createPublishingCalendarDays,
  createPublishingCalendarEvents,
  startOfPublishingMonth,
  toPublishingDateKey,
} from '../publishing-calendar/publishing-calendar.utils';

interface SuggestedPublishingSlot {
  value: string;
  label: string;
  available: boolean;
  reason: string;
}

const SUGGESTED_PUBLISHING_HOURS = [9, 12, 15, 18] as const;
const monthFormatter = new Intl.DateTimeFormat('en-US', {month: 'long', year: 'numeric'});
const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit'});
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateTimeLocalValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

@Component({
  selector: 'app-post-schedule-calendar',
  imports: [PublishingCalendarMonthComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="overflow-hidden border border-cyan-400/35 bg-zinc-950" aria-label="Post schedule availability">
      <header class="border-b border-zinc-800 bg-cyan-400/5 px-4 py-3">
        <h3 class="text-sm font-semibold text-zinc-100">Find an open publishing slot</h3>
        <p class="mt-1 text-xs leading-5 text-zinc-500">
          This is the same monthly post schedule used by Publishing Calendar. Select a day, review other scheduled posts, then choose an open suggested time.
        </p>
      </header>

      <app-publishing-calendar-month
        [monthLabel]="monthLabel()"
        [days]="calendarDays()"
        [selectedDateKey]="selectedDateKey()"
        [showFilters]="false"
        [compact]="true"
        (todaySelected)="goToToday()"
        (previousMonthSelected)="goToPreviousMonth()"
        (nextMonthSelected)="goToNextMonth()"
        (daySelected)="selectDay($event)"
        (eventSelected)="selectEvent($event)"
      ></app-publishing-calendar-month>

      <div class="grid gap-4 border-t border-zinc-800 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <section class="space-y-3" aria-label="Selected day schedule">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Selected day</p>
            <h4 class="mt-1 text-base font-semibold text-zinc-100">{{ selectedDateLabel() }}</h4>
          </div>

          <div class="divide-y divide-zinc-800 border border-zinc-800">
            @for (calendarEvent of selectedDayEvents(); track calendarEvent.id) {
              <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 py-2.5">
                <span class="text-xs font-medium tabular-nums text-cyan-300">{{ eventTime(calendarEvent) }}</span>
                <span class="truncate text-xs text-zinc-300">{{ calendarEvent.post.title }}</span>
              </div>
            } @empty {
              <p class="px-3 py-4 text-sm text-emerald-300">No other posts are scheduled on this day.</p>
            }
          </div>
        </section>

        <section class="space-y-3" aria-label="Suggested open publishing times">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Suggested times</p>
            <p class="mt-1 text-xs leading-5 text-zinc-600">Times already occupied by another scheduled post are unavailable.</p>
          </div>

          <div class="grid grid-cols-2 gap-2">
            @for (slot of suggestedSlots(); track slot.value) {
              <button
                type="button"
                class="border px-3 py-2.5 text-left disabled:cursor-not-allowed"
                [class.border-cyan-400]="slot.available"
                [class.text-cyan-200]="slot.available"
                [class.hover:bg-cyan-400]="slot.available"
                [class.hover:text-zinc-950]="slot.available"
                [class.border-zinc-800]="!slot.available"
                [class.bg-zinc-900]="!slot.available"
                [class.text-zinc-600]="!slot.available"
                [disabled]="!slot.available"
                [attr.aria-label]="slot.label + ', ' + slot.reason"
                (click)="applySlot(slot)"
              >
                <span class="block text-sm font-semibold">{{ slot.label }}</span>
                <span class="mt-0.5 block text-[10px] uppercase tracking-wide">{{ slot.reason }}</span>
              </button>
            }
          </div>
        </section>
      </div>

      @if (selectedValueLabel(); as selectedLabel) {
        <p class="border-t border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200" role="status">
          Current publish date: {{ selectedLabel }}
        </p>
      }
    </section>
  `,
})
export class PostScheduleCalendarComponent {
  private readonly today = new Date();
  private readonly postsSignal = signal<readonly BlogPost[]>([]);
  private readonly currentPostIdSignal = signal('');
  private readonly selectedValue = signal('');

  @Input()
  set posts(value: readonly BlogPost[]) {
    this.postsSignal.set(value);
  }

  @Input()
  set currentPostId(value: string) {
    this.currentPostIdSignal.set(value);
  }

  @Input()
  set value(value: string) {
    this.selectedValue.set(value);
    const date = new Date(value);

    if (value && Number.isFinite(date.getTime())) {
      this.selectedDateKey.set(toPublishingDateKey(date));
      this.viewMonth.set(startOfPublishingMonth(date));
    }
  }

  @Output() valueChange = new EventEmitter<string>();

  protected readonly viewMonth = signal(startOfPublishingMonth(this.today));
  protected readonly selectedDateKey = signal(toPublishingDateKey(this.today));
  protected readonly monthLabel = computed(() => monthFormatter.format(this.viewMonth()));
  protected readonly calendarEvents = computed(() => createPublishingCalendarEvents(
    this.postsSignal().filter(post => post.id !== this.currentPostIdSignal())
  ).filter(calendarEvent => calendarEvent.type === 'post' && calendarEvent.post.status === 'scheduled'));
  protected readonly calendarDays = computed(() => createPublishingCalendarDays(
    this.viewMonth(),
    this.calendarEvents(),
    this.today
  ));
  protected readonly selectedDayEvents = computed(() => this.calendarEvents()
    .filter(calendarEvent => calendarEvent.dateKey === this.selectedDateKey())
    .sort((left, right) => left.timestamp - right.timestamp));
  protected readonly selectedDateLabel = computed(() => longDateFormatter.format(dateFromKey(this.selectedDateKey())));
  protected readonly selectedValueLabel = computed(() => {
    const selectedValue = this.selectedValue();
    const date = new Date(selectedValue);
    return selectedValue && Number.isFinite(date.getTime()) ? dateTimeFormatter.format(date) : '';
  });
  protected readonly suggestedSlots = computed<readonly SuggestedPublishingSlot[]>(() => {
    const selectedDate = dateFromKey(this.selectedDateKey());
    const occupiedEvents = this.selectedDayEvents();

    return SUGGESTED_PUBLISHING_HOURS.map(hour => {
      const date = new Date(selectedDate);
      date.setHours(hour, 0, 0, 0);
      const occupied = occupiedEvents.find(calendarEvent => {
        const eventDate = new Date(calendarEvent.timestamp);
        return eventDate.getHours() === hour && eventDate.getMinutes() === 0;
      });
      const isPast = date.getTime() <= Date.now();
      const available = !occupied && !isPast;
      return {
        value: toDateTimeLocalValue(date),
        label: timeFormatter.format(date),
        available,
        reason: occupied ? `Used by ${occupied.post.title}` : isPast ? 'Past time' : 'Open',
      };
    });
  });

  protected goToToday(): void {
    this.viewMonth.set(startOfPublishingMonth(this.today));
    this.selectedDateKey.set(toPublishingDateKey(this.today));
  }

  protected goToPreviousMonth(): void {
    const current = this.viewMonth();
    const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.viewMonth.set(previous);
    this.selectedDateKey.set(toPublishingDateKey(previous));
  }

  protected goToNextMonth(): void {
    const current = this.viewMonth();
    const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.viewMonth.set(next);
    this.selectedDateKey.set(toPublishingDateKey(next));
  }

  protected selectDay(day: PublishingCalendarDay): void {
    this.selectedDateKey.set(day.dateKey);

    if (!day.isCurrentMonth) {
      this.viewMonth.set(startOfPublishingMonth(day.date));
    }
  }

  protected selectEvent(calendarEvent: PublishingCalendarEvent): void {
    this.selectedDateKey.set(calendarEvent.dateKey);
  }

  protected eventTime(calendarEvent: PublishingCalendarEvent): string {
    return timeFormatter.format(new Date(calendarEvent.timestamp));
  }

  protected applySlot(slot: SuggestedPublishingSlot): void {
    if (!slot.available) {
      return;
    }

    this.selectedValue.set(slot.value);
    this.valueChange.emit(slot.value);
  }
}
