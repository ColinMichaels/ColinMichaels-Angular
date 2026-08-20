import {ChangeDetectionStrategy, Component, computed, signal} from '@angular/core';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faApple, faSpotify} from '@fortawesome/free-brands-svg-icons';

import {COLIN_MUSIC_CREDIT_COUNT, COLIN_MUSIC_CREDITS, MusicCredit} from './music-credits.data';

type CreditFilter = 'all' | 'mixing-engineering' | 'production-arrangement';

interface CreditFilterOption {
  id: CreditFilter;
  label: string;
}

const INITIAL_CREDIT_COUNT = 6;

const creditFilters: readonly CreditFilterOption[] = [
  {id: 'all', label: 'All credits'},
  {id: 'mixing-engineering', label: 'Mixing & engineering'},
  {id: 'production-arrangement', label: 'Production & arrangement'},
];

@Component({
  selector: 'app-music-credits',
  standalone: true,
  imports: [FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="music-credits-heading" class="border-y border-neutral-300 py-8 sm:py-10">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:items-start">
        <div class="max-w-xl">
          <p class="text-sm uppercase tracking-[0.28em] text-neutral-500">Music</p>
          <h2 id="music-credits-heading" class="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            Studio credits
          </h2>
          <p class="mt-4 text-base leading-8 text-neutral-700">
            Before I made software my main focus, I spent years working in recording studios on albums across Latin,
            hip-hop, pop, and reggae. This is a working list of {{ creditCount }} album credits.
          </p>
        </div>

        <div>
          <div class="flex flex-col gap-4 border-b border-neutral-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div class="flex flex-wrap gap-2" aria-label="Filter music credits">
              @for (filter of filters; track filter.id) {
                <button
                  type="button"
                  class="border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100"
                  [class.border-cyan-700]="selectedFilter() === filter.id"
                  [class.bg-cyan-700]="selectedFilter() === filter.id"
                  [class.text-white]="selectedFilter() === filter.id"
                  [class.border-neutral-300]="selectedFilter() !== filter.id"
                  [class.bg-white]="selectedFilter() !== filter.id"
                  [class.text-neutral-800]="selectedFilter() !== filter.id"
                  [attr.aria-pressed]="selectedFilter() === filter.id"
                  (click)="setFilter(filter.id)"
                >
                  {{ filter.label }}
                </button>
              }
            </div>
            <label class="block sm:w-64">
              <span class="sr-only">Search music credits</span>
              <input
                type="search"
                class="w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-500 focus:border-cyan-700 focus:ring-2 focus:ring-cyan-600/25"
                placeholder="Search credits"
                [value]="searchQuery()"
                (input)="setSearchQuery($any($event.target).value)"
              >
            </label>
          </div>

          <p class="mt-4 text-sm text-neutral-600" aria-live="polite">
            Showing {{ visibleCredits().length }} of {{ filteredCredits().length }} credits
          </p>

          @if (visibleCredits().length > 0) {
            <ol class="mt-4 divide-y divide-neutral-300 border-y border-neutral-300">
              @for (credit of visibleCredits(); track trackCredit($index, credit)) {
                <li class="grid gap-3 py-5 sm:grid-cols-[4.75rem_minmax(0,1fr)_auto] sm:items-start sm:gap-5">
                  <p class="text-sm font-semibold tabular-nums text-cyan-800">
                    {{ credit.year || '—' }}
                  </p>
                  <div class="min-w-0">
                    <h3 class="text-lg font-semibold leading-7 text-neutral-950">{{ credit.album }}</h3>
                    <p class="mt-1 text-sm leading-6 text-neutral-700">{{ credit.artist || 'Artist not listed' }}</p>
                    <p class="mt-2 text-sm font-medium leading-6 text-neutral-600">{{ credit.credit }}</p>
                  </div>
                  <div class="flex flex-wrap gap-2 sm:justify-end">
                    <a
                      [href]="credit.spotifyUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="group relative inline-flex h-10 w-10 items-center justify-center border border-neutral-300 bg-white text-lg text-[#1DB954] transition hover:border-[#1DB954] hover:bg-[#1DB954]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100"
                      [attr.aria-label]="'Find ' + credit.album + ' on Spotify'"
                      title="Spotify"
                    >
                      <fa-icon [icon]="faSpotify" aria-hidden="true"></fa-icon>
                      <span
                        role="tooltip"
                        class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        Spotify
                      </span>
                    </a>
                    <a
                      [href]="credit.appleMusicUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="group relative inline-flex h-10 w-10 items-center justify-center border border-neutral-300 bg-white text-lg text-neutral-950 transition hover:border-rose-500 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100"
                      [attr.aria-label]="'Find ' + credit.album + ' on Apple Music'"
                      title="Apple Music"
                    >
                      <fa-icon [icon]="faApple" aria-hidden="true"></fa-icon>
                      <span
                        role="tooltip"
                        class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        Apple Music
                      </span>
                    </a>
                  </div>
                </li>
              }
            </ol>

            @if (filteredCredits().length > visibleCredits().length) {
              <button
                type="button"
                class="mt-5 border border-neutral-950 bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100"
                [attr.aria-expanded]="showingAll()"
                (click)="showAllCredits()"
              >
                Show all {{ filteredCredits().length }} credits
              </button>
            } @else if (showingAll() && filteredCredits().length > initialCreditCount) {
              <button
                type="button"
                class="mt-5 text-sm font-semibold text-cyan-800 underline decoration-cyan-700/40 underline-offset-4 transition hover:text-cyan-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
                (click)="showFewerCredits()"
              >
                Show fewer credits
              </button>
            }
          } @else {
            <p class="mt-4 border-y border-neutral-300 py-8 text-base leading-7 text-neutral-700">
              No credits match that search. Try a different album, artist, role, or year.
            </p>
          }
        </div>
      </div>
    </section>
  `,
})
export class MusicCreditsComponent {
  protected readonly faApple = faApple;
  protected readonly faSpotify = faSpotify;
  protected readonly creditCount = COLIN_MUSIC_CREDIT_COUNT;
  protected readonly filters = creditFilters;
  protected readonly initialCreditCount = INITIAL_CREDIT_COUNT;
  protected readonly selectedFilter = signal<CreditFilter>('all');
  protected readonly searchQuery = signal('');
  protected readonly showingAll = signal(false);
  protected readonly filteredCredits = computed(() => {
    const filter = this.selectedFilter();
    const query = this.searchQuery().trim().toLocaleLowerCase();

    return COLIN_MUSIC_CREDITS.filter(credit => this.matchesFilter(credit, filter) && this.matchesQuery(credit, query));
  });
  protected readonly visibleCredits = computed(() => (
    this.showingAll() ? this.filteredCredits() : this.filteredCredits().slice(0, INITIAL_CREDIT_COUNT)
  ));

  protected setFilter(filter: CreditFilter): void {
    this.selectedFilter.set(filter);
    this.showingAll.set(false);
  }

  protected setSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.showingAll.set(false);
  }

  protected showAllCredits(): void {
    this.showingAll.set(true);
  }

  protected showFewerCredits(): void {
    this.showingAll.set(false);
  }

  protected trackCredit(index: number, credit: MusicCredit): string {
    return `${credit.year}-${credit.album}-${credit.artist}-${index}`;
  }

  private matchesFilter(credit: MusicCredit, filter: CreditFilter): boolean {
    const normalizedRole = credit.credit.toLocaleLowerCase();

    if (filter === 'mixing-engineering') {
      return /mix|engineer|recording|overdub/.test(normalizedRole);
    }

    if (filter === 'production-arrangement') {
      return /production|arrang/.test(normalizedRole);
    }

    return true;
  }

  private matchesQuery(credit: MusicCredit, query: string): boolean {
    if (!query) {
      return true;
    }

    return [credit.year, credit.album, credit.artist, credit.credit]
      .some(value => value.toLocaleLowerCase().includes(query));
  }
}
