import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {
  faFacebookF,
  faInstagram,
  faLinkedinIn,
  faThreads,
  faXTwitter,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';

import {
  BlogSocialAnnouncement,
  BlogSocialAnnouncementStatus,
  BlogSocialChannel,
  BlogSocialContentAngle,
  BlogSocialDeliveryTiming,
  BlogSocialLinkPlacement,
  BlogSocialMediaType,
  BlogSocialPostFormat,
  BlogSocialPromotion,
} from '../../../../features/blog/models/blog-social-promotion.model';
import {BlogPost} from '../../../../features/blog/models/blog-post.model';
import {
  createBlogSocialCampaignUrl,
  createBlogSocialMessage,
  defaultSocialContentAngle,
  defaultSocialLinkPlacement,
  defaultSocialPostFormat,
  socialPostFormatsForChannel,
} from '../../../../features/blog/utils/blog-social-promotion.util';
import {SITE_URL} from '../../../../shared/seo/seo.metadata';
import {BlogAssistantContext} from '../../models/blog-ai-assistant.model';
import {
  BLOG_SOCIAL_AI_POST_FORMATS,
  BlogSocialAiSuggestion,
} from '../../models/blog-social-ai.model';
import {BlogAiFunctionsService} from '../../services/blog-ai-functions.service';
import {BlogMediaUploaderComponent} from '../media-uploader/blog-media-uploader.component';

export type SocialPromotionEditorMode = 'compose' | 'schedule';
type EditableSocialChannel = Exclude<BlogSocialChannel, 'notify'>;
type EditableSocialStatus = Extract<BlogSocialAnnouncementStatus, 'draft' | 'scheduled' | 'cancelled'>;

interface SocialChannelOption {
  id: EditableSocialChannel;
  label: string;
  shortLabel: string;
  description: string;
  characterLimit: number;
  icon: IconDefinition;
  iconClass: string;
}

interface LabelledOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

const socialChannelOptions: readonly SocialChannelOption[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    shortLabel: 'FB',
    description: 'Personal stories, questions, images, and video',
    characterLimit: 63_206,
    icon: faFacebookF,
    iconClass: 'text-blue-400',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    shortLabel: 'IG',
    description: 'Image, carousel, story, and reel captions',
    characterLimit: 2_200,
    icon: faInstagram,
    iconClass: 'text-fuchsia-300',
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    shortLabel: 'X',
    description: 'Concise posts, threads, images, and video',
    characterLimit: 280,
    icon: faXTwitter,
    iconClass: 'text-zinc-100',
  },
  {
    id: 'threads',
    label: 'Threads',
    shortLabel: 'TH',
    description: 'Conversation-led posts and short threads',
    characterLimit: 500,
    icon: faThreads,
    iconClass: 'text-zinc-100',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    shortLabel: 'IN',
    description: 'Professional takeaways and native media',
    characterLimit: 3_000,
    icon: faLinkedinIn,
    iconClass: 'text-sky-300',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    shortLabel: 'YT',
    description: 'Community posts and video promotion',
    characterLimit: 5_000,
    icon: faYoutube,
    iconClass: 'text-red-400',
  },
];

const channelById = new Map(socialChannelOptions.map(option => [option.id, option]));

const contentAngleOptions: readonly LabelledOption<BlogSocialContentAngle>[] = [
  {
    value: 'personal-story',
    label: 'Personal story',
    description: 'Lead with why this matters to you.',
  },
  {
    value: 'conversation-starter',
    label: 'Conversation starter',
    description: 'Invite a useful response or opinion.',
  },
  {
    value: 'practical-takeaway',
    label: 'Practical takeaway',
    description: 'Teach one useful idea natively.',
  },
  {
    value: 'behind-the-scenes',
    label: 'Behind the scenes',
    description: 'Explain why or how the post was made.',
  },
];

const linkPlacementOptions: readonly LabelledOption<BlogSocialLinkPlacement>[] = [
  {value: 'post', label: 'In the post', description: 'Include the article URL in the main copy.'},
  {value: 'first-comment', label: 'First comment', description: 'Lead with native content, then add the link.'},
  {value: 'profile', label: 'Profile link', description: 'Point readers to the link in your profile.'},
  {value: 'none', label: 'No link', description: 'Optimize this share for reach and conversation.'},
];

