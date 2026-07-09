import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faFacebookF, faInstagram, faLinkedinIn, faYoutube} from '@fortawesome/free-brands-svg-icons';
import {faBell, faChevronLeft, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {RouterLink} from '@angular/router';

import {
  BLOG_SOCIAL_CHANNELS,
  BlogSocialAnnouncement,
  BlogSocialChannel,
} from '../../../../features/blog/models/blog-social-promotion.model';
import {BlogPost, BlogPostStatus} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {SITE_URL} from '../../../../shared/seo/seo.metadata';
import {CmsToastContainerComponent} from '../../components/toast/cms-toast.component';
import {CmsToastService} from '../../services/cms-toast.service';

type PublishingCalendarFilter = 'all' | 'scheduled' | 'published' | 'social';

interface PublishingCalendarEvent {
  id: string;
  type: 'post' | 'social';
  timestamp: number;
  dateKey: string;
  post: BlogPost;
  announcement?: BlogSocialAnnouncement;
}

interface PublishingCalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: readonly PublishingCalendarEvent[];
}

interface SocialChannelOption {
  id: BlogSocialChannel;
  label: string;
  shortLabel: string;
  description: string;
  characterLimit: number;
  icon: IconDefinition;
}

interface SocialAnnouncementDraft extends SocialChannelOption {
  enabled: boolean;
  message: string;
  scheduledAt: string;
}

const calendarFilters: readonly {value: PublishingCalendarFilter; label: string}[] = [
  {value: 'all', label: 'All content'},
  {value: 'scheduled', label: 'Scheduled'},
  {value: 'published', label: 'Published'},
  {value: 'social', label: 'Social'},
];
const weekdayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const socialChannelOptions: readonly SocialChannelOption[] = [
  {
    id: 'notify',
    label: 'Notify',
    shortLabel: 'NT',
    description: 'Subscriber or in-app announcement',
    characterLimit: 1000,
    icon: faBell,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    shortLabel: 'YT',
    description: 'Channel announcement connector',
    characterLimit: 5000,
    icon: faYoutube,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    shortLabel: 'FB',
    description: 'Page post',
    characterLimit: 63206,
    icon: faFacebookF,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    shortLabel: 'IG',
    description: 'Caption for a linked media post',
    characterLimit: 2200,
    icon: faInstagram,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    shortLabel: 'IN',
    description: 'Profile or organization post',
    characterLimit: 3000,
    icon: faLinkedinIn,
  },
];
const channelOptionsById = new Map(socialChannelOptions.map(option => [option.id, option]));
const monthFormatter = new Intl.DateTimeFormat('en-US', {month: 'long', year: 'numeric'});
const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric'});
const timeFormatter = new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit'});

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addDays(value: Date, dayCount: number): Date {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + dayCount);
  return nextDate;
}

function toLocalDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDateTimeLocalValue(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function createAnnouncementId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `social-${crypto.randomUUID()}`;
  }

  return `social-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

@Component({
  selector: 'app-publishing-calendar',
  imports: [
    CmsToastContainerComponent,
    FaIconComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-8 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-[1500px] space-y-6">
        <header class="border-b border-zinc-800 pb-6">
          <h1 class="text-3xl font-semibold text-zinc-50 sm:text-4xl">Publishing Calendar</h1>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            View and manage blog post schedules and post-linked social announcements from one publishing timeline.
          </p>
        </header>

        <section class="grid border border-zinc-800 xl:grid-cols-[minmax(0,1fr)_410px]">
          <section class="min-w-0 border-zinc-800 xl:border-r" aria-label="Monthly publishing calendar">
            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-4 py-4 sm:px-5">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900"
                  (click)="goToToday()"
                >
                  Today
                </button>
                <button
                  type="button"
                  class="grid h-10 w-10 place-items-center border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900"
                  aria-label="Previous month"
                  (click)="goToPreviousMonth()"
                >
                  <fa-icon [icon]="faChevronLeft" aria-hidden="true"></fa-icon>
                </button>
                <h2 class="min-w-40 px-2 text-xl font-semibold text-zinc-50 sm:text-2xl">{{ monthLabel() }}</h2>
                <button
                  type="button"
                  class="grid h-10 w-10 place-items-center border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900"
                  aria-label="Next month"
                  (click)="goToNextMonth()"
                >
                  <fa-icon [icon]="faChevronRight" aria-hidden="true"></fa-icon>
                </button>
              </div>

              <div class="flex overflow-x-auto border border-zinc-700" aria-label="Calendar filters">
                @for (filterOption of calendarFilters; track filterOption.value) {
                  <button
                    type="button"
                    [class]="filterButtonClass(filterOption.value)"
                    [attr.aria-pressed]="activeFilter() === filterOption.value"
                    (click)="setFilter(filterOption.value)"
                  >
                    {{ filterOption.label }}
                  </button>
                }
              </div>
            </div>

            <div class="overflow-x-auto">
              <div class="min-w-[780px]">
                <div class="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/60">
                  @for (weekday of weekdayLabels; track weekday) {
                    <div class="border-r border-zinc-800 px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 last:border-r-0">
                      {{ weekday }}
                    </div>
                  }
                </div>

                <div class="grid grid-cols-7">
                  @for (day of calendarDays(); track day.dateKey) {
                    <div
                      [class]="dayCellClass(day)"
                    >
                      <button
                        type="button"
                        [class]="dayNumberClass(day)"
                        [attr.aria-label]="dayAriaLabel(day)"
                        (click)="selectDay(day)"
                      >
                        {{ day.dayNumber }}
                      </button>

                      <span class="mt-2 grid gap-1.5 text-left">
                        @for (calendarEvent of day.events.slice(0, 3); track calendarEvent.id) {
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
                        @if (day.events.length > 3) {
                          <span class="px-1 text-[10px] font-medium text-cyan-300">+{{ day.events.length - 3 }} more</span>
                        }
                      </span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </section>

          <aside class="min-w-0 bg-zinc-950" aria-label="Selected publishing day">
            <div class="border-b border-zinc-800 p-5">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Selected day</p>
              <h2 class="mt-2 text-xl font-semibold text-zinc-50">{{ selectedDateLabel() }}</h2>
              <p class="mt-2 text-sm text-zinc-500">
                {{ selectedDayEvents().length }} calendar item{{ selectedDayEvents().length === 1 ? '' : 's' }}
              </p>
            </div>

            <div class="space-y-5 p-5">
              <label class="block space-y-2">
                <span class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Find a post</span>
                <select
                  [value]="selectedPost()?.id ?? ''"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  (change)="selectPostFromList($event)"
                >
                  <option value="">Choose scheduled or published post</option>
                  @for (post of schedulablePosts(); track post.id) {
                    <option [value]="post.id">{{ post.title }} · {{ statusLabel(post.status) }}</option>
                  }
                </select>
              </label>

              @if (selectedDayEvents().length > 1) {
                <section class="space-y-2" aria-label="Selected day agenda">
                  <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Day agenda</h3>
                  <div class="divide-y divide-zinc-800 border border-zinc-800">
                    @for (calendarEvent of selectedDayEvents(); track calendarEvent.id) {
                      <button
                        type="button"
                        class="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-zinc-900"
                        (click)="selectEvent(calendarEvent)"
                      >
                        <span [class]="eventDotClass(calendarEvent)"></span>
                        <span class="min-w-0 flex-1 truncate text-zinc-200">{{ eventTitle(calendarEvent) }}</span>
                        <span class="text-zinc-500">{{ eventTime(calendarEvent) }}</span>
                      </button>
                    }
                  </div>
                </section>
              }

              @if (selectedPost(); as post) {
                <article class="border border-zinc-700 bg-zinc-900/60 p-4">
                  <div class="flex flex-wrap items-center gap-3 text-xs">
                    <span [class]="postStatusClass(post.status)">{{ statusLabel(post.status) }}</span>
                    <span class="text-zinc-500">{{ postDateTime(post) }}</span>
                  </div>
                  <h3 class="mt-3 text-xl font-semibold text-zinc-50">{{ post.title }}</h3>
                  <p class="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{{ post.excerpt }}</p>
                  <div class="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
                      (click)="openScheduleEditor(post)"
                    >
                      Edit schedule
                    </button>
                    <a
                      [routerLink]="['/admin/cms', post.slug, 'edit']"
                      class="border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                    >
                      Open editor
                    </a>
                  </div>
                </article>

                @if (scheduleEditorOpen) {
                  <section class="border border-cyan-400/40 bg-cyan-400/5 p-4" aria-label="Edit post schedule">
                    <h3 class="text-sm font-semibold text-zinc-100">Post schedule</h3>
                    <p class="mt-1 text-xs leading-5 text-zinc-500">Future dates move drafts or scheduled posts into the scheduled queue. Published posts keep their published status.</p>
                    <label class="mt-3 block space-y-2">
                      <span class="text-xs font-medium text-zinc-400">Publish date and time</span>
                      <input
                        type="datetime-local"
                        [value]="scheduleDraft"
                        class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                        (input)="updateScheduleDraft($event)"
                      >
                    </label>
                    <div class="mt-3 flex gap-2">
                      <button
                        type="button"
                        class="border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                        [disabled]="saveInProgress"
                        (click)="savePostSchedule(post)"
                      >
                        {{ saveInProgress ? 'Saving...' : 'Save schedule' }}
                      </button>
                      <button type="button" class="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200" (click)="closeScheduleEditor()">Cancel</button>
                    </div>
                  </section>
                }

                <section class="space-y-3" aria-label="Social announcement plan">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 class="text-sm font-semibold text-zinc-100">Social announcements</h3>
                      <p class="mt-1 text-xs text-zinc-500">Each service keeps its own copy and delivery time.</p>
                    </div>
                    <button
                      type="button"
                      class="border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
                      (click)="openSocialComposer(post)"
                    >
                      Add social post
                    </button>
                  </div>

                  <div class="divide-y divide-zinc-800 border border-zinc-800">
                    @for (announcement of selectedPostAnnouncements(); track announcement.id) {
                      <article class="p-3">
                        <div class="flex items-center gap-3">
                          <span [class]="channelIconClass(announcement.channel)">
                            <fa-icon [icon]="channelOption(announcement.channel).icon" aria-hidden="true"></fa-icon>
                          </span>
                          <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                              <h4 class="text-sm font-semibold text-zinc-200">{{ channelOption(announcement.channel).label }}</h4>
                              <span [class]="announcementStatusClass(announcement.status)">{{ statusLabel(announcement.status) }}</span>
                            </div>
                            <p class="mt-1 text-xs text-zinc-500">{{ announcementDateTime(announcement) }}</p>
                          </div>
                          @if (isAnnouncementEditable(announcement)) {
                            <button type="button" class="text-xs font-semibold text-cyan-300 hover:text-cyan-200" (click)="openAnnouncementEditor(announcement)">Edit</button>
                          }
                        </div>
                        <p class="mt-3 line-clamp-3 whitespace-pre-line text-xs leading-5 text-zinc-400">{{ announcement.message }}</p>
                      </article>
                    } @empty {
                      <div class="p-4 text-sm leading-6 text-zinc-500">
                        No social posts are attached yet. Add one for launch time or schedule follow-up sharing after publication.
                      </div>
                    }
                  </div>
                </section>

                @if (announcementEditorOpen && selectedAnnouncement(); as announcement) {
                  <section class="border border-cyan-400/40 bg-cyan-400/5 p-4" aria-label="Edit social announcement">
                    <div class="flex items-center justify-between gap-3">
                      <h3 class="text-sm font-semibold text-zinc-100">Edit {{ channelOption(announcement.channel).label }}</h3>
                      <span class="text-xs text-zinc-500">{{ announcementMessage.length }}/{{ channelOption(announcement.channel).characterLimit }}</span>
                    </div>
                    <textarea
                      rows="5"
                      [value]="announcementMessage"
                      [attr.maxlength]="channelOption(announcement.channel).characterLimit"
                      class="mt-3 w-full resize-y border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none focus:border-cyan-300"
                      (input)="updateAnnouncementMessage($event)"
                    ></textarea>
                    <input
                      type="datetime-local"
                      [value]="announcementScheduleDraft"
                      class="mt-3 w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                      (input)="updateAnnouncementSchedule($event)"
                    >
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        class="border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                        [disabled]="saveInProgress"
                        (click)="saveAnnouncement(post, announcement)"
                      >
                        Save announcement
                      </button>
                      <button type="button" class="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200" (click)="closeAnnouncementEditor()">Cancel</button>
                      <button type="button" class="ml-auto px-3 py-2 text-xs text-red-300 hover:text-red-200" (click)="cancelAnnouncement(post, announcement)">Cancel delivery</button>
                    </div>
                  </section>
                }

                @if (socialComposerOpen) {
                  <section class="border border-cyan-400/40 bg-zinc-900/70 p-4" aria-label="Add social posts">
                    <h3 class="text-base font-semibold text-zinc-50">Plan social posts</h3>
                    <p class="mt-2 text-xs leading-5 text-zinc-500">
                      Select services, then tailor the message and delivery time for each one. New deliveries remain tied to “{{ post.title }}”.
                    </p>

                    <div class="mt-4 flex flex-wrap gap-2">
                      @for (draft of channelDrafts; track draft.id) {
                        <button
                          type="button"
                          [class]="channelToggleClass(draft)"
                          [attr.aria-pressed]="draft.enabled"
                          (click)="toggleDraftChannel(draft.id)"
                        >
                          <fa-icon [icon]="draft.icon" aria-hidden="true"></fa-icon>
                          {{ draft.label }}
                        </button>
                      }
                    </div>

                    <div class="mt-4 space-y-4">
                      @for (draft of enabledChannelDrafts; track draft.id) {
                        <section class="border-l-2 border-zinc-700 pl-3">
                          <div class="flex items-center justify-between gap-3">
                            <div>
                              <h4 class="text-sm font-semibold text-zinc-200">{{ draft.label }}</h4>
                              <p class="mt-0.5 text-[11px] text-zinc-500">{{ draft.description }}</p>
                            </div>
                            <span class="text-[11px] text-zinc-500">{{ draft.message.length }}/{{ draft.characterLimit }}</span>
                          </div>
                          <textarea
                            rows="5"
                            [value]="draft.message"
                            [attr.maxlength]="draft.characterLimit"
                            class="mt-2 w-full resize-y border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-100 outline-none focus:border-cyan-300"
                            (input)="updateDraftMessage(draft.id, $event)"
                          ></textarea>
                          <label class="mt-2 block space-y-1">
                            <span class="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Delivery time</span>
                            <input
                              type="datetime-local"
                              [value]="draft.scheduledAt"
                              class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-cyan-300"
                              (input)="updateDraftSchedule(draft.id, $event)"
                            >
                          </label>
                        </section>
                      }
                    </div>

                    <div class="mt-4 flex gap-2">
                      <button
                        type="button"
                        class="border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                        [disabled]="enabledChannelDrafts.length === 0 || saveInProgress"
                        (click)="saveSocialAnnouncements(post)"
                      >
                        {{ saveInProgress ? 'Saving...' : 'Save social plan' }}
                      </button>
                      <button type="button" class="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200" (click)="closeSocialComposer()">Cancel</button>
                    </div>
                  </section>
                }
              } @else {
                <section class="border border-zinc-800 p-5 text-sm leading-6 text-zinc-500">
                  Select a post from the calendar or use “Find a post” to schedule sharing for an article that is already live.
                </section>
              }

              <section class="space-y-3 border-t border-zinc-800 pt-5" aria-label="Upcoming publishing queue">
                <div>
                  <h3 class="text-sm font-semibold text-zinc-100">Upcoming queue</h3>
                  <p class="mt-1 text-xs text-zinc-500">Post launches and social deliveries awaiting their time.</p>
                </div>
                <div class="divide-y divide-zinc-800 border border-zinc-800">
                  @for (calendarEvent of upcomingQueue(); track calendarEvent.id) {
                    <button
                      type="button"
                      class="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left hover:bg-zinc-900"
                      (click)="jumpToEvent(calendarEvent)"
                    >
                      <span [class]="eventDotClass(calendarEvent)"></span>
                      <span class="min-w-0">
                        <span class="block truncate text-xs font-medium text-zinc-200">{{ eventTitle(calendarEvent) }}</span>
                        <span class="mt-1 block text-[11px] text-zinc-500">{{ queueEventType(calendarEvent) }}</span>
                      </span>
                      <span class="text-right text-[11px] text-zinc-500">
                        {{ shortEventDate(calendarEvent) }}<br>{{ eventTime(calendarEvent) }}
                      </span>
                    </button>
                  } @empty {
                    <p class="p-4 text-sm text-zinc-500">Nothing is queued yet.</p>
                  }
                </div>
              </section>

              <aside class="border border-zinc-800 bg-zinc-900/50 p-4 text-xs leading-5 text-zinc-500">
                Scheduled social items are written to a protected delivery outbox after the source article is live. Provider credentials and API adapters remain a separate backend concern.
              </aside>
            </div>
          </aside>
        </section>
      </section>
    </main>
    <app-cms-toast-container></app-cms-toast-container>
  `,
})
export class PublishingCalendarComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly toast = inject(CmsToastService);
  private readonly today = new Date();

  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faChevronRight = faChevronRight;
  protected readonly calendarFilters = calendarFilters;
  protected readonly weekdayLabels = weekdayLabels;
  protected readonly activeFilter = signal<PublishingCalendarFilter>('all');
  protected readonly viewMonth = signal(startOfMonth(this.today));
  protected readonly selectedDateKey = signal(toLocalDateKey(this.today));
  protected readonly selectedEventId = signal<string | null>(null);
  protected readonly posts = toSignal(this.blogRepository.getAdminPosts$(), {initialValue: []});
  protected readonly schedulablePosts = computed(() => this.posts()
    .filter(post => (post.status === 'scheduled' || post.status === 'published') && Boolean(post.publishedAt))
    .sort((left, right) => (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '')));
  protected readonly allEvents = computed(() => this.createCalendarEvents(this.posts()));
  protected readonly visibleEvents = computed(() => this.allEvents().filter(calendarEvent => this.eventMatchesFilter(calendarEvent)));
  protected readonly monthLabel = computed(() => monthFormatter.format(this.viewMonth()));
  protected readonly calendarDays = computed(() => this.createCalendarDays(this.viewMonth(), this.visibleEvents()));
  protected readonly selectedDayEvents = computed(() => this.visibleEvents()
    .filter(calendarEvent => calendarEvent.dateKey === this.selectedDateKey())
    .sort((left, right) => left.timestamp - right.timestamp));
  protected readonly selectedEvent = computed(() => {
    const selectedEventId = this.selectedEventId();
    return this.allEvents().find(calendarEvent => calendarEvent.id === selectedEventId)
      ?? this.selectedDayEvents()[0];
  });
  protected readonly selectedPost = computed(() => this.selectedEvent()?.post);
  protected readonly selectedAnnouncement = computed(() => this.selectedEvent()?.announcement);
  protected readonly selectedPostAnnouncements = computed(() => (this.selectedPost()?.socialPromotion?.announcements ?? [])
    .filter(announcement => announcement.status !== 'cancelled')
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt)));
  protected readonly selectedDateLabel = computed(() => {
    const [year, month, day] = this.selectedDateKey().split('-').map(Number);
    return longDateFormatter.format(new Date(year, month - 1, day));
  });
  protected readonly upcomingQueue = computed(() => {
    const now = Date.now();
    return this.allEvents()
      .filter(calendarEvent => calendarEvent.timestamp >= now)
      .filter(calendarEvent => calendarEvent.type === 'social' || calendarEvent.post.status === 'scheduled')
      .sort((left, right) => left.timestamp - right.timestamp)
      .slice(0, 5);
  });

  protected scheduleEditorOpen = false;
  protected socialComposerOpen = false;
  protected announcementEditorOpen = false;
  protected scheduleDraft = '';
  protected announcementMessage = '';
  protected announcementScheduleDraft = '';
  protected saveInProgress = false;
  protected channelDrafts: readonly SocialAnnouncementDraft[] = [];

  protected get enabledChannelDrafts(): readonly SocialAnnouncementDraft[] {
    return this.channelDrafts.filter(draft => draft.enabled);
  }

  protected setFilter(filter: PublishingCalendarFilter): void {
    this.activeFilter.set(filter);
  }

  protected filterButtonClass(filter: PublishingCalendarFilter): string {
    const base = 'whitespace-nowrap border-r border-zinc-700 px-3 py-2 text-xs font-medium last:border-r-0';
    return this.activeFilter() === filter
      ? `${base} bg-cyan-400 text-zinc-950`
      : `${base} text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100`;
  }

  protected goToToday(): void {
    this.viewMonth.set(startOfMonth(this.today));
    this.selectedDateKey.set(toLocalDateKey(this.today));
    this.selectedEventId.set(null);
    this.closeEditors();
  }

  protected goToPreviousMonth(): void {
    const current = this.viewMonth();
    const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.viewMonth.set(previous);
    this.selectedDateKey.set(toLocalDateKey(previous));
    this.selectedEventId.set(null);
    this.closeEditors();
  }

  protected goToNextMonth(): void {
    const current = this.viewMonth();
    const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.viewMonth.set(next);
    this.selectedDateKey.set(toLocalDateKey(next));
    this.selectedEventId.set(null);
    this.closeEditors();
  }

  protected selectDay(day: PublishingCalendarDay): void {
    this.selectedDateKey.set(day.dateKey);
    this.selectedEventId.set(day.events[0]?.id ?? null);
    this.closeEditors();
  }

  protected selectEvent(calendarEvent: PublishingCalendarEvent, domEvent?: Event): void {
    domEvent?.stopPropagation();
    this.selectedDateKey.set(calendarEvent.dateKey);
    this.selectedEventId.set(calendarEvent.id);
    this.closeEditors();
  }

  protected jumpToEvent(calendarEvent: PublishingCalendarEvent): void {
    this.viewMonth.set(startOfMonth(new Date(calendarEvent.timestamp)));
    this.selectEvent(calendarEvent);
  }

  protected selectPostFromList(event: Event): void {
    const postId = event.target instanceof HTMLSelectElement ? event.target.value : '';
    const calendarEvent = this.allEvents().find(candidate => candidate.type === 'post' && candidate.post.id === postId);

    if (calendarEvent) {
      this.jumpToEvent(calendarEvent);
    }
  }

  protected dayCellClass(day: PublishingCalendarDay): string {
    const selected = day.dateKey === this.selectedDateKey();
    const base = 'min-h-36 border-b border-r border-zinc-800 p-2 text-left align-top transition last:border-r-0 hover:bg-zinc-900/70';
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
    const selected = calendarEvent.id === this.selectedEvent()?.id;
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
    return calendarEvent.type === 'social' && calendarEvent.announcement
      ? `${this.channelOption(calendarEvent.announcement.channel).label}: ${calendarEvent.post.title}`
      : calendarEvent.post.title;
  }

  protected shortEventDate(calendarEvent: PublishingCalendarEvent): string {
    return shortDateFormatter.format(new Date(calendarEvent.timestamp));
  }

  protected queueEventType(calendarEvent: PublishingCalendarEvent): string {
    return calendarEvent.type === 'social' && calendarEvent.announcement
      ? `${this.channelOption(calendarEvent.announcement.channel).label} announcement`
      : 'Blog post';
  }

  protected postDateTime(post: BlogPost): string {
    if (!post.publishedAt) {
      return 'No publish date';
    }

    const date = new Date(post.publishedAt);
    return `${shortDateFormatter.format(date)} at ${timeFormatter.format(date)}`;
  }

  protected announcementDateTime(announcement: BlogSocialAnnouncement): string {
    const date = new Date(announcement.scheduledAt);
    return `${shortDateFormatter.format(date)} at ${timeFormatter.format(date)}`;
  }

  protected statusLabel(status: BlogPostStatus | BlogSocialAnnouncement['status']): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  protected postStatusClass(status: BlogPostStatus): string {
    const base = 'border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide';

    switch (status) {
      case 'published':
        return `${base} border-emerald-500/60 text-emerald-300`;
      case 'scheduled':
        return `${base} border-cyan-500/60 text-cyan-300`;
      case 'draft':
        return `${base} border-amber-500/60 text-amber-300`;
      case 'archived':
        return `${base} border-zinc-600 text-zinc-400`;
    }
  }

  protected announcementStatusClass(status: BlogSocialAnnouncement['status']): string {
    const base = 'border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide';

    switch (status) {
      case 'posted':
        return `${base} border-emerald-500/50 text-emerald-300`;
      case 'scheduled':
      case 'queued':
        return `${base} border-cyan-500/50 text-cyan-300`;
      case 'failed':
        return `${base} border-red-500/50 text-red-300`;
      case 'draft':
        return `${base} border-amber-500/50 text-amber-300`;
      case 'cancelled':
        return `${base} border-zinc-700 text-zinc-500`;
    }
  }

  protected channelOption(channel: BlogSocialChannel): SocialChannelOption {
    return channelOptionsById.get(channel) ?? socialChannelOptions[0];
  }

  protected channelIconClass(channel: BlogSocialChannel): string {
    const base = 'grid h-8 w-8 shrink-0 place-items-center border';

    switch (channel) {
      case 'youtube':
        return `${base} border-red-500/40 bg-red-500/10 text-red-300`;
      case 'facebook':
        return `${base} border-blue-500/40 bg-blue-500/10 text-blue-300`;
      case 'instagram':
        return `${base} border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300`;
      case 'linkedin':
        return `${base} border-sky-500/40 bg-sky-500/10 text-sky-300`;
      case 'notify':
        return `${base} border-zinc-600 bg-zinc-800 text-zinc-300`;
    }
  }

  protected postChannels(post: BlogPost): readonly SocialChannelOption[] {
    const channels = new Set(
      (post.socialPromotion?.announcements ?? [])
        .filter(announcement => announcement.status !== 'cancelled')
        .map(announcement => announcement.channel)
    );
    return BLOG_SOCIAL_CHANNELS.filter(channel => channels.has(channel)).map(channel => this.channelOption(channel));
  }

  protected openScheduleEditor(post: BlogPost): void {
    this.closeEditors();
    this.scheduleDraft = toDateTimeLocalValue(post.publishedAt);
    this.scheduleEditorOpen = true;
  }

  protected updateScheduleDraft(event: Event): void {
    this.scheduleDraft = event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  protected closeScheduleEditor(): void {
    this.scheduleEditorOpen = false;
    this.scheduleDraft = '';
  }

  protected async savePostSchedule(post: BlogPost): Promise<void> {
    const publishedAt = fromDateTimeLocalValue(this.scheduleDraft);

    if (!publishedAt) {
      this.toast.error('Choose a valid publish date and time.');
      return;
    }

    const publishedTimestamp = new Date(publishedAt).getTime();

    if (post.status !== 'published' && publishedTimestamp <= Date.now()) {
      this.toast.error('Choose a future time before scheduling this post.');
      return;
    }

    const status: BlogPostStatus = post.status === 'published' ? 'published' : 'scheduled';
    this.saveInProgress = true;

    try {
      await this.blogRepository.savePost({...post, status, publishedAt});
      this.toast.success(`Updated the schedule for “${post.title}”.`);
      this.closeScheduleEditor();
    } catch (error) {
      this.toast.error(`Unable to update the schedule: ${getErrorMessage(error)}`);
    } finally {
      this.saveInProgress = false;
    }
  }

  protected openSocialComposer(post: BlogPost): void {
    this.closeEditors();
    const earliestDelivery = Math.max(Date.now() + 10 * 60 * 1000, new Date(post.publishedAt ?? 0).getTime());
    const scheduledAt = toDateTimeLocalValue(new Date(earliestDelivery).toISOString());

    this.channelDrafts = socialChannelOptions.map(option => ({
      ...option,
      enabled: false,
      message: this.createDefaultMessage(option.id, post),
      scheduledAt,
    }));
    this.socialComposerOpen = true;
  }

  protected closeSocialComposer(): void {
    this.socialComposerOpen = false;
    this.channelDrafts = [];
  }

  protected channelToggleClass(draft: SocialAnnouncementDraft): string {
    const base = 'inline-flex items-center gap-2 border px-3 py-2 text-xs font-semibold';
    return draft.enabled
      ? `${base} border-cyan-400 bg-cyan-400 text-zinc-950`
      : `${base} border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200`;
  }

  protected toggleDraftChannel(channel: BlogSocialChannel): void {
    this.channelDrafts = this.channelDrafts.map(draft => draft.id === channel
      ? {...draft, enabled: !draft.enabled}
      : draft);
  }

  protected updateDraftMessage(channel: BlogSocialChannel, event: Event): void {
    const message = event.target instanceof HTMLTextAreaElement ? event.target.value : '';
    this.channelDrafts = this.channelDrafts.map(draft => draft.id === channel ? {...draft, message} : draft);
  }

  protected updateDraftSchedule(channel: BlogSocialChannel, event: Event): void {
    const scheduledAt = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.channelDrafts = this.channelDrafts.map(draft => draft.id === channel ? {...draft, scheduledAt} : draft);
  }

  protected async saveSocialAnnouncements(post: BlogPost): Promise<void> {
    const drafts = this.enabledChannelDrafts;

    if (drafts.length === 0) {
      this.toast.error('Choose at least one service.');
      return;
    }

    const invalidMessage = drafts.find(draft => !draft.message.trim() || draft.message.length > draft.characterLimit);

    if (invalidMessage) {
      this.toast.error(`Add a valid ${invalidMessage.label} message within ${invalidMessage.characterLimit} characters.`);
      return;
    }

    const parsedSchedules = drafts.map(draft => ({draft, scheduledAt: fromDateTimeLocalValue(draft.scheduledAt)}));
    const invalidSchedule = parsedSchedules.find(item => !item.scheduledAt || new Date(item.scheduledAt).getTime() <= Date.now());

    if (invalidSchedule) {
      this.toast.error(`Choose a future delivery time for ${invalidSchedule.draft.label}.`);
      return;
    }

    const postPublishTimestamp = new Date(post.publishedAt ?? 0).getTime();
    const beforePublish = post.status === 'scheduled'
      ? parsedSchedules.find(item => new Date(item.scheduledAt as string).getTime() < postPublishTimestamp)
      : undefined;

    if (beforePublish) {
      this.toast.error(`${beforePublish.draft.label} cannot be delivered before the blog post is live.`);
      return;
    }

    const now = new Date().toISOString();
    const linkUrl = `${SITE_URL}/blog/${post.slug}`;
    const announcements: readonly BlogSocialAnnouncement[] = parsedSchedules.map(({draft, scheduledAt}) => ({
      id: createAnnouncementId(),
      channel: draft.id,
      message: draft.message.trim(),
      scheduledAt: scheduledAt as string,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
      linkUrl,
    }));
    const savedPost: BlogPost = {
      ...post,
      socialPromotion: {
        announcements: [
          ...(post.socialPromotion?.announcements ?? []),
          ...announcements,
        ],
      },
    };

    this.saveInProgress = true;

    try {
      await this.blogRepository.savePost(savedPost);
      this.toast.success(`Scheduled ${announcements.length} social announcement${announcements.length === 1 ? '' : 's'} for “${post.title}”.`);
      this.closeSocialComposer();
    } catch (error) {
      this.toast.error(`Unable to save the social plan: ${getErrorMessage(error)}`);
    } finally {
      this.saveInProgress = false;
    }
  }

  protected isAnnouncementEditable(announcement: BlogSocialAnnouncement): boolean {
    return announcement.status === 'draft' || announcement.status === 'scheduled' || announcement.status === 'failed';
  }

  protected openAnnouncementEditor(announcement: BlogSocialAnnouncement): void {
    this.closeEditors();
    const eventId = `social:${this.selectedPost()?.id ?? ''}:${announcement.id}`;
    this.selectedEventId.set(eventId);
    this.announcementMessage = announcement.message;
    this.announcementScheduleDraft = toDateTimeLocalValue(announcement.scheduledAt);
    this.announcementEditorOpen = true;
  }

  protected closeAnnouncementEditor(): void {
    this.announcementEditorOpen = false;
    this.announcementMessage = '';
    this.announcementScheduleDraft = '';
  }

  protected updateAnnouncementMessage(event: Event): void {
    this.announcementMessage = event.target instanceof HTMLTextAreaElement ? event.target.value : '';
  }

  protected updateAnnouncementSchedule(event: Event): void {
    this.announcementScheduleDraft = event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  protected async saveAnnouncement(post: BlogPost, announcement: BlogSocialAnnouncement): Promise<void> {
    const option = this.channelOption(announcement.channel);
    const message = this.announcementMessage.trim();
    const scheduledAt = fromDateTimeLocalValue(this.announcementScheduleDraft);

    if (!message || message.length > option.characterLimit) {
      this.toast.error(`Add a valid ${option.label} message within ${option.characterLimit} characters.`);
      return;
    }

    if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
      this.toast.error('Choose a future delivery time.');
      return;
    }

    if (post.status === 'scheduled' && post.publishedAt && scheduledAt < post.publishedAt) {
      this.toast.error(`${option.label} cannot be delivered before the blog post is live.`);
      return;
    }

    const updatedAnnouncement: BlogSocialAnnouncement = {
      ...announcement,
      message,
      scheduledAt,
      status: 'scheduled',
      updatedAt: new Date().toISOString(),
      failureReason: undefined,
    };

    await this.updatePostAnnouncement(post, updatedAnnouncement, `Updated the ${option.label} announcement.`);
    this.closeAnnouncementEditor();
  }

  protected async cancelAnnouncement(post: BlogPost, announcement: BlogSocialAnnouncement): Promise<void> {
    if (!window.confirm(`Cancel the ${this.channelOption(announcement.channel).label} delivery?`)) {
      return;
    }

    const updatedAnnouncement: BlogSocialAnnouncement = {
      ...announcement,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };

    await this.updatePostAnnouncement(post, updatedAnnouncement, 'Cancelled the social delivery.');
    this.closeAnnouncementEditor();
  }

  private async updatePostAnnouncement(
    post: BlogPost,
    updatedAnnouncement: BlogSocialAnnouncement,
    successMessage: string
  ): Promise<void> {
    const announcements = (post.socialPromotion?.announcements ?? [])
      .map(announcement => announcement.id === updatedAnnouncement.id ? updatedAnnouncement : announcement);
    this.saveInProgress = true;

    try {
      await this.blogRepository.savePost({
        ...post,
        socialPromotion: {announcements},
      });
      this.toast.success(successMessage);
    } catch (error) {
      this.toast.error(`Unable to update the announcement: ${getErrorMessage(error)}`);
    } finally {
      this.saveInProgress = false;
    }
  }

  private closeEditors(): void {
    this.scheduleEditorOpen = false;
    this.socialComposerOpen = false;
    this.announcementEditorOpen = false;
    this.scheduleDraft = '';
    this.channelDrafts = [];
    this.announcementMessage = '';
    this.announcementScheduleDraft = '';
  }

  private createCalendarEvents(posts: readonly BlogPost[]): readonly PublishingCalendarEvent[] {
    const events: PublishingCalendarEvent[] = [];

    for (const post of posts) {
      if (post.publishedAt && (post.status === 'scheduled' || post.status === 'published')) {
        const timestamp = new Date(post.publishedAt).getTime();

        if (Number.isFinite(timestamp)) {
          events.push({
            id: `post:${post.id}`,
            type: 'post',
            timestamp,
            dateKey: toLocalDateKey(new Date(timestamp)),
            post,
          });
        }
      }

      for (const announcement of post.socialPromotion?.announcements ?? []) {
        if (announcement.status === 'cancelled') {
          continue;
        }

        const timestamp = new Date(announcement.scheduledAt).getTime();

        if (Number.isFinite(timestamp)) {
          events.push({
            id: `social:${post.id}:${announcement.id}`,
            type: 'social',
            timestamp,
            dateKey: toLocalDateKey(new Date(timestamp)),
            post,
            announcement,
          });
        }
      }
    }

    return events.sort((left, right) => left.timestamp - right.timestamp);
  }

  private eventMatchesFilter(calendarEvent: PublishingCalendarEvent): boolean {
    switch (this.activeFilter()) {
      case 'all':
        if (calendarEvent.type !== 'social' || !calendarEvent.post.publishedAt) {
          return true;
        }

        return calendarEvent.dateKey !== toLocalDateKey(new Date(calendarEvent.post.publishedAt));
      case 'social':
        return calendarEvent.type === 'social';
      case 'published':
        return calendarEvent.type === 'post' && calendarEvent.post.status === 'published';
      case 'scheduled':
        return calendarEvent.type === 'post' && calendarEvent.post.status === 'scheduled';
    }
  }

  private createCalendarDays(
    month: Date,
    events: readonly PublishingCalendarEvent[]
  ): readonly PublishingCalendarDay[] {
    const firstDayOffset = (month.getDay() + 6) % 7;
    const firstGridDate = addDays(month, -firstDayOffset);
    const todayKey = toLocalDateKey(this.today);
    const eventsByDate = new Map<string, PublishingCalendarEvent[]>();

    for (const calendarEvent of events) {
      const dateEvents = eventsByDate.get(calendarEvent.dateKey) ?? [];
      dateEvents.push(calendarEvent);
      eventsByDate.set(calendarEvent.dateKey, dateEvents);
    }

    return Array.from({length: 42}, (_, index) => {
      const date = addDays(firstGridDate, index);
      const dateKey = toLocalDateKey(date);
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

  private createDefaultMessage(channel: BlogSocialChannel, post: BlogPost): string {
    const url = `${SITE_URL}/blog/${post.slug}`;
    const hashtags = post.tags
      .slice(0, 3)
      .map(tag => `#${tag.replace(/[^a-zA-Z0-9]/g, '')}`)
      .filter(tag => tag.length > 1)
      .join(' ');

    switch (channel) {
      case 'notify':
        return `New post: ${post.title}\n\n${post.excerpt}\n\n${url}`;
      case 'youtube':
        return `New on ColinMichaels.com: ${post.title}\n\n${post.excerpt}\n\nRead the full post: ${url}`;
      case 'facebook':
        return `I just published “${post.title}.”\n\n${post.excerpt}\n\nRead it here: ${url}`;
      case 'instagram':
        return `New on the blog: ${post.title}\n\n${post.excerpt}\n\nRead it at the link: ${url}${hashtags ? `\n\n${hashtags}` : ''}`;
      case 'linkedin':
        return `I just published a new article: ${post.title}\n\n${post.excerpt}\n\n${url}`;
    }
  }
}
