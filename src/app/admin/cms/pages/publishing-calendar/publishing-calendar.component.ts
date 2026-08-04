import {ChangeDetectionStrategy, Component, computed, effect, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faFacebookF, faInstagram, faLinkedinIn, faThreads, faXTwitter, faYoutube} from '@fortawesome/free-brands-svg-icons';
import {faBell} from '@fortawesome/free-solid-svg-icons';
import {ActivatedRoute, RouterLink} from '@angular/router';

import {
  BlogSocialAnnouncement,
  BlogSocialChannel,
  BlogSocialContentAngle,
  BlogSocialDeliveryTiming,
  BlogSocialLinkPlacement,
  BlogSocialMediaType,
  BlogSocialPromotion,
} from '../../../../features/blog/models/blog-social-promotion.model';
import {BlogPost, BlogPostStatus} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {
  createBlogSocialMessage,
  defaultSocialContentAngle,
} from '../../../../features/blog/utils/blog-social-promotion.util';
import {SITE_URL} from '../../../../shared/seo/seo.metadata';
import {CmsToastContainerComponent} from '../../components/toast/cms-toast.component';
import {CmsToastService} from '../../services/cms-toast.service';
import {SocialPromotionEditorComponent} from '../../components/social-promotion-editor/social-promotion-editor.component';
import {PublishingCalendarMonthComponent} from './publishing-calendar-month.component';
import {
  PublishingCalendarDay,
  PublishingCalendarEvent,
  PublishingCalendarFilter,
  createPublishingCalendarDays,
  createPublishingCalendarEvents,
  publishingCalendarEventMatchesFilter,
  startOfPublishingMonth,
  toPublishingDateKey,
} from './publishing-calendar.utils';

interface SocialChannelOption {
  id: BlogSocialChannel;
  label: string;
  shortLabel: string;
  description: string;
  automationLabel: string;
  characterLimit: number;
  icon: IconDefinition;
}