const mediaTypeOptions: readonly LabelledOption<BlogSocialMediaType | 'none'>[] = [
  {value: 'image', label: 'Image'},
  {value: 'video', label: 'Video'},
  {value: 'none', label: 'No native media'},
];

const statusOptions: readonly LabelledOption<EditableSocialStatus>[] = [
  {value: 'draft', label: 'Draft'},
  {value: 'scheduled', label: 'Scheduled'},
  {value: 'cancelled', label: 'Cancelled'},
];

const postFormatLabels: Readonly<Record<BlogSocialPostFormat, string>> = {
  text: 'Text post',
  link: 'Link post',
  image: 'Image post',
  video: 'Video post',
  reel: 'Reel / short video',
  story: 'Story',
  carousel: 'Carousel',
  thread: 'Thread',
  community: 'Community post',
};

function createAnnouncementId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `social-${crypto.randomUUID()}`;
  }

  return `social-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function toDateTimeLocalValue(value: string | undefined): string {
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

function fromDateTimeLocalValue(value: string): string | undefined {
  const date = new Date(value);
  return value.trim() && Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function announcementUpdatedTimestamp(announcement: BlogSocialAnnouncement): number {
  const updatedAt = new Date(announcement.updatedAt).getTime();
  return Number.isFinite(updatedAt) ? updatedAt : 0;
}

function isEditableChannel(channel: BlogSocialChannel | undefined): channel is EditableSocialChannel {
  return channel !== undefined && channel !== 'notify' && channelById.has(channel);
}

function isValidPublicMediaUrl(value: string | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function toPublicMediaUrl(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue || isValidPublicMediaUrl(trimmedValue)) {
    return trimmedValue;
  }

  const normalizedPath = trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`;
  return `${SITE_URL.replace(/\/$/, '')}${normalizedPath}`;
}

