import {DOCUMENT} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faArrowUpRightFromSquare,
  faCheck,
  faCopy,
  faMagnifyingGlass,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {AuthService} from '../../services/auth.service';
import {ADMIN_CONSOLE_ROLES, USER_ROLE_DEFINITIONS} from '../../shared/user-account/user-account.model';
import {
  ADMIN_GUIDE_CATEGORIES,
  ADMIN_GUIDE_ENTRIES,
  searchAdminGuideEntries,
} from './admin-guide.content';
import {AdminGuideEntry} from './admin-guide.models';

@Component({
  selector: 'app-admin-guide-page',
  imports: [FaIconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-[calc(100vh-4rem)] bg-zinc-950 px-5 py-8 text-zinc-100 sm:px-8 lg:px-10 xl:px-12">
      <div class="mx-auto max-w-[92rem]">
        <header class="border-b border-zinc-800 pb-7">
          <h1 class="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">Admin Guide</h1>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            Find the workflow, jump to the right tool, and keep the site moving.
          </p>

          <div class="mt-6 max-w-4xl">
            <label for="admin-guide-search" class="sr-only">Search admin instructions</label>
            <div class="flex min-h-12 items-center border border-zinc-700 bg-zinc-950 focus-within:border-cyan-300">
              <fa-icon [icon]="faMagnifyingGlass" class="ml-4 text-sm text-zinc-500" aria-hidden="true"></fa-icon>
              <input
                #searchInput
                id="admin-guide-search"
                type="search"
                class="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                placeholder="Search instructions, tools, and tasks"
                autocomplete="off"
                [value]="query()"
                (input)="setQuery($event)"
              >
              @if (query()) {
                <button
                  type="button"
                  class="grid h-9 w-9 shrink-0 place-items-center text-zinc-500 hover:text-zinc-100"
                  aria-label="Clear guide search"
                  (click)="clearSearch()"
                >
                  <fa-icon [icon]="faXmark" aria-hidden="true"></fa-icon>
                </button>
              }
              <span class="mr-3 hidden border border-zinc-700 px-2 py-1 text-[10px] font-semibold text-zinc-500 sm:inline">/</span>
            </div>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500" aria-live="polite">
              <span>{{ roleContext() }}</span>
              <span>{{ resultSummary() }}</span>
            </div>
          </div>
        </header>

        <div class="grid gap-8 pt-7 lg:grid-cols-[15rem_minmax(0,1fr)] xl:gap-12">
          <aside class="hidden lg:block" aria-label="Guide table of contents">
            <nav class="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto border-r border-zinc-800 pr-5">
              <p class="pb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">In this guide</p>
              <div class="space-y-6">
                @for (category of visibleCategories(); track category.id) {
                  <section>
                    <h2 class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{{ category.label }}</h2>
                    <div class="mt-2 grid gap-1">
                      @for (entry of category.entries; track entry.id) {
                        <a
                          [routerLink]="[]"
                          [fragment]="entry.id"
                          class="border-l-2 px-3 py-2 text-sm leading-5 transition"
                          [class.border-cyan-300]="selectedGuideId() === entry.id"
                          [class.bg-cyan-400/5]="selectedGuideId() === entry.id"
                          [class.text-cyan-200]="selectedGuideId() === entry.id"
                          [class.border-transparent]="selectedGuideId() !== entry.id"
                          [class.text-zinc-400]="selectedGuideId() !== entry.id"
                          [class.hover:border-zinc-600]="selectedGuideId() !== entry.id"
                          [class.hover:text-zinc-100]="selectedGuideId() !== entry.id"
                          (click)="selectGuide(entry.id)"
                        >
                          {{ entry.title }}
                        </a>
                      }
                    </div>
                  </section>
                }
              </div>
            </nav>
          </aside>

          <div class="min-w-0">
            @if (visibleEntries().length > 0) {
              <label class="mb-7 block lg:hidden">
                <span class="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Jump to instructions</span>
                <select
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  [value]="selectedGuideId()"
                  (change)="selectGuideFromMenu($event)"
                >
                  @for (category of visibleCategories(); track category.id) {
                    <optgroup [label]="category.label">
                      @for (entry of category.entries; track entry.id) {
                        <option [value]="entry.id">{{ entry.title }}</option>
                      }
                    </optgroup>
                  }
                </select>
              </label>

              @if (!query()) {
                <section class="border-b border-zinc-800 pb-8" aria-labelledby="admin-guide-start-heading">
                  <h2 id="admin-guide-start-heading" class="text-2xl font-semibold text-zinc-50">Start here</h2>
                  <p class="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                    This guide covers the editorial and operational tasks available to your account. Restricted workflows are omitted completely, so every instruction and destination shown here should be available to you.
                  </p>

                  @if (commonTasks().length > 0) {
                    <h3 class="mt-7 text-lg font-semibold text-zinc-100">Common tasks</h3>
                    <div class="mt-3 divide-y divide-zinc-800 border-y border-zinc-800">
                      @for (entry of commonTasks(); track entry.id) {
                        <a
                          [routerLink]="[]"
                          [fragment]="entry.id"
                          class="group flex items-start gap-3 py-3 text-sm"
                          (click)="selectGuide(entry.id)"
                        >
                          <fa-icon [icon]="faArrowRight" class="mt-1 text-[10px] text-zinc-600 group-hover:text-cyan-300" aria-hidden="true"></fa-icon>
                          <span>
                            <span class="font-semibold text-cyan-300 group-hover:text-cyan-200">{{ entry.title }}</span>
                            <span class="ml-2 text-zinc-500">— {{ entry.summary }}</span>
                          </span>
                        </a>
                      }
                    </div>
                  }
                </section>
              }

              <div class="divide-y divide-zinc-800">
                @for (entry of visibleEntries(); track entry.id; let index = $index) {
                  <article
                    [id]="entry.id"
                    class="scroll-mt-24 py-8 first:pt-8"
                    [attr.aria-labelledby]="entry.id + '-heading'"
                  >
                    <header class="flex items-start justify-between gap-4">
                      <div class="min-w-0">
                        <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                          {{ categoryLabel(entry) }}
                        </p>
                        <h2 [id]="entry.id + '-heading'" class="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
                          {{ query() ? '' : (index + 1) + '. ' }}{{ entry.title }}
                        </h2>
                      </div>
                      <button
                        type="button"
                        class="inline-flex min-h-9 shrink-0 items-center gap-2 border border-transparent px-2 text-xs font-semibold text-zinc-500 hover:border-zinc-700 hover:text-cyan-200 focus-visible:border-cyan-300 focus-visible:text-cyan-200"
                        [attr.aria-label]="'Copy link to ' + entry.title"
                        (click)="copyGuideLink(entry.id)"
                      >
                        <fa-icon [icon]="copiedGuideId() === entry.id ? faCheck : faCopy" aria-hidden="true"></fa-icon>
                        <span class="hidden sm:inline">{{ copiedGuideId() === entry.id ? 'Copied' : 'Copy link' }}</span>
                      </button>
                    </header>

                    <p class="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">{{ entry.summary }}</p>

                    <ol class="mt-5 space-y-3 pl-5 text-sm leading-6 text-zinc-300 marker:font-semibold marker:text-zinc-600">
                      @for (step of entry.steps; track step.text) {
                        <li class="pl-2">
                          {{ step.text }}
                          @if (step.link) {
                            <a [routerLink]="step.link.route" class="ml-1 inline-flex items-center gap-1 font-semibold text-cyan-300 hover:text-cyan-200">
                              {{ step.link.label }}
                              <fa-icon [icon]="faArrowUpRightFromSquare" class="text-[9px]" aria-hidden="true"></fa-icon>
                            </a>
                          }
                        </li>
                      }
                    </ol>

                    @if (entry.links.length > 0) {
                      <div class="mt-6 flex flex-wrap gap-2" aria-label="Related admin tools">
                        @for (link of entry.links; track link.route) {
                          <a
                            [routerLink]="link.route"
                            class="inline-flex min-h-9 items-center gap-2 border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-cyan-400 hover:text-cyan-200"
                          >
                            {{ link.label }}
                            <fa-icon [icon]="faArrowRight" class="text-[10px]" aria-hidden="true"></fa-icon>
                          </a>
                        }
                      </div>
                    }
                  </article>
                }
              </div>
            } @else {
              <section class="border border-dashed border-zinc-800 px-5 py-12 text-center" aria-live="polite">
                <fa-icon [icon]="faMagnifyingGlass" class="text-2xl text-zinc-700" aria-hidden="true"></fa-icon>
                <h2 class="mt-4 text-xl font-semibold text-zinc-100">No instructions found</h2>
                <p class="mt-2 text-sm text-zinc-500">Try a tool name, action, status, or workflow such as “schedule”, “media”, or “draft”.</p>
                <button type="button" class="mt-5 border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950" (click)="clearSearch()">
                  Clear search
                </button>
              </section>
            }
          </div>
        </div>
      </div>
    </main>
  `,
})
export class AdminGuidePageComponent {
  private readonly authService = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly faArrowRight = faArrowRight;
  protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
  protected readonly faCheck = faCheck;
  protected readonly faCopy = faCopy;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faXmark = faXmark;
  protected readonly query = signal('');
  protected readonly selectedGuideId = signal('');
  protected readonly copiedGuideId = signal<string | null>(null);
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly profile = toSignal(this.authService.getCurrentUserProfile(), {initialValue: null});
  private readonly fragment = toSignal(this.route.fragment, {initialValue: null});
  protected readonly currentRoles = computed(() => this.profile()?.roles ?? []);
  protected readonly visibleEntries = computed(() => searchAdminGuideEntries(
    ADMIN_GUIDE_ENTRIES,
    this.currentRoles(),
    this.query()
  ));
  protected readonly commonTasks = computed(() => this.visibleEntries().filter(entry => entry.featured).slice(0, 5));
  protected readonly visibleCategories = computed(() => ADMIN_GUIDE_CATEGORIES
    .map(category => ({
      ...category,
      entries: this.visibleEntries().filter(entry => entry.category === category.id),
    }))
    .filter(category => category.entries.length > 0));
  protected readonly roleContext = computed(() => {
    const roleLabels = USER_ROLE_DEFINITIONS
      .filter(role => ADMIN_CONSOLE_ROLES.includes(role.id) && this.currentRoles().includes(role.id))
      .map(role => role.label);

    return roleLabels.length > 0
      ? `Showing guidance for ${roleLabels.join(', ')} access.`
      : 'Showing guidance for your access.';
  });
  protected readonly resultSummary = computed(() => {
    const count = this.visibleEntries().length;
    return `${count} ${count === 1 ? 'guide' : 'guides'}${this.query() ? ' found' : ' available'}`;
  });
  private readonly syncSelectedGuide = effect(() => {
    const fragment = this.fragment();
    const entries = this.visibleEntries();
    const selectedId = fragment && entries.some(entry => entry.id === fragment) ? fragment : entries[0]?.id ?? '';
    this.selectedGuideId.set(selectedId);
    if (fragment && selectedId) {
      setTimeout(() => this.document.getElementById(selectedId)?.scrollIntoView({block: 'start'}));
    }
  });

  @HostListener('document:keydown', ['$event'])
  protected focusSearch(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

    if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      this.searchInput().nativeElement.focus();
    }
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  protected clearSearch(): void {
    this.query.set('');
    this.searchInput().nativeElement.focus();
  }

  protected selectGuide(id: string): void {
    this.selectedGuideId.set(id);
  }

  protected selectGuideFromMenu(event: Event): void {
    const id = (event.target as HTMLSelectElement | null)?.value;
    if (!id) return;

    this.selectGuide(id);
    void this.router.navigate([], {relativeTo: this.route, fragment: id});
  }

  protected categoryLabel(entry: AdminGuideEntry): string {
    return ADMIN_GUIDE_CATEGORIES.find(category => category.id === entry.category)?.label ?? 'Guide';
  }

  protected async copyGuideLink(id: string): Promise<void> {
    const url = this.router.serializeUrl(this.router.createUrlTree(
      ['/', PATH_NAMES.ADMIN, PATH_NAMES.ADMIN_GUIDE],
      {fragment: id}
    ));
    const absoluteUrl = `${globalThis.location?.origin ?? ''}${url}`;

    try {
      await globalThis.navigator?.clipboard?.writeText(absoluteUrl);
      this.copiedGuideId.set(id);
      if (this.copyResetTimer) clearTimeout(this.copyResetTimer);
      this.copyResetTimer = setTimeout(() => this.copiedGuideId.set(null), 2000);
    } catch {
      this.copiedGuideId.set(null);
    }
  }
}
