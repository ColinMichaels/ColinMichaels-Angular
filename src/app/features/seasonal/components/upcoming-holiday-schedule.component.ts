import {ChangeDetectionStrategy, Component, computed, inject, InjectionToken, signal} from '@angular/core';

import {SEASONAL_EDITIONS} from '../seasonal.catalog';
import {seasonalDateKey} from '../seasonal.config';

/** Presentation only; article access always comes from the trusted server. */
export const HOLIDAY_CALENDAR_TODAY = new InjectionToken<() => string | null>('HOLIDAY_CALENDAR_TODAY', {
  providedIn: 'root', factory: () => () => seasonalDateKey(new Date()),
});

/** Public celebration teasers; these dates never grant access to an article. */
@Component({
  selector: 'app-upcoming-holiday-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../pages/seasonal-archive.scss',
  template: `
    <section class="seasonal-holiday-schedule" aria-labelledby="holiday-calendar-heading" data-testid="holiday-calendar">
      <header class="seasonal-year-heading">
        <p class="site-meta">A little wonder, all year</p>
        <h2 id="holiday-calendar-heading" class="heading-section">On the holiday calendar</h2>
        <p class="text-body">Celebrations to look forward to. Article release dates appear with each announced post.</p>
      </header>
      <div class="seasonal-archive-filter">
        <label class="sr-only" for="holiday-schedule-search">Find a holiday</label>
        <input id="holiday-schedule-search" type="search" placeholder="Find a holiday" [value]="query()" (input)="query.set($any($event.target).value)">
        <p class="site-meta" aria-live="polite">{{ matches().length }} {{ matches().length === 1 ? 'celebration' : 'celebrations' }}</p>
      </div>
      <div class="seasonal-archive-list">
        @for (edition of visible(); track edition.id; let first = $first) {
          <article class="seasonal-archive-row" [attr.data-holiday-id]="edition.id">
            <div class="seasonal-archive-art">
              <img [src]="edition.heroSrc" width="1536" height="1024" alt=""
                [attr.loading]="first ? 'eager' : 'lazy'" decoding="async">
            </div>
            <div class="seasonal-archive-copy">
              <h3>{{ edition.titleLine1 }} {{ edition.titleLine2 }} <span>· {{ edition.year }}</span></h3>
              <p>{{ edition.holidayLabel }}</p>
            </div>
            <div class="seasonal-archive-action seasonal-holiday-status">
              <p class="site-meta">Planned celebration</p>
              <p class="seasonal-holiday-window">{{ edition.displayStart ? edition.dateLabel : 'Dates to be confirmed' }}</p>
            </div>
          </article>
        }
      </div>
      @if (!matches().length) {
        <p class="text-body py-8">No holidays found. Try a celebration name or year.</p>
      }
      @if (!query() && matches().length > visible().length) {
        <button class="site-inline-link seasonal-holiday-more" type="button" (click)="expanded.set(true)">Show the full holiday calendar <span aria-hidden="true">↓</span></button>
      }
      <p class="seasonal-archive-footnote text-body">Celebration plans can change. Upcoming posts open when they publish; eligible members can read during an announced early-access window.</p>
    </section>
  `,
})
export class UpcomingHolidayScheduleComponent {
  private readonly today = inject(HOLIDAY_CALENDAR_TODAY);
  protected readonly query = signal('');
  protected readonly expanded = signal(false);
  protected readonly matches = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return [...SEASONAL_EDITIONS]
      .filter(edition => !query || [edition.holidayLabel, edition.year, edition.titleLine1, edition.titleLine2]
        .join(' ').toLocaleLowerCase().includes(query))
      .sort((left, right) => (left.displayStart || '9999').localeCompare(right.displayStart || '9999') || left.id.localeCompare(right.id));
  });
  protected readonly visible = computed(() => {
    if (this.expanded() || this.query()) { return this.matches(); }
    const today = this.today();
    return this.matches().filter(edition => !today || !edition.displayEnd || edition.displayEnd >= today).slice(0, 7);
  });
}