@Component({
  selector: 'app-social-promotion-editor',
  imports: [CommonModule, FaIconComponent, BlogMediaUploaderComponent],
  templateUrl: './social-promotion-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialPromotionEditorComponent {
  private readonly aiFunctions = inject(BlogAiFunctionsService);
  private readonly draftIdByChannel = new Map<EditableSocialChannel, string>();
  private lastHydrationKey = '';

  readonly post = input.required<BlogPost>();
  readonly mode = input<SocialPromotionEditorMode>('compose');
  readonly initialChannel = input<BlogSocialChannel>();
  readonly initialAnnouncementId = input<string>();
  readonly createNew = input(false);
  readonly saving = input(false);
  readonly assistantContextProvider = input<(() => Promise<BlogAssistantContext>) | undefined>();

  readonly promotionChange = output<BlogSocialPromotion>();
  readonly saveRequested = output<BlogSocialPromotion>();
  readonly dirtyChange = output<boolean>();
  readonly openCalendarRequested = output<void>();

  protected readonly channels = socialChannelOptions;
  protected readonly angles = contentAngleOptions;
  protected readonly linkPlacements = linkPlacementOptions;
  protected readonly mediaTypes = mediaTypeOptions;
  protected readonly statuses = statusOptions;
  protected readonly maxSocialImageSizeBytes = 8 * 1024 * 1024;
  protected readonly maxSocialVideoSizeBytes = 25 * 1024 * 1024;

  protected readonly activeChannel = signal<EditableSocialChannel>('facebook');
  protected readonly activeAnnouncement = signal<BlogSocialAnnouncement | null>(null);
  protected readonly announcements = signal<readonly BlogSocialAnnouncement[]>([]);
  protected readonly isDirty = signal(false);
  protected readonly isAiLoading = signal(false);
  protected readonly aiError = signal('');
  protected readonly aiNotice = signal('');
  protected readonly aiInstruction = signal('');
  protected readonly aiSuggestions = signal<readonly BlogSocialAiSuggestion[]>([]);
  protected readonly publishingPackNotice = signal('');

  protected readonly activeChannelOption = computed(
    () => channelById.get(this.activeChannel()) ?? socialChannelOptions[0]
  );
  protected readonly characterCount = computed(() => this.activeAnnouncement()?.message.length ?? 0);
  protected readonly isOverCharacterLimit = computed(
    () => this.characterCount() > this.activeChannelOption().characterLimit
  );
  protected readonly isLifecycleReadOnly = computed(() => {
    const status = this.activeAnnouncement()?.status;
    return status === 'queued' || status === 'posted' || status === 'failed';
  });
  protected readonly hasMediaValidationError = computed(() => {
    const announcement = this.activeAnnouncement();
    if (!announcement) {
      return false;
    }

    const mediaFormat = announcement.postFormat === 'image'
      || announcement.postFormat === 'video'
      || announcement.postFormat === 'reel'
      || announcement.postFormat === 'story'
      || announcement.postFormat === 'carousel';
    const mediaRequired = this.activeChannel() === 'instagram' || mediaFormat;

    return (mediaRequired && !announcement.mediaType)
      || Boolean(announcement.mediaType && !isValidPublicMediaUrl(announcement.mediaUrl));
  });
  protected readonly scheduleValidationError = computed(() => {
    const announcement = this.activeAnnouncement();
    if (!announcement || announcement.status !== 'scheduled') {
      return '';
    }

    const scheduledTimestamp = announcement.scheduledAt
      ? new Date(announcement.scheduledAt).getTime()
      : Number.NaN;
    if (!Number.isFinite(scheduledTimestamp)) {
      return 'Choose a valid delivery date and time.';
    }
    if (scheduledTimestamp <= Date.now()) {
      return 'The delivery time must be in the future.';
    }

    const post = this.post();
    const articlePublishTimestamp = post.status === 'scheduled' && post.publishedAt
      ? new Date(post.publishedAt).getTime()
      : Number.NaN;
    if (Number.isFinite(articlePublishTimestamp) && scheduledTimestamp < articlePublishTimestamp) {
      return 'Social delivery cannot happen before the scheduled article publication.';
    }

    return '';
  });
  protected readonly availableFormats = computed(
    () => socialPostFormatsForChannel(this.activeChannel())
  );
  protected readonly canSave = computed(() => {
    const announcement = this.activeAnnouncement();
    if (
      !announcement
      || this.isLifecycleReadOnly()
      || !announcement.message.trim()
      || this.isOverCharacterLimit()
      || this.hasMediaValidationError()
    ) {
      return false;
    }

    if (announcement.status !== 'scheduled') {
      return true;
    }

    return !this.scheduleValidationError();
  });
  protected readonly socialImage = computed(
    () => this.post().og?.image?.trim() || this.post().seo.openGraphImage?.trim() || ''
  );
  protected readonly coverImage = computed(() => this.post().coverImage.trim());
  protected readonly articleUrl = computed(
    () => `${SITE_URL.replace(/\/$/, '')}/blog/${this.post().slug}`
  );
  protected readonly canUseAtPublish = computed(() => Boolean(this.futureArticlePublishDate()));

  constructor() {
    effect(() => {
      const post = this.post();
      const initialChannel = this.initialChannel();
      const initialAnnouncementId = this.initialAnnouncementId();
      const createNew = this.createNew();
      const key = this.createHydrationKey(post, initialChannel, initialAnnouncementId, createNew);

      untracked(() => {
        if (key === this.lastHydrationKey) {
          return;
        }

        this.lastHydrationKey = key;
        this.hydrate(post, initialChannel, initialAnnouncementId, createNew);
      });
    });
  }

  protected selectChannel(channel: EditableSocialChannel): void {
    if (channel === this.activeChannel()) {
      return;
    }

    const active = this.activeAnnouncement();
    if (active) {
      this.draftIdByChannel.set(this.activeChannel(), active.id);
    }

    this.activeChannel.set(channel);
    if (this.createNew()) {
      const preferredId = this.draftIdByChannel.get(channel);
      const preferred = preferredId
        ? this.announcements().find(announcement => announcement.id === preferredId)
        : undefined;
      const announcement = preferred ? {...preferred} : this.createDraft(channel);
      this.draftIdByChannel.set(channel, announcement.id);
      this.activeAnnouncement.set(announcement);
    } else {
      this.activateAnnouncement(channel);
    }
    this.clearAiSuggestions();
  }

  protected onChannelKeydown(event: KeyboardEvent, channel: EditableSocialChannel): void {
    const currentIndex = this.channels.findIndex(option => option.id === channel);
    let nextIndex: number | undefined;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % this.channels.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + this.channels.length) % this.channels.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = this.channels.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextChannel = this.channels[nextIndex]?.id;
    if (!nextChannel) {
      return;
    }

    this.selectChannel(nextChannel);
    const tabList = (event.currentTarget as HTMLElement | null)?.parentElement;
    queueMicrotask(() => tabList
      ?.querySelector<HTMLElement>(`#social-tab-${nextChannel}`)
      ?.focus());
  }

  protected startAnotherDraft(): void {
    const current = this.activeAnnouncement();
    if (current && !this.isLifecycleReadOnly()) {
      this.commitAndCreatePromotion(current);
    }

    const channel = this.activeChannel();
    const announcement = this.createDraft(channel);
    this.draftIdByChannel.set(channel, announcement.id);
    this.activeAnnouncement.set(announcement);
    this.clearAiSuggestions();
  }

  protected createRetryDraft(): void {
    const failed = this.activeAnnouncement();
    if (!failed || failed.status !== 'failed') {
      return;
    }

    const now = new Date().toISOString();
    const retry: BlogSocialAnnouncement = {
      ...failed,
      id: createAnnouncementId(),
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      scheduledAt: undefined,
      postedAt: undefined,
      failureReason: undefined,
    };
    this.draftIdByChannel.set(this.activeChannel(), retry.id);
    this.activeAnnouncement.set(retry);
    this.clearAiSuggestions();
  }

  protected onAngleChange(event: Event): void {
    this.updateActive({contentAngle: (event.target as HTMLSelectElement).value as BlogSocialContentAngle});
  }

  protected onFormatChange(event: Event): void {
    const postFormat = (event.target as HTMLSelectElement).value as BlogSocialPostFormat;
    const mediaType = postFormat === 'video' || postFormat === 'reel'
      ? 'video'
      : postFormat === 'image' || postFormat === 'story' || postFormat === 'carousel'
        ? 'image'
        : this.activeAnnouncement()?.mediaType;
    this.updateActive({postFormat, ...(mediaType ? {mediaType} : {})});
  }

  protected onLinkPlacementChange(event: Event): void {
    const linkPlacement = (event.target as HTMLSelectElement).value as BlogSocialLinkPlacement;
    this.updateActive({
      linkPlacement,
      ...(linkPlacement === 'none'
        ? {linkUrl: undefined}
        : {linkUrl: this.campaignArticleUrl(this.activeChannel())}),
    });
  }

  protected onMediaTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as BlogSocialMediaType | 'none';
    this.updateActive({
      mediaType: value === 'none' ? undefined : value,
      mediaUrl: undefined,
    });
  }

  protected onMediaUrlChange(value: string): void {
    const mediaUrl = value.trim();
    this.updateActive({mediaUrl: mediaUrl || undefined});
  }

  protected allowedMediaTypes(mediaType: BlogSocialMediaType): readonly BlogSocialMediaType[] {
    return [mediaType];
  }

  protected mediaAccept(mediaType: BlogSocialMediaType): string {
    return mediaType === 'video' ? 'video/*' : 'image/*';
  }

  protected mediaMaxSizeBytes(mediaType: BlogSocialMediaType): number {
    return mediaType === 'video' ? this.maxSocialVideoSizeBytes : this.maxSocialImageSizeBytes;
  }

  protected mediaLabel(mediaType: BlogSocialMediaType): string {
    return mediaType === 'video' ? 'Social video' : 'Social image';
  }

  protected usePostImage(value: string): void {
    if (!value) {
      return;
    }

    this.updateActive({mediaType: 'image', mediaUrl: toPublicMediaUrl(value)});
  }

  protected clearMedia(): void {
    this.updateActive({mediaType: undefined, mediaUrl: undefined});
  }

  protected onMessageInput(event: Event): void {
    this.updateActive({message: (event.target as HTMLTextAreaElement).value});
  }

  protected regenerateStarterCopy(): void {
    const announcement = this.activeAnnouncement();
    if (!announcement) {
      return;
    }

    this.updateActive({
      message: createBlogSocialMessage(
        this.activeChannel(),
        this.post(),
        announcement.contentAngle ?? defaultSocialContentAngle(this.activeChannel()),
        announcement.linkPlacement ?? defaultSocialLinkPlacement(this.activeChannel()),
        SITE_URL
      ),
    });
    this.clearAiSuggestions();
  }

  protected async copyPublishingPack(): Promise<void> {
    const announcement = this.activeAnnouncement();
    if (!announcement?.message.trim()) {
      return;
    }

    this.publishingPackNotice.set('');
    try {
      await this.copyTextToClipboard(this.createPublishingPack(announcement));
      this.publishingPackNotice.set(
        `Copied the ${this.activeChannelOption().label} publishing pack. Open the native app and paste it when you are ready.`
      );
    } catch {
      this.publishingPackNotice.set('Clipboard access is unavailable in this browser. Copy the draft manually.');
    }
  }

  protected onStatusChange(event: Event): void {
    const status = (event.target as HTMLSelectElement).value as EditableSocialStatus;
    if (status !== 'scheduled') {
      this.updateActive({status, scheduledAt: undefined});
      return;
    }

    const active = this.activeAnnouncement();
    const publishDate = this.futureArticlePublishDate();
    const deliveryTiming = active?.deliveryTiming === 'at-publish' && publishDate
      ? 'at-publish'
      : 'scheduled';
    this.updateActive({
      status,
      deliveryTiming,
      scheduledAt: deliveryTiming === 'at-publish'
        ? publishDate
        : this.validCustomSchedule(active?.scheduledAt),
    });
  }

  protected onTimingChange(event: Event): void {
    const deliveryTiming = (event.target as HTMLSelectElement).value as BlogSocialDeliveryTiming;
    const active = this.activeAnnouncement();
    const publishDate = this.futureArticlePublishDate();

    this.updateActive({
      deliveryTiming,
      ...(active?.status === 'scheduled'
        ? {scheduledAt: deliveryTiming === 'at-publish' ? publishDate : this.validCustomSchedule(active.scheduledAt)}
        : {}),
    });
  }

  protected onScheduleChange(event: Event): void {
    this.updateActive({scheduledAt: fromDateTimeLocalValue((event.target as HTMLInputElement).value)});
  }

  protected onAiInstructionInput(event: Event): void {
    this.aiInstruction.set((event.target as HTMLInputElement).value);
  }

  protected async generateAiSuggestions(): Promise<void> {
    const announcement = this.activeAnnouncement();
    if (!announcement || this.isAiLoading() || this.isLifecycleReadOnly()) {
      return;
    }

    this.isAiLoading.set(true);
    this.aiError.set('');
    this.aiNotice.set('');
    this.aiSuggestions.set([]);

    try {
      const provider = this.assistantContextProvider();
      const context = provider ? await provider() : this.createAssistantContext(this.post());
      const instruction = this.aiInstruction().trim();
      const postFormat = announcement.postFormat;
      const result = await this.aiFunctions.generateSocialPosts({
        context,
        articleUrl: this.campaignArticleUrl(this.activeChannel()),
        targets: [{
          channel: this.activeChannel(),
          angle: announcement.contentAngle ?? defaultSocialContentAngle(this.activeChannel()),
          linkPlacement: announcement.linkPlacement ?? defaultSocialLinkPlacement(this.activeChannel()),
          ...(announcement.message.trim() ? {currentMessage: announcement.message} : {}),
          ...(postFormat && BLOG_SOCIAL_AI_POST_FORMATS.includes(
            postFormat as typeof BLOG_SOCIAL_AI_POST_FORMATS[number]
          ) ? {postFormat: postFormat as typeof BLOG_SOCIAL_AI_POST_FORMATS[number]} : {}),
        }],
        ...(instruction ? {instruction} : {}),
      });
      const suggestions = result.suggestions.filter(
        suggestion => suggestion.channel === this.activeChannel()
      );

      if (suggestions.length === 0) {
        throw new Error('The assistant returned no social post variants.');
      }

      this.aiSuggestions.set(suggestions);
      this.aiNotice.set(`${suggestions.length} distinct ${this.activeChannelOption().label} variants are ready to review.`);
    } catch {
      const suggestions = this.createLocalSuggestions(announcement);
      this.aiSuggestions.set(suggestions);
      this.aiError.set('AI assistance is unavailable right now. Starter variants are available below so you can keep working.');
    } finally {
      this.isAiLoading.set(false);
    }
  }

  protected applyAiSuggestion(suggestion: BlogSocialAiSuggestion): void {
    this.updateActive({message: suggestion.message});
    this.aiNotice.set('Variant applied to the draft. Review and save when it feels right.');
  }

  protected requestSave(): void {
    const active = this.activeAnnouncement();
    if (!active || !this.canSave()) {
      return;
    }

    const promotion = this.commitAndCreatePromotion(active);
    this.saveRequested.emit(promotion);
  }

  protected requestOpenCalendar(): void {
    this.openCalendarRequested.emit();
  }

  protected isChannelActive(channel: EditableSocialChannel): boolean {
    return this.activeChannel() === channel;
  }

  protected channelState(channel: EditableSocialChannel): string {
    const announcements = this.announcements().filter(item => item.channel === channel);
    const active = this.activeAnnouncement();
    if (this.activeChannel() === channel && active && !announcements.some(item => item.id === active.id)) {
      return 'Not saved';
    }

    if (announcements.length === 0) {
      return 'Not started';
    }

    const latest = this.findLatest(announcements);
    const count = announcements.length > 1 ? ` · ${announcements.length} posts` : '';
    return `${this.statusLabel(latest?.status ?? 'draft')}${count}`;
  }

  protected hasChannelWork(channel: EditableSocialChannel): boolean {
    return this.announcements().some(item => item.channel === channel);
  }

  protected statusLabel(status: BlogSocialAnnouncementStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  protected formatLabel(postFormat: BlogSocialPostFormat | undefined): string {
    return postFormat ? postFormatLabels[postFormat] : 'Channel default';
  }

  protected angleDescription(angle: BlogSocialContentAngle | undefined): string {
    return contentAngleOptions.find(option => option.value === angle)?.description ?? '';
  }

  protected linkPlacementLabel(linkPlacement: BlogSocialLinkPlacement | undefined): string {
    return linkPlacementOptions.find(option => option.value === linkPlacement)?.label ?? 'In the post';
  }

  protected formatDateTime(value: string | undefined): string {
    if (!value) {
      return 'No delivery time yet';
    }

    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return 'Invalid delivery time';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  protected toDateTimeLocal(value: string | undefined): string {
    return toDateTimeLocalValue(value);
  }

  private hydrate(
    post: BlogPost,
    initialChannel: BlogSocialChannel | undefined,
    initialAnnouncementId: string | undefined,
    createNew: boolean
  ): void {
    const announcements = [...(post.socialPromotion?.announcements ?? [])];
    const selected = initialAnnouncementId
      ? announcements.find(announcement => announcement.id === initialAnnouncementId)
      : undefined;
    const channel = selected && isEditableChannel(selected.channel)
      ? selected.channel
      : isEditableChannel(initialChannel)
        ? initialChannel
        : 'facebook';

    this.announcements.set(announcements);
    this.draftIdByChannel.clear();
    if (selected && isEditableChannel(selected.channel)) {
      this.draftIdByChannel.set(selected.channel, selected.id);
    }
    this.activeChannel.set(channel);
    if (createNew && !selected) {
      const announcement = this.createDraft(channel);
      this.draftIdByChannel.set(channel, announcement.id);
      this.activeAnnouncement.set(announcement);
    } else {
      this.activateAnnouncement(channel);
    }
    this.isDirty.set(false);
    this.dirtyChange.emit(false);
    this.clearAiSuggestions();
  }

  private activateAnnouncement(channel: EditableSocialChannel): void {
    const announcements = this.announcements().filter(announcement => announcement.channel === channel);
    const preferredId = this.draftIdByChannel.get(channel);
    const preferred = preferredId
      ? announcements.find(announcement => announcement.id === preferredId)
      : undefined;
    const latest = preferred ?? this.findLatest(announcements);
    const active = latest ? {...latest} : this.createDraft(channel);

    this.draftIdByChannel.set(channel, active.id);
    this.activeAnnouncement.set(active);
  }

  private findLatest(
    announcements: readonly BlogSocialAnnouncement[]
  ): BlogSocialAnnouncement | undefined {
    return [...announcements].sort(
      (first, second) => announcementUpdatedTimestamp(second) - announcementUpdatedTimestamp(first)
    )[0];
  }

  private createDraft(channel: EditableSocialChannel): BlogSocialAnnouncement {
    const now = new Date().toISOString();
    const contentAngle = defaultSocialContentAngle(channel);
    const linkPlacement = defaultSocialLinkPlacement(channel);
    const postFormat = defaultSocialPostFormat(channel);
    const image = toPublicMediaUrl(this.socialImage() || this.coverImage());
    const shouldUseImage = postFormat === 'image' || postFormat === 'story' || postFormat === 'carousel';
    const shouldUseVideo = postFormat === 'video' || postFormat === 'reel';
    const shouldSchedule = this.mode() === 'schedule';
    const publishDate = this.futureArticlePublishDate();
    const deliveryTiming: BlogSocialDeliveryTiming = publishDate ? 'at-publish' : 'scheduled';

    return {
      id: createAnnouncementId(),
      channel,
      message: createBlogSocialMessage(channel, this.post(), contentAngle, linkPlacement, SITE_URL),
      status: shouldSchedule ? 'scheduled' : 'draft',
      createdAt: now,
      updatedAt: now,
      deliveryTiming,
      contentAngle,
      linkPlacement,
      postFormat,
      ...(linkPlacement === 'none' ? {} : {linkUrl: this.campaignArticleUrl(channel)}),
      ...(shouldUseImage && image ? {mediaType: 'image', mediaUrl: image} : {}),
      ...(shouldUseVideo ? {mediaType: 'video'} : {}),
      ...(shouldSchedule ? {scheduledAt: publishDate ?? this.validCustomSchedule(undefined)} : {}),
    };
  }

  private updateActive(patch: Partial<BlogSocialAnnouncement>): void {
    const active = this.activeAnnouncement();
    if (!active || active.status === 'queued' || active.status === 'posted') {
      return;
    }

    const next: BlogSocialAnnouncement = {
      ...active,
      ...patch,
      id: active.id,
      channel: active.channel,
      createdAt: active.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.activeAnnouncement.set(next);
    this.draftIdByChannel.set(this.activeChannel(), next.id);
    this.commitAndCreatePromotion(next);
  }

  private campaignArticleUrl(channel: BlogSocialChannel): string {
    return createBlogSocialCampaignUrl(channel, this.post(), SITE_URL);
  }

  private createPublishingPack(announcement: BlogSocialAnnouncement): string {
    const message = announcement.message.trim();
    const linkUrl = announcement.linkUrl?.trim();
    if (!linkUrl || message.includes(linkUrl)) {
      return message;
    }

    const placement = announcement.linkPlacement === 'first-comment'
      ? 'Article link for the first comment'
      : announcement.linkPlacement === 'profile'
        ? 'Article link for the profile'
        : 'Article link';
    return `${message}\n\n${placement}: ${linkUrl}`;
  }

  private async copyTextToClipboard(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const didCopy = document.execCommand('copy');
    textarea.remove();

    if (!didCopy) {
      throw new Error('Clipboard access is unavailable.');
    }
  }

  private commitAndCreatePromotion(active: BlogSocialAnnouncement): BlogSocialPromotion {
    const current = this.announcements();
    const nextAnnouncements = current.some(announcement => announcement.id === active.id)
      ? current.map(announcement => announcement.id === active.id ? active : announcement)
      : [...current, active];
    const promotion: BlogSocialPromotion = {
      announcements: nextAnnouncements.map(announcement => this.cleanAnnouncement(announcement)),
    };

    this.announcements.set(promotion.announcements);
    this.activeAnnouncement.set(
      promotion.announcements.find(announcement => announcement.id === active.id) ?? active
    );
    this.isDirty.set(true);
    this.lastHydrationKey = this.createHydrationKey(
      {...this.post(), socialPromotion: promotion},
      this.initialChannel(),
      this.initialAnnouncementId(),
      this.createNew()
    );
    this.promotionChange.emit(promotion);
    this.dirtyChange.emit(true);
    return promotion;
  }

  private cleanAnnouncement(announcement: BlogSocialAnnouncement): BlogSocialAnnouncement {
    const {
      scheduledAt,
      postedAt,
      linkUrl,
      mediaUrl,
      mediaType,
      linkPlacement,
      contentAngle,
      postFormat,
      failureReason,
      ...required
    } = announcement;

    return {
      ...required,
      ...(scheduledAt ? {scheduledAt} : {}),
      ...(postedAt ? {postedAt} : {}),
      ...(linkUrl ? {linkUrl} : {}),
      ...(mediaUrl ? {mediaUrl} : {}),
      ...(mediaType ? {mediaType} : {}),
      ...(linkPlacement ? {linkPlacement} : {}),
      ...(contentAngle ? {contentAngle} : {}),
      ...(postFormat ? {postFormat} : {}),
      ...(failureReason ? {failureReason} : {}),
    };
  }

  private createAssistantContext(post: BlogPost): BlogAssistantContext {
    return {
      title: post.title,
      excerpt: post.excerpt,
      seoTitle: post.seo.metaTitle ?? post.seo.title,
      seoDescription: post.seo.metaDescription ?? post.seo.description,
      categories: post.categories,
      tags: post.tags,
      blocks: post.blocks,
    };
  }

  private createLocalSuggestions(announcement: BlogSocialAnnouncement): readonly BlogSocialAiSuggestion[] {
    const primaryAngle = announcement.contentAngle ?? defaultSocialContentAngle(this.activeChannel());
    const alternativeAngles = contentAngleOptions
      .map(option => option.value)
      .filter(angle => angle !== primaryAngle)
      .slice(0, 2);
    const angles = [primaryAngle, ...alternativeAngles];

    return angles.map((angle, index) => ({
      id: `local-${this.activeChannel()}-${angle}-${index}`,
      channel: this.activeChannel(),
      message: createBlogSocialMessage(
        this.activeChannel(),
        this.post(),
        angle,
        announcement.linkPlacement ?? defaultSocialLinkPlacement(this.activeChannel()),
        SITE_URL
      ),
      rationale: index === 0
        ? 'Keeps the selected editorial angle and uses the article facts already in the draft.'
        : `Offers a ${contentAngleOptions.find(option => option.value === angle)?.label.toLowerCase()} alternative without inventing new details.`,
      mediaConcept: this.localMediaConcept(announcement, angle),
    }));
  }

  private localMediaConcept(
    announcement: BlogSocialAnnouncement,
    angle: BlogSocialContentAngle
  ): string {
    if (announcement.mediaType === 'video') {
      return angle === 'behind-the-scenes'
        ? 'A short native video showing the process behind the article.'
        : 'A concise talking-head clip that delivers one useful idea before mentioning the article.';
    }

    if (announcement.mediaType === 'image') {
      return 'Use the post social image or a simple native image with one clear visual idea and minimal text.';
    }

    return 'This variant can work as a text-first post; add native media only if it strengthens the opening.';
  }

  private clearAiSuggestions(): void {
    this.aiSuggestions.set([]);
    this.aiError.set('');
    this.aiNotice.set('');
  }

  private futureArticlePublishDate(): string | undefined {
    const post = this.post();
    if (post.status !== 'scheduled' || !post.publishedAt) {
      return undefined;
    }

    const timestamp = new Date(post.publishedAt).getTime();
    return Number.isFinite(timestamp) && timestamp > Date.now()
      ? post.publishedAt
      : undefined;
  }

  private validCustomSchedule(currentValue: string | undefined): string {
    const currentTimestamp = currentValue ? new Date(currentValue).getTime() : Number.NaN;
    const publishDate = this.futureArticlePublishDate();
    const publishTimestamp = publishDate
      ? new Date(publishDate).getTime()
      : Number.NEGATIVE_INFINITY;
    const earliestTimestamp = Math.max(
      Date.now() + 60 * 60 * 1000,
      publishTimestamp
    );

    return Number.isFinite(currentTimestamp) && currentTimestamp >= earliestTimestamp
      ? currentValue ?? new Date(earliestTimestamp).toISOString()
      : new Date(earliestTimestamp).toISOString();
  }

  private createHydrationKey(
    post: BlogPost,
    initialChannel: BlogSocialChannel | undefined,
    initialAnnouncementId: string | undefined,
    createNew: boolean
  ): string {
    return JSON.stringify({
      postId: post.id,
      updatedAt: post.updatedAt,
      initialChannel,
      initialAnnouncementId,
      createNew,
      mode: this.mode(),
      announcements: post.socialPromotion?.announcements ?? [],
    });
  }
}