const socialContentAngleOptions: readonly {value: BlogSocialContentAngle; label: string; description: string}[] = [
  {
    value: 'personal-story',
    label: 'Personal story',
    description: 'Lead with why the topic matters to you before asking for a click.',
  },
  {
    value: 'conversation-starter',
    label: 'Conversation starter',
    description: 'Open with a useful question designed to invite comments.',
  },
  {
    value: 'practical-takeaway',
    label: 'Practical takeaway',
    description: 'Teach one useful idea and position the article as the deeper guide.',
  },
  {
    value: 'behind-the-scenes',
    label: 'Behind the scenes',
    description: 'Explain why you wrote the article and what you learned making it.',
  },
];
const socialLinkPlacementOptions: readonly {value: BlogSocialLinkPlacement; label: string; description: string}[] = [
  {value: 'post', label: 'In the post', description: 'Include the article URL in the main message.'},
  {value: 'first-comment', label: 'First comment', description: 'Publish native content first and add the article as a follow-up comment.'},
  {value: 'profile', label: 'Profile link', description: 'Direct readers to the link on your profile.'},
  {value: 'none', label: 'No link', description: 'Use this share for reach and conversation only.'},
];
const socialMediaTypeOptions: readonly {value: BlogSocialMediaType | 'none'; label: string}[] = [
  {value: 'image', label: 'Image'},
  {value: 'video', label: 'Video'},
  {value: 'none', label: 'No native media'},
];
const socialChannelOptions: readonly SocialChannelOption[] = [
  {
    id: 'notify',
    label: 'Notify',
    shortLabel: 'NT',
    description: 'Automatic Web Push at article publication',
    automationLabel: 'Already active; uses the article title and excerpt',
    characterLimit: 1000,
    icon: faBell,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    shortLabel: 'YT',
    description: 'Manual Community post plan',
    automationLabel: 'Manual — no supported Community Posts API',
    characterLimit: 5000,
    icon: faYoutube,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    shortLabel: 'FB',
    description: 'Page post',
    automationLabel: 'Meta Page connection required',
    characterLimit: 63206,
    icon: faFacebookF,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    shortLabel: 'IG',
    description: 'Caption for a linked media post',
    automationLabel: 'Meta professional account and media required',
    characterLimit: 2200,
    icon: faInstagram,
  },
  {
    id: 'threads',
    label: 'Threads',
    shortLabel: 'TH',
    description: 'Threads profile post',
    automationLabel: 'Threads account connection required',
    characterLimit: 500,
    icon: faThreads,
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    shortLabel: 'X',
    description: 'X profile post or thread',
    automationLabel: 'Manual plan — X connection is not configured',
    characterLimit: 280,
    icon: faXTwitter,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    shortLabel: 'IN',
    description: 'Profile or organization post',
    automationLabel: 'LinkedIn connection required',
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

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

@Component({
  selector: 'app-publishing-calendar',
  imports: [
    CmsToastContainerComponent,
    FaIconComponent,
    PublishingCalendarMonthComponent,
    RouterLink,
    SocialPromotionEditorComponent,
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

        <section [class]="calendarShellClass">
          <app-publishing-calendar-month
            class="min-w-0 border-zinc-800 xl:border-r"
            [hidden]="socialComposerOpen"
            [monthLabel]="monthLabel()"
            [days]="calendarDays()"
            [selectedDateKey]="selectedDateKey()"
            [selectedEventId]="selectedEvent()?.id ?? null"
            [activeFilter]="activeFilter()"
            (todaySelected)="goToToday()"
            (previousMonthSelected)="goToPreviousMonth()"
            (nextMonthSelected)="goToNextMonth()"
            (filterSelected)="setFilter($event)"
            (daySelected)="selectDay($event)"
            (eventSelected)="selectEvent($event)"
          ></app-publishing-calendar-month>

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
                      Edit article
                    </a>
                    <a
                      [routerLink]="['/admin/cms', post.slug, 'edit']"
                      [queryParams]="{tab: 'social'}"
                      class="border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-cyan-400 hover:text-cyan-200"
                    >
                      Social workspace
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
                      <p class="mt-1 text-xs text-zinc-500">Each service keeps its own copy and can follow the article launch or use a custom time.</p>
                    </div>
                    <button
                      type="button"
                      class="border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
                      (click)="openSocialComposer()"
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
                            <p class="mt-1 text-xs text-zinc-500">
                              {{ announcement.deliveryTiming === 'at-publish' ? 'At publication' : announcementDateTime(announcement) }}
                            </p>
                            <p class="mt-1 text-[11px] text-zinc-600">
                              {{ contentAngleLabel(announcement.contentAngle) }} · {{ announcementMediaLabel(announcement) }} · Link: {{ linkPlacementLabel(announcement.linkPlacement) }}
                            </p>
                          </div>
                          @if (isAnnouncementEditable(announcement)) {
                            <button type="button" class="text-xs font-semibold text-cyan-300 hover:text-cyan-200" (click)="openAnnouncementEditor(announcement)">Edit</button>
                          }
                          <a
                            [routerLink]="['/admin/cms', post.slug, 'edit']"
                            [queryParams]="{tab: 'social', channel: announcement.channel, announcement: announcement.id}"
                            class="text-xs font-semibold text-zinc-400 hover:text-cyan-200"
                          >
                            Workspace
                          </a>
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
                    <div class="mt-3 grid gap-3 sm:grid-cols-2">
                      <label class="space-y-1">
                        <span class="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Promotion angle</span>
                        <select
                          [value]="announcementContentAngle"
                          class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-cyan-300"
                          (change)="updateAnnouncementContentAngle($event)"
                        >
                          @for (option of socialContentAngleOptions; track option.value) {
                            <option [value]="option.value">{{ option.label }}</option>
                          }
                        </select>
                      </label>
                      <label class="space-y-1">
                        <span class="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Article link</span>
                        <select
                          [value]="announcementLinkPlacement"
                          class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-cyan-300"
                          (change)="updateAnnouncementLinkPlacement($event)"
                        >
                          @for (option of socialLinkPlacementOptions; track option.value) {
                            <option [value]="option.value">{{ option.label }}</option>
                          }
                        </select>
                      </label>
                    </div>
                    <button
                      type="button"
                      class="mt-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                      (click)="useAnnouncementStarterCopy(post, announcement.channel)"
                    >
                      Use starter copy for these choices
                    </button>
                    <textarea
                      rows="5"
                      [value]="announcementMessage"
                      [attr.maxlength]="channelOption(announcement.channel).characterLimit"
                      class="mt-3 w-full resize-y border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none focus:border-cyan-300"
                      (input)="updateAnnouncementMessage($event)"
                    ></textarea>
                    <fieldset class="mt-3 space-y-2">
                      <legend class="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Delivery timing</legend>
                      <div class="grid grid-cols-2 border border-zinc-700">
                        <button
                          type="button"
                          [class]="deliveryTimingButtonClass(announcementDeliveryTiming, 'at-publish')"
                          [attr.aria-pressed]="announcementDeliveryTiming === 'at-publish'"
                          [disabled]="!canFollowPublication(post)"
                          (click)="setAnnouncementDeliveryTiming('at-publish', post)"
                        >
                          When post goes live
                        </button>
                        <button
                          type="button"
                          [class]="deliveryTimingButtonClass(announcementDeliveryTiming, 'scheduled')"
                          [attr.aria-pressed]="announcementDeliveryTiming === 'scheduled'"
                          (click)="setAnnouncementDeliveryTiming('scheduled', post)"
                        >
                          Custom time
                        </button>
                      </div>
                    </fieldset>
                    @if (announcementDeliveryTiming === 'at-publish') {
                      <p class="mt-2 border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                        Follows the article schedule: {{ postDateTime(post) }}
                      </p>
                    } @else {
                      <input
                        type="datetime-local"
                        [value]="announcementScheduleDraft"
                        class="mt-2 w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                        (input)="updateAnnouncementSchedule($event)"
                      >
                    }
                    <div class="mt-3 grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                      <label class="space-y-1">
                        <span class="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Native media</span>
                        <select
                          [value]="announcementMediaType"
                          class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                          (change)="updateAnnouncementMediaType($event)"
                        >
                          @for (option of socialMediaTypeOptions; track option.value) {
                            <option [value]="option.value">{{ option.label }}</option>
                          }
                        </select>
                      </label>
                      @if (announcementMediaType !== 'none') {
                        <label class="space-y-1">
                          <span class="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Public image or video URL</span>
                        <input
                          type="url"
                          [value]="announcementMediaUrl"
                          placeholder="https://..."
                          class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                          (input)="updateAnnouncementMediaUrl($event)"
                        >
                        </label>
                      }
                    </div>
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
                  <section class="space-y-3" aria-label="Schedule social posts">
                    <div class="flex flex-wrap items-center justify-between gap-3 border border-cyan-400/40 bg-cyan-400/5 px-4 py-3">
                      <div>
                        <h3 class="text-sm font-semibold text-zinc-100">Calendar scheduling mode</h3>
                        <p class="mt-1 text-xs text-zinc-500">Compose with the same workspace used by the post editor, then save a delivery-ready plan. Closing keeps this draft for the current Calendar session.</p>
                        @if (hasCachedCalendarPromotion(post.id)) {
                          <p class="mt-1 text-xs font-medium text-amber-200" role="status">Unsaved Calendar draft preserved.</p>
                        }
                      </div>
                      <button
                        type="button"
                        class="border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                        (click)="closeSocialComposer()"
                      >
                        Close workspace
                      </button>
                    </div>
                    <app-social-promotion-editor
                      [post]="socialComposerSourcePost ?? post"
                      mode="schedule"
                      initialChannel="facebook"
                      [createNew]="socialComposerCreateNew"
                      [saving]="saveInProgress"
                      (promotionChange)="cacheCalendarPromotion(post.id, $event)"
                      (saveRequested)="savePromotionFromEditor(post, $event)"
                      (openCalendarRequested)="closeSocialComposer()"
                    ></app-social-promotion-editor>
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

              <section class="border border-zinc-800 bg-zinc-900/50 p-4" aria-label="Social automation readiness">
                <h3 class="text-sm font-semibold text-zinc-100">Automation readiness</h3>
                <p class="mt-1 text-xs leading-5 text-zinc-500">
                  Plans enter the protected outbox only after the article is live. Provider tokens remain server-side.
                </p>
                <dl class="mt-3 divide-y divide-zinc-800 border-y border-zinc-800 text-xs">
                  <div class="flex items-start justify-between gap-4 py-2">
                    <dt class="text-zinc-300">Web Push</dt>
                    <dd class="text-right text-emerald-300">Active at publication</dd>
                  </div>
                  <div class="flex items-start justify-between gap-4 py-2">
                    <dt class="text-zinc-300">Facebook / Instagram / Threads</dt>
                    <dd class="text-right text-amber-300">Account connection required</dd>
                  </div>
                  <div class="flex items-start justify-between gap-4 py-2">
                    <dt class="text-zinc-300">LinkedIn</dt>
                    <dd class="text-right text-amber-300">Separate connection still deferred</dd>
                  </div>
                  <div class="flex items-start justify-between gap-4 py-2">
                    <dt class="text-zinc-300">X (Twitter)</dt>
                    <dd class="text-right text-zinc-500">Manual workflow</dd>
                  </div>
                  <div class="flex items-start justify-between gap-4 py-2">
                    <dt class="text-zinc-300">YouTube Community</dt>
                    <dd class="text-right text-zinc-500">Manual workflow</dd>
                  </div>
                </dl>
                <a
                  routerLink="/admin/cms/social-connections"
                  class="mt-3 inline-flex border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-cyan-400 hover:text-cyan-200"
                >
                  Manage social connections
                </a>
              </section>
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
  private readonly route = inject(ActivatedRoute);
  private readonly today = new Date();
  private readonly requestedPostId = this.route.snapshot.queryParamMap.get('post');
  private readonly calendarPromotionDrafts = new Map<string, BlogSocialPromotion>();
  private hasAppliedRouteSelection = false;

  protected readonly socialContentAngleOptions = socialContentAngleOptions;
  protected readonly socialLinkPlacementOptions = socialLinkPlacementOptions;
  protected readonly socialMediaTypeOptions = socialMediaTypeOptions;
  protected readonly activeFilter = signal<PublishingCalendarFilter>('all');
  protected readonly viewMonth = signal(startOfPublishingMonth(this.today));
  protected readonly selectedDateKey = signal(toPublishingDateKey(this.today));
  protected readonly selectedEventId = signal<string | null>(null);
  protected readonly posts = toSignal(this.blogRepository.getAdminPosts$(), {initialValue: []});
  protected readonly schedulablePosts = computed(() => this.posts()
    .filter(post => (post.status === 'scheduled' || post.status === 'published') && Boolean(post.publishedAt))
    .sort((left, right) => (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '')));
  protected readonly allEvents = computed(() => createPublishingCalendarEvents(this.posts()));
  protected readonly visibleEvents = computed(() => this.allEvents().filter(calendarEvent => (
    publishingCalendarEventMatchesFilter(calendarEvent, this.activeFilter())
  )));
  protected readonly monthLabel = computed(() => monthFormatter.format(this.viewMonth()));
  protected readonly calendarDays = computed(() => createPublishingCalendarDays(
    this.viewMonth(),
    this.visibleEvents(),
    this.today
  ));
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
    .sort((left, right) => (left.scheduledAt ?? '9999').localeCompare(right.scheduledAt ?? '9999')));
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
  protected socialComposerSourcePost: BlogPost | null = null;
  protected socialComposerCreateNew = true;
  protected announcementEditorOpen = false;
  protected scheduleDraft = '';
  protected announcementMessage = '';
  protected announcementContentAngle: BlogSocialContentAngle = 'personal-story';
  protected announcementLinkPlacement: BlogSocialLinkPlacement = 'post';
  protected announcementScheduleDraft = '';
  protected announcementDeliveryTiming: BlogSocialDeliveryTiming = 'scheduled';
  protected announcementMediaType: BlogSocialMediaType | 'none' = 'none';
  protected announcementMediaUrl = '';
  protected saveInProgress = false;

  constructor() {
    effect(() => {
      if (!this.requestedPostId || this.hasAppliedRouteSelection) {
        return;
      }

      const calendarEvent = this.allEvents()
        .find(candidate => candidate.type === 'post' && candidate.post.id === this.requestedPostId);

      if (calendarEvent) {
        this.hasAppliedRouteSelection = true;
        this.jumpToEvent(calendarEvent);
      }
    });
  }

  protected setFilter(filter: PublishingCalendarFilter): void {
    this.activeFilter.set(filter);
  }

  protected get calendarShellClass(): string {
    return this.socialComposerOpen
      ? 'grid border border-zinc-800 xl:grid-cols-1'
      : 'grid border border-zinc-800 xl:grid-cols-[minmax(0,1fr)_410px]';
  }

  protected goToToday(): void {
    this.viewMonth.set(startOfPublishingMonth(this.today));
    this.selectedDateKey.set(toPublishingDateKey(this.today));
    this.selectedEventId.set(null);
    this.closeEditors();
  }

  protected goToPreviousMonth(): void {
    const current = this.viewMonth();
    const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.viewMonth.set(previous);
    this.selectedDateKey.set(toPublishingDateKey(previous));
    this.selectedEventId.set(null);
    this.closeEditors();
  }

  protected goToNextMonth(): void {
    const current = this.viewMonth();
    const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.viewMonth.set(next);
    this.selectedDateKey.set(toPublishingDateKey(next));
    this.selectedEventId.set(null);
    this.closeEditors();
  }

  protected selectDay(day: PublishingCalendarDay): void {
    this.selectedDateKey.set(day.dateKey);
    this.selectedEventId.set(day.events[0]?.id ?? null);
    this.closeEditors();
  }

  protected selectEvent(calendarEvent: PublishingCalendarEvent): void {
    this.selectedDateKey.set(calendarEvent.dateKey);
    this.selectedEventId.set(calendarEvent.id);
    this.closeEditors();
  }

  protected jumpToEvent(calendarEvent: PublishingCalendarEvent): void {
    this.viewMonth.set(startOfPublishingMonth(new Date(calendarEvent.timestamp)));
    this.selectEvent(calendarEvent);
  }

  protected selectPostFromList(event: Event): void {
    const postId = event.target instanceof HTMLSelectElement ? event.target.value : '';
    const calendarEvent = this.allEvents().find(candidate => candidate.type === 'post' && candidate.post.id === postId);

    if (calendarEvent) {
      this.jumpToEvent(calendarEvent);
    }
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
    if (!announcement.scheduledAt) {
      return 'Unscheduled draft';
    }

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

  protected contentAngleLabel(angle: BlogSocialContentAngle | undefined): string {
    return socialContentAngleOptions.find(option => option.value === angle)?.label ?? 'Custom copy';
  }

  protected linkPlacementLabel(placement: BlogSocialLinkPlacement | undefined): string {
    return socialLinkPlacementOptions.find(option => option.value === (placement ?? 'post'))?.label ?? 'In the post';
  }

  protected announcementMediaLabel(announcement: BlogSocialAnnouncement): string {
    if (!announcement.mediaUrl) {
      return 'No native media';
    }

    return announcement.mediaType === 'video' ? 'Video' : 'Image';
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
      case 'threads':
        return `${base} border-zinc-500/50 bg-zinc-700/20 text-zinc-200`;
      case 'x':
        return `${base} border-zinc-400/50 bg-zinc-700/20 text-zinc-100`;
      case 'linkedin':
        return `${base} border-sky-500/40 bg-sky-500/10 text-sky-300`;
      case 'notify':
        return `${base} border-zinc-600 bg-zinc-800 text-zinc-300`;
    }
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

    // Fixed delivery times are an editorial promise. Only explicit at-publication
    // announcements may move automatically when the article schedule changes.
    const conflictingAnnouncement = post.status !== 'published'
      ? (post.socialPromotion?.announcements ?? []).find(announcement => (
        announcement.status === 'scheduled'
        && announcement.deliveryTiming !== 'at-publish'
        && new Date(announcement.scheduledAt ?? '').getTime() < publishedTimestamp
      ))
      : undefined;

    if (conflictingAnnouncement) {
      const channelLabel = this.channelOption(conflictingAnnouncement.channel).label;
      this.toast.error(`Move or cancel the ${channelLabel} announcement before postponing this post past its delivery time.`);
      return;
    }

    const status: BlogPostStatus = post.status === 'published' ? 'published' : 'scheduled';
    const updatedAt = new Date().toISOString();
    const announcements = (post.socialPromotion?.announcements ?? []).map(announcement => (
      post.status !== 'published'
      && announcement.deliveryTiming === 'at-publish'
      && announcement.status === 'scheduled'
        ? {...announcement, scheduledAt: publishedAt, updatedAt}
        : announcement
    ));
    this.saveInProgress = true;

    try {
      await this.blogRepository.savePost({
        ...post,
        status,
        publishedAt,
        socialPromotion: post.socialPromotion ? {announcements} : undefined,
      });
      this.toast.success(`Updated the schedule for “${post.title}”.`);
      this.closeScheduleEditor();
    } catch (error) {
      this.toast.error(`Unable to update the schedule: ${getErrorMessage(error)}`);
    } finally {
      this.saveInProgress = false;
    }
  }

  protected openSocialComposer(): void {
    const post = this.selectedPost();
    if (!post) {
      return;
    }

    this.closeEditors();
    const cachedPromotion = this.calendarPromotionDrafts.get(post.id);
    this.socialComposerSourcePost = {
      ...post,
      ...(cachedPromotion ? {socialPromotion: cachedPromotion} : {}),
    };
    this.socialComposerCreateNew = !cachedPromotion;
    this.socialComposerOpen = true;
  }

  protected closeSocialComposer(): void {
    this.socialComposerOpen = false;
  }

  protected cacheCalendarPromotion(postId: string, promotion: BlogSocialPromotion): void {
    this.calendarPromotionDrafts.set(postId, promotion);
  }

  protected hasCachedCalendarPromotion(postId: string): boolean {
    return this.calendarPromotionDrafts.has(postId);
  }

  protected canFollowPublication(post: BlogPost): boolean {
    if (post.status !== 'scheduled' || !post.publishedAt) {
      return false;
    }

    return new Date(post.publishedAt).getTime() > Date.now();
  }

  protected deliveryTimingButtonClass(
    currentTiming: BlogSocialDeliveryTiming,
    buttonTiming: BlogSocialDeliveryTiming
  ): string {
    const base = 'px-2 py-2 text-[11px] font-medium disabled:cursor-not-allowed disabled:text-zinc-700';
    return currentTiming === buttonTiming
      ? `${base} bg-cyan-400 text-zinc-950`
      : `${base} text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100`;
  }

  protected async savePromotionFromEditor(post: BlogPost, promotion: BlogSocialPromotion): Promise<void> {
    this.saveInProgress = true;

    try {
      await this.blogRepository.savePost({
        ...post,
        socialPromotion: promotion,
      });
      this.calendarPromotionDrafts.delete(post.id);
      this.socialComposerSourcePost = {...post, socialPromotion: promotion};
      this.socialComposerCreateNew = true;
      this.toast.success(`Saved the social plan for “${post.title}”.`);
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
    this.announcementContentAngle = announcement.contentAngle ?? defaultSocialContentAngle(announcement.channel);
    this.announcementLinkPlacement = announcement.linkPlacement ?? 'post';
    this.announcementScheduleDraft = toDateTimeLocalValue(announcement.scheduledAt ?? null);
    this.announcementDeliveryTiming = announcement.deliveryTiming ?? 'scheduled';
    this.announcementMediaType = announcement.mediaUrl ? (announcement.mediaType ?? 'image') : 'none';
    this.announcementMediaUrl = announcement.mediaUrl ?? '';
    this.announcementEditorOpen = true;
  }

  protected closeAnnouncementEditor(): void {
    this.announcementEditorOpen = false;
    this.announcementMessage = '';
    this.announcementContentAngle = 'personal-story';
    this.announcementLinkPlacement = 'post';
    this.announcementScheduleDraft = '';
    this.announcementDeliveryTiming = 'scheduled';
    this.announcementMediaType = 'none';
    this.announcementMediaUrl = '';
  }

  protected updateAnnouncementMessage(event: Event): void {
    this.announcementMessage = event.target instanceof HTMLTextAreaElement ? event.target.value : '';
  }

  protected updateAnnouncementContentAngle(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.announcementContentAngle = event.target.value as BlogSocialContentAngle;
    }
  }

  protected updateAnnouncementLinkPlacement(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.announcementLinkPlacement = event.target.value as BlogSocialLinkPlacement;
    }
  }

  protected useAnnouncementStarterCopy(post: BlogPost, channel: BlogSocialChannel): void {
    this.announcementMessage = createBlogSocialMessage(
      channel,
      post,
      this.announcementContentAngle,
      this.announcementLinkPlacement,
      SITE_URL
    );
  }

  protected updateAnnouncementSchedule(event: Event): void {
    this.announcementScheduleDraft = event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  protected setAnnouncementDeliveryTiming(deliveryTiming: BlogSocialDeliveryTiming, post: BlogPost): void {
    if (deliveryTiming === 'at-publish' && !this.canFollowPublication(post)) {
      return;
    }

    this.announcementDeliveryTiming = deliveryTiming;
    this.announcementScheduleDraft = deliveryTiming === 'at-publish'
      ? toDateTimeLocalValue(post.publishedAt)
      : toDateTimeLocalValue(new Date(Math.max(Date.now() + 10 * 60 * 1000, new Date(post.publishedAt ?? 0).getTime())).toISOString());
  }

  protected updateAnnouncementMediaUrl(event: Event): void {
    this.announcementMediaUrl = event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  protected updateAnnouncementMediaType(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) {
      return;
    }

    this.announcementMediaType = event.target.value as BlogSocialMediaType | 'none';

    if (this.announcementMediaType === 'none') {
      this.announcementMediaUrl = '';
    }
  }

  protected async saveAnnouncement(post: BlogPost, announcement: BlogSocialAnnouncement): Promise<void> {
    const option = this.channelOption(announcement.channel);
    const message = this.announcementMessage.trim();
    const scheduledAt = this.announcementDeliveryTiming === 'at-publish'
      ? post.publishedAt
      : fromDateTimeLocalValue(this.announcementScheduleDraft);

    if (!message || message.length > option.characterLimit) {
      this.toast.error(`Add a valid ${option.label} message within ${option.characterLimit} characters.`);
      return;
    }

    if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
      this.toast.error('Choose a future delivery time.');
      return;
    }

    if (announcement.channel === 'instagram' && this.announcementMediaType === 'none') {
      this.toast.error('Choose an image or video before scheduling Instagram.');
      return;
    }

    if (this.announcementMediaType !== 'none' && !isHttpUrl(this.announcementMediaUrl)) {
      this.toast.error(`Add a public image or video URL for ${option.label}.`);
      return;
    }

    if (
      post.status === 'scheduled'
      && post.publishedAt
      && new Date(scheduledAt).getTime() < new Date(post.publishedAt).getTime()
    ) {
      this.toast.error(`${option.label} cannot be delivered before the blog post is live.`);
      return;
    }

    const updatedAnnouncement: BlogSocialAnnouncement = {
      ...announcement,
      message,
      scheduledAt,
      deliveryTiming: this.announcementDeliveryTiming,
      status: 'scheduled',
      updatedAt: new Date().toISOString(),
      contentAngle: this.announcementContentAngle,
      linkPlacement: this.announcementLinkPlacement,
      mediaType: this.announcementMediaType === 'none' ? undefined : this.announcementMediaType,
      mediaUrl: this.announcementMediaUrl.trim() || undefined,
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
    this.announcementMessage = '';
    this.announcementContentAngle = 'personal-story';
    this.announcementLinkPlacement = 'post';
    this.announcementScheduleDraft = '';
    this.announcementDeliveryTiming = 'scheduled';
    this.announcementMediaType = 'none';
    this.announcementMediaUrl = '';
  }

}
