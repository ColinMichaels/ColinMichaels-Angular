import {ChangeDetectionStrategy, Component, computed, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {SEASONAL_EDITIONS} from '../seasonal.catalog';

@Component({
  selector: 'app-seasonal-archive',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './seasonal-archive.scss',
  template: `
    <section class="site-section seasonal-archive" aria-labelledby="seasonal-archive-title">
      <header class="seasonal-archive-intro">
        <p class="site-meta">A little wonder, all year</p>
        <h1 id="seasonal-archive-title" class="heading-display">Seasonal archive</h1>
        <p class="text-body">Small seasons. Small wonders. More reasons to explore.</p>
        <a routerLink="/schedule" class="site-inline-link seasonal-schedule-link">See what’s coming next <span aria-hidden="true">→</span></a>
      </header>
      <div class="seasonal-archive-filter">
        <label class="sr-only" for="seasonal-archive-search">Find a celebration</label>
        <input id="seasonal-archive-search" type="search" placeholder="Find a celebration" [value]="query()" (input)="query.set($any($event.target).value)">
        <p class="site-meta" aria-live="polite">{{ visibleEditions().length }} editions</p>
      </div>
      <div class="seasonal-archive-list">
        @for (edition of visibleEditions(); track edition.id; let first = $first; let index = $index) {
          @if (index === 7 && !query()) {
            <header class="seasonal-year-heading"><h2 class="heading-section">Around the year</h2><p class="text-body">More celebrations, with room to grow.</p></header>
          }
          <article class="seasonal-archive-row">
            <a class="seasonal-archive-art" [routerLink]="['/archive/seasons', edition.id]" tabindex="-1" aria-hidden="true">
              <img [src]="edition.heroSrc" width="1536" height="1024" alt=""
                [attr.loading]="first ? 'eager' : 'lazy'" decoding="async">
            </a>
            <div class="seasonal-archive-copy">
              <h2><a [routerLink]="['/archive/seasons', edition.id]">{{ edition.titleLine1 }} {{ edition.titleLine2 }} <span>· {{ edition.year }}</span></a></h2>
              <p>{{ edition.archiveDescription }}</p>
              @if (edition.preparationStatus === 'template') { <span class="seasonal-edition-status">Early edition</span> }
            </div>
            <div class="seasonal-archive-action">
              <p class="site-meta">{{ edition.holidayLabel }}</p>
              <a class="site-inline-link" [routerLink]="['/archive/seasons', edition.id]"
                [attr.aria-label]="'Explore ' + edition.holidayLabel + ' ' + edition.year">
                Explore edition <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        }
      </div>
      @if (!visibleEditions().length) { <p class="text-body py-8">No seasons found. Try a holiday name or year.</p> }
      <p class="seasonal-archive-footnote text-body">Revisit a season and its collection guide. Finds are earned by exploring the site while that season is active; each edition keeps its own progress.</p>
    </section>
  `,
})
export class SeasonalArchiveComponent {
  protected readonly query = signal('');
  protected readonly visibleEditions = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return SEASONAL_EDITIONS.filter(edition => !query || [edition.holidayLabel, edition.year, edition.titleLine1, edition.titleLine2]
      .join(' ').toLocaleLowerCase().includes(query));
  });
}
