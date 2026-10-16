import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import type {OutputData} from '@editorjs/editorjs';
import {Subject, debounceTime, lastValueFrom, tap} from 'rxjs';

import {DEFAULT_AUTHOR_ID} from '../../../../features/authors/authors.constants';
import {AuthorProfile} from '../../../../features/authors/models/author.model';
import {AuthorRepositoryService} from '../../../../features/authors/services/author-repository.service';
import {
  BLOG_EVIDENCE_BASES,
  BlogContentBlock,
  BlogEditorialMetadata,
  BlogEvidenceBasis,
  BlogPost,
  BlogPostStatus,
  BlogReaderRelease,
} from '../../../../features/blog/models/blog-post.model';
import {BlogPostRevisionConflictError, normalizeBlogPostRevision} from '../../../../features/blog/models/blog-post-revision.model';
import {
  BLOG_SOCIAL_CHANNELS,
  BlogSocialChannel,
  BlogSocialPromotion,
} from '../../../../features/blog/models/blog-social-promotion.model';
import {BlogRepositoryService, createBlogSlug} from '../../../../features/blog/services/blog-repository.service';
import {getReaderReleaseDateError, isBlogReaderRelease, normalizeBlogReaderRelease} from '../../../../features/blog/utils/blog-reader-release.util';
import {DEFAULT_COVER_IMAGE} from '../../../../features/blog/blog.constants';
import {
  BLOG_POST_STATUSES,
  isBlogContentBlock,
  isBlogPost,
  isRecord,
  isStringArray
} from '../../../../features/blog/utils/blog-validation.util';
import {SITE_URL} from '../../../../shared/seo/seo.metadata';
import {AdminControlModuleComponent} from '../../../shared/admin-control-module.component';
import {
  EditorImageUploadProgressCallback,
  EditorImageUploadResult,
  EditorJsComponent,
} from '../../components/editor-js/editor-js.component';
import {BlogMediaUploaderComponent} from '../../components/media-uploader/blog-media-uploader.component';
import {CmsAssistantPanelComponent} from '../../components/assistant-panel/cms-assistant-panel.component';
import {CmsDraftPreviewPanelComponent} from '../../components/draft-preview-panel/cms-draft-preview-panel.component';
import {CmsSeoChecklistComponent} from '../../components/seo-checklist/cms-seo-checklist.component';
import {
  BlogAssistantContext,
  BlogAssistantResult,
  BlogMetadataSuggestion,
  BlogStoredThumbnail,
  BlogThumbnailSuggestion,
} from '../../models/blog-ai-assistant.model';
import {EditorSavedDocument} from '../../models/editor-document.model';
import {CmsPostRecoverySnapshot, CmsPostRecoveryWrite} from '../../models/post-recovery.model';
import {BlogAiAssistantService} from '../../services/blog-ai-assistant.service';
import {BlogAiFunctionsService} from '../../services/blog-ai-functions.service';
import {BlogMediaUploadResult, BlogMediaUploadService} from '../../services/blog-media-upload.service';
import {CmsProductionPreviewComponent} from '../../components/production-preview/cms-production-preview.component';
import {CmsToastContainerComponent} from '../../components/toast/cms-toast.component';
import {CmsToastService} from '../../services/cms-toast.service';
import {CmsPostRecoveryService} from '../../services/post-recovery.service';
import {createBlogBlocksFromEditorDocument, createEditorDocument} from '../../utils/blog-editorjs-adapter';
import {
  createCmsCatCornerFormValue,
  normalizeCmsCatCornerSettings,
  parseCmsCatCornerSettings,
} from '../../utils/blog-cat-corner-metadata.util';
import {createBlogBlocksFromMarkdown} from '../../utils/blog-markdown-import.util';
import {SeoChecklistInput} from '../../utils/blog-seo-checklist';
import {getRemotePostDisposition} from '../../utils/post-editor-reliability.util';
import {
  BLOG_EVIDENCE_BASIS_LABELS,
  normalizeBlogEditorialMetadata,
} from '../../../../features/blog/utils/blog-editorial-metadata.util';
import {CmsAuthorFormComponent} from '../../components/author-form/author-form.component';
import {SocialPromotionEditorComponent} from '../../components/social-promotion-editor/social-promotion-editor.component';
import {PostScheduleCalendarComponent} from './post-schedule-calendar.component';
import {
  PostPackageImportProgress,
  PostPackageImportProgressComponent,
} from './post-package-import-progress.component';
import {
  getEmbeddedBlogPostMediaPackageManifest,
  getUnresolvedBlogPostMediaPackageReferences,
  isBlogPostPackagePostDocument,
  matchBlogPostPackageImageFiles,
  replaceBlogPostMediaPackageReferences,
} from '../../utils/blog-post-media-package.util';

type PostEditorWorkspace = 'import' | 'post' | 'social' | 'preview';
type PostEditorSettings = 'details' | 'media' | 'evidence' | 'search' | 'publish' | 'tools';

interface PostEditorWorkspaceTab {
  id: PostEditorWorkspace;
  label: string;
  description: string;
}

const POST_EDITOR_WORKSPACES: readonly PostEditorWorkspaceTab[] = [
  {id: 'post', label: 'Edit', description: 'Write and organize the article'},
  {id: 'social', label: 'Social shares', description: 'Compose native platform posts'},
  {id: 'preview', label: 'Review & publish', description: 'Check the reader experience and release'},
];

function isPostEditorWorkspace(value: string | null): value is PostEditorWorkspace {
  return value === 'import' || POST_EDITOR_WORKSPACES.some(workspace => workspace.id === value);
}

function isComposableSocialChannel(value: string | null): value is BlogSocialChannel {
  return value !== null
    && value !== 'notify'
    && BLOG_SOCIAL_CHANNELS.includes(value as BlogSocialChannel);
}

interface PostEditorForm {
  authorId: FormControl<string>;
  title: FormControl<string>;
  slug: FormControl<string>;
  excerpt: FormControl<string>;
  coverImage: FormControl<string>;
  backgroundImage: FormControl<string>;
  featured: FormControl<boolean>;
  catCornerEnabled: FormControl<boolean>;
  catCornerDiscoveryPost: FormControl<boolean>;
  status: FormControl<BlogPostStatus>;
  publishedAt: FormControl<string>;
  announceInSchedule: FormControl<boolean>;
  earlyAccessAt: FormControl<string>;
  categories: FormControl<string>;
  tags: FormControl<string>;
  seoTitle: FormControl<string>;
  seoDescription: FormControl<string>;
  canonical: FormControl<string>;
  openGraphImage: FormControl<string>;
  evidenceBasis: FormControl<BlogEvidenceBasis | ''>;
  evidenceSummary: FormControl<string>;
  sourceReviewedAt: FormControl<string>;
  relationshipDisclosure: FormControl<string>;
  aiAssistanceDisclosure: FormControl<string>;
  syntheticMediaDisclosure: FormControl<string>;
  updateNote: FormControl<string>;
}

interface ImportedPostDocument {
  post: BlogPost;
  sourceLabel: string;
}

const BLOG_CANONICAL_BASE_URL = `${SITE_URL}/blog`;
const statusOptions: readonly BlogPostStatus[] = BLOG_POST_STATUSES;
const evidenceBasisOptions = BLOG_EVIDENCE_BASES.map(value => ({
  value,
  label: BLOG_EVIDENCE_BASIS_LABELS[value],
}));
const postedDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function createPostBackupFileName(slug: string): string {
  return `cms-blog-post-${createBlogSlug(slug)}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

function toCsv(values: readonly string[]): string {
  return values.join(', ');
}

function fromCsv(value: string): readonly string[] {
  return [...new Set(
    value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0)
  )];
}

function requiredText(value: string, fallback: string): string {
  const trimmedValue = value.trim();
  return trimmedValue || fallback;
}

function normalizeOpenGraphImage(value: string | undefined, coverImage: string): string {
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue && trimmedValue !== coverImage ? trimmedValue : '';
}

function createEditorialMetadataFromForm(value: {
  evidenceBasis: BlogEvidenceBasis | '';
  evidenceSummary: string;
  sourceReviewedAt: string;
  relationshipDisclosure: string;
  aiAssistanceDisclosure: string;
  syntheticMediaDisclosure: string;
  updateNote: string;
}): BlogEditorialMetadata | undefined {
  return normalizeBlogEditorialMetadata({
    evidenceBasis: value.evidenceBasis || undefined,
    evidenceSummary: value.evidenceSummary,
    sourceReviewedAt: value.sourceReviewedAt,
    relationshipDisclosure: value.relationshipDisclosure,
    aiAssistanceDisclosure: value.aiAssistanceDisclosure,
    syntheticMediaDisclosure: value.syntheticMediaDisclosure,
    updateNote: value.updateNote,
  });
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const date = new Date(trimmedValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createReaderReleaseFromForm(value: {announceInSchedule: boolean; earlyAccessAt: string}): BlogReaderRelease | undefined {
  const earlyAccessAt = fromDateTimeLocalValue(value.earlyAccessAt);
  if (!value.announceInSchedule && !earlyAccessAt) return undefined;
  return {announceInSchedule: value.announceInSchedule, earlyAccessAt};
}

function isBlogPostStatus(value: unknown): value is BlogPostStatus {
  return typeof value === 'string' && statusOptions.includes(value as BlogPostStatus);
}

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getPositiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value.trim());
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
  }

  return undefined;
}

function isEditorDocument(value: unknown): value is OutputData {
  return isRecord(value) && Array.isArray(value['blocks']);
}

function getImportedStringArray(value: unknown): readonly string[] {
  if (isStringArray(value)) {
    return value;
  }

  return typeof value === 'string' ? fromCsv(value) : [];
}

function getImportedIsoDate(value: unknown): string | null {
  const dateValue = getTrimmedString(value);

  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createImportedAuthor(value: unknown, fallback: BlogPost['author']): BlogPost['author'] {
  if (typeof value === 'string') {
    return {
      ...fallback,
      name: requiredText(value, fallback.name),
    };
  }

  if (!isRecord(value)) {
    return fallback;
  }

  return {
    ...fallback,
    name: requiredText(getTrimmedString(value['name']), fallback.name),
    title: getTrimmedString(value['title']) || fallback.title,
  };
}

function createImportedOpenGraph(value: unknown): BlogPost['og'] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const imageWidth = getPositiveInteger(value['imageWidth']) ?? getPositiveInteger(value['width']);
  const imageHeight = getPositiveInteger(value['imageHeight']) ?? getPositiveInteger(value['height']);
  const og = {
    title: getTrimmedString(value['title']),
    description: getTrimmedString(value['description']),
    image: getTrimmedString(value['image']),
    imageAlt: getTrimmedString(value['imageAlt']),
    ...(imageWidth ? {imageWidth} : {}),
    ...(imageHeight ? {imageHeight} : {}),
  };

  return og.title || og.description || og.image || og.imageAlt || og.imageWidth || og.imageHeight ? og : undefined;
}

function createImportedBlocks(value: Record<string, unknown>, fallback: readonly BlogContentBlock[]): readonly BlogContentBlock[] {
  if (Array.isArray(value['blocks'])) {
    if (value['blocks'].every(isBlogContentBlock)) {
      return value['blocks'];
    }

    const blocks = createBlogBlocksFromEditorDocument({
      time: Date.now(),
      blocks: value['blocks'] as OutputData['blocks'],
    });

    if (blocks.length > 0) {
      return blocks;
    }
  }

  const content = getTrimmedString(value['content']) || getTrimmedString(value['markdown']);

  if (content) {
    return createBlogBlocksFromMarkdown(content);
  }

  return fallback;
}

function normalizeImportedPostBlocks(blocks: readonly BlogContentBlock[]): readonly BlogContentBlock[] {
  return blocks.map(block => {
    if (block.type !== 'stats' && block.type !== 'chart' && block.type !== 'catCornerUnlock') {
      return block;
    }

    const normalizedBlocks = createBlogBlocksFromEditorDocument({
      time: Date.now(),
      blocks: [{
        id: block.id,
        type: block.type,
        data: {...block.data},
      }],
    });

    return normalizedBlocks[0] ?? block;
  });
}

function createLooseImportedPost(value: Record<string, unknown>, currentPost: BlogPost): BlogPost | null {
  if (!isBlogReaderRelease(value['readerRelease'])) return null;
  const title = getTrimmedString(value['title']);
  const slug = getTrimmedString(value['slug']);
  const content = getTrimmedString(value['content']) || getTrimmedString(value['markdown']);

  if (!title && !slug && !content) {
    return null;
  }

  const seo = isRecord(value['seo']) ? value['seo'] : {};
  const og = createImportedOpenGraph(value['og']);
  const importedTitle = title || currentPost.title;
  const excerpt = getTrimmedString(value['excerpt']) || getTrimmedString(value['description']) || currentPost.excerpt;
  const coverImage = getTrimmedString(value['coverImage']) || getTrimmedString(value['cover']) || currentPost.coverImage || DEFAULT_COVER_IMAGE;
  const hasImportedBackgroundImage = Object.prototype.hasOwnProperty.call(value, 'backgroundImage')
    || Object.prototype.hasOwnProperty.call(value, 'postBackgroundImage');
  const backgroundImage = getTrimmedString(value['backgroundImage']) || getTrimmedString(value['postBackgroundImage']);
  const thumbnailImage = getTrimmedString(value['thumbnailImage']) || getTrimmedString(value['thumbnail']);
  const categories = getImportedStringArray(value['categories']);
  const subcategories = getImportedStringArray(value['subcategories']);
  const tags = getImportedStringArray(value['tags']);
  const featured = typeof value['featured'] === 'boolean' ? value['featured'] : currentPost.featured;
  const catCorner = Object.prototype.hasOwnProperty.call(value, 'catCorner')
    ? parseCmsCatCornerSettings(value['catCorner'])
    : currentPost.catCorner;
  const hasImportedEditorial = Object.prototype.hasOwnProperty.call(value, 'editorial');
  const editorial = hasImportedEditorial
    ? normalizeBlogEditorialMetadata(value['editorial'])
    : currentPost.editorial;
  const seoTitle = getTrimmedString(seo['title']) || getTrimmedString(seo['metaTitle']) || og?.title || importedTitle;
  const seoDescription = getTrimmedString(seo['description']) || getTrimmedString(seo['metaDescription']) || og?.description || excerpt;
  const openGraphImage = getTrimmedString(seo['openGraphImage']) || og?.image;
  const openGraphImageWidth = getPositiveInteger(seo['openGraphImageWidth']) ?? og?.imageWidth;
  const openGraphImageHeight = getPositiveInteger(seo['openGraphImageHeight']) ?? og?.imageHeight;
  const metaTitle = getTrimmedString(seo['metaTitle']);
  const metaDescription = getTrimmedString(seo['metaDescription']);
  const canonical = getTrimmedString(seo['canonical']);
  const createdAt = getImportedIsoDate(value['createdAt']) ?? currentPost.createdAt;
  const updatedAt = getImportedIsoDate(value['updatedAt']) ?? currentPost.updatedAt;
  const publishedAt = getImportedIsoDate(value['publishedAt']) ?? currentPost.publishedAt;
  const status = isBlogPostStatus(value['status']) ? value['status'] : currentPost.status;
  const post: BlogPost = {
    ...currentPost,
    id: getTrimmedString(value['id']) || currentPost.id,
    slug: slug || createBlogSlug(importedTitle),
    title: importedTitle,
    excerpt,
    coverImage,
    ...(hasImportedBackgroundImage ? {backgroundImage} : {}),
    featured,
    ...(catCorner ? {catCorner} : {}),
    ...(hasImportedEditorial ? {editorial} : {}),
    ...(Object.prototype.hasOwnProperty.call(value, 'readerRelease') ? {readerRelease: normalizeBlogReaderRelease(value['readerRelease'])} : {}),
    author: createImportedAuthor(value['author'], currentPost.author),
    categories: categories.length > 0 ? categories : currentPost.categories,
    subcategories: subcategories.length > 0 ? subcategories : currentPost.subcategories,
    tags: tags.length > 0 ? tags : currentPost.tags,
    status,
    seo: {
      title: seoTitle,
      description: seoDescription,
      ...(metaTitle ? {metaTitle} : {}),
      ...(metaDescription ? {metaDescription} : {}),
      ...(canonical ? {canonical} : {}),
      openGraphImage: normalizeOpenGraphImage(openGraphImage, coverImage),
      ...(openGraphImageWidth ? {openGraphImageWidth} : {}),
      ...(openGraphImageHeight ? {openGraphImageHeight} : {}),
    },
    contentFormat: 'editorjs',
    blocks: createImportedBlocks(value, currentPost.blocks),
    createdAt,
    updatedAt,
    publishedAt,
  };

  return {
    ...post,
    ...(thumbnailImage ? {thumbnailImage} : {}),
    ...(og ? {og} : {}),
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function isFirstSaveCommitConflict(
  isNewPost: boolean,
  conflict: BlogPostRevisionConflictError
): boolean {
  return isNewPost
    && conflict.expectedRevision === 0
    && conflict.actualRevision === 1
    && Boolean(conflict.remotePost);
}

@Component({
  selector: 'app-cms-post-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    EditorJsComponent,
    BlogMediaUploaderComponent,
    CmsAssistantPanelComponent,
    CmsDraftPreviewPanelComponent,
    CmsSeoChecklistComponent,
    CmsToastContainerComponent,
    CmsProductionPreviewComponent,
    AdminControlModuleComponent,
    CmsAuthorFormComponent,
    PostPackageImportProgressComponent,
    PostScheduleCalendarComponent,
    SocialPromotionEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './post-editor.component.html',
  styleUrl: './post-editor.component.scss',
})
export class CmsPostEditorComponent implements AfterViewInit {
  @ViewChild(EditorJsComponent) private editorComponent?: EditorJsComponent;
  @ViewChild('settingsInspector') private settingsInspector?: ElementRef<HTMLElement>;
  @ViewChild(CmsDraftPreviewPanelComponent) private draftPreviewPanel?: CmsDraftPreviewPanelComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly authorRepository = inject(AuthorRepositoryService);
  private readonly blogAssistant = inject(BlogAiAssistantService);
  private readonly blogAiFunctions = inject(BlogAiFunctionsService);
  private readonly blogMediaUpload = inject(BlogMediaUploadService);
  private readonly toast = inject(CmsToastService);
  private readonly recoveryService = inject(CmsPostRecoveryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly slug = this.route.snapshot.paramMap.get('slug');
  private readonly firestorePost = this.slug
    ? toSignal(this.blogRepository.getAdminPostBySlug$(this.slug), {initialValue: undefined})
    : null;
  private hasHydratedFirestorePost = false;
  private hasCreatedPost = false;
  private isApplyingEditorState = false;
  private editorStateOperationCount = 0;
  private editorStateApplicationQueue: Promise<void> = Promise.resolve();
  private hasLoadedRecoveryDraft = false;
  private readonly recoveryRequests = new Subject<void>();
  private recoveryWritePromise: Promise<boolean> | null = null;
  private recoveryWritePending = false;
  private recoveryForcePending = false;
  private isRecoveryCleanupInProgress = false;
  private postImportOperationId = 0;
  private readonly activeMediaUploadFields = new Set<string>();
  private activeEditorImageUploadCount = 0;
  private isDestroyed = false;

  protected readonly isNewPost = !this.slug;
  protected readonly statuses = statusOptions;
  protected readonly activeSettings = signal<PostEditorSettings>('details');
  protected readonly focusWriting = signal(false);
  protected readonly reviewBlocks = signal<readonly BlogContentBlock[] | null>(null);
  protected readonly importReceipt = signal<{source: string; kind: string} | null>(null);
  protected readonly editorTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  protected readonly settings: readonly {id: PostEditorSettings; label: string}[] = [
    {id: 'details', label: 'Details'}, {id: 'media', label: 'Media'},
    {id: 'evidence', label: 'Evidence'}, {id: 'search', label: 'Search'},
    {id: 'publish', label: 'Publish'}, {id: 'tools', label: 'Tools & recovery'},
  ];

  protected readonly evidenceBasisOptions = evidenceBasisOptions;
  protected readonly workspaces = POST_EDITOR_WORKSPACES;
  protected readonly activeWorkspace = signal<PostEditorWorkspace>(
    isPostEditorWorkspace(this.route.snapshot.queryParamMap.get('tab')) && (this.isNewPost || this.route.snapshot.queryParamMap.get('tab') !== 'import')
      ? this.route.snapshot.queryParamMap.get('tab') as PostEditorWorkspace
      : this.isNewPost ? 'import' : 'post'
  );
  protected readonly hasOpenedPreviewWorkspace = signal(this.activeWorkspace() === 'preview');
  protected readonly initialSocialChannel = isComposableSocialChannel(this.route.snapshot.queryParamMap.get('channel'))
    ? this.route.snapshot.queryParamMap.get('channel') as BlogSocialChannel
    : 'facebook';
  protected readonly initialSocialAnnouncementId = this.route.snapshot.queryParamMap.get('announcement') ?? undefined;
  protected readonly authors = toSignal(this.authorRepository.getAuthors$(), {initialValue: []});
  protected readonly calendarPosts = toSignal(this.blogRepository.getAdminPosts$(), {initialValue: []});
  protected currentPost = this.resolvePost();
  protected initialData: OutputData = this.currentPost ? createEditorDocument(this.currentPost) : {blocks: []};
  protected readonly postForm = this.createForm(this.currentPost ?? this.blogRepository.createNewPostTemplate());
  protected socialPromotionDraft: BlogSocialPromotion = this.currentPost?.socialPromotion ?? {announcements: []};
  protected socialWorkspacePost = this.createSocialWorkspacePost();
  protected hasUnsavedSocialChanges = false;
  protected readonly hasUnsavedEditorChanges = signal(false);
  protected readonly recoveryDraft = signal<CmsPostRecoverySnapshot | null>(null);
  protected readonly recoveryStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  protected readonly recoveryError = signal('');
  protected readonly showRecoveryComparison = signal(false);
  protected readonly saveConflict = signal<BlogPostRevisionConflictError | null>(null);
  protected readonly recoveryPanelExpanded = signal(false);
  protected readonly newAuthor = signal<AuthorProfile | null>(null);
  protected readonly selectedAuthor = computed(() => (
    this.authors().find(author => author.id === this.postForm.controls.authorId.value)
  ));
  protected readonly postDetailsOpen = signal(true);
  protected readonly publishingSettingsOpen = signal(false);
  protected readonly scheduleCalendarOpen = signal(false);
  protected readonly mediaSettingsOpen = signal(false);
  protected readonly editorialSettingsOpen = signal(false);
  protected readonly seoSettingsOpen = signal(false);
  protected readonly lastSavedPanelExpanded = signal(false);
  protected readonly isPostLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected lastSaved: EditorSavedDocument | null = null;
  protected lastSavedBackupJson = '';
  private seoChecklistInputCache: SeoChecklistInput | null = null;
  private seoChecklistBlocksSource: EditorSavedDocument | null = null;
  private seoChecklistBlocksCache: readonly BlogContentBlock[] | null = null;
  protected isSaveInProgress = false;
  protected isEditorialSaveInProgress = false;
  protected isDeleteInProgress = false;
  protected isPreviewGenerationInProgress = false;
  protected isJsonExportInProgress = false;
  protected readonly isPackageImportInProgress = signal(false);
  protected readonly isJsonImportInProgress = signal(false);
  protected readonly isPostImportInProgress = computed(() => (
    this.isPackageImportInProgress() || this.isJsonImportInProgress()
  ));
  protected readonly postImportAnnouncement = signal('');
  protected readonly packageImportProgress = signal<PostPackageImportProgress | null>(null);
  private postImportErrorToastId: number | null = null;
  protected assistantResult: BlogAssistantResult | null = null;
  protected assistantMessage = '';
  protected assistantError = '';
  protected isAssistantLoading = false;
  protected isThumbnailLoading: string | null = null;
  protected thumbnailError = '';
  protected lastGeneratedThumbnail: BlogStoredThumbnail | null = null;
  protected readonly socialAssistantContextProvider = (): Promise<BlogAssistantContext> => this.createAssistantContext();
  protected readonly uploadEditorImage = async (
    file: File,
    onProgress?: EditorImageUploadProgressCallback
  ): Promise<EditorImageUploadResult> => {
    if (this.rejectWhileImporting('uploading another editor image')) {
      throw new Error('Wait for the active post import to finish before uploading another editor image.');
    }

    this.activeEditorImageUploadCount += 1;

    try {
      const upload = await lastValueFrom(
        this.blogMediaUpload.uploadImage(file, {
          slug: this.mediaUploadSlug,
          role: 'editor-image',
        }).pipe(
          tap(progress => onProgress?.(progress.progress)),
          takeUntilDestroyed(this.destroyRef)
        )
      );

      if (this.isDestroyed) {
        throw new Error('The editor closed before the image upload finished.');
      }

      if (!upload.downloadUrl) {
        throw new Error('Editor image upload completed without a download URL.');
      }

      return {
        success: 1,
        file: {
          url: upload.downloadUrl,
          width: upload.width,
          height: upload.height,
        },
      };
    } finally {
      this.activeEditorImageUploadCount = Math.max(0, this.activeEditorImageUploadCount - 1);
    }
  };

  constructor() {
    // Editor.js listens on document capture and can move its stale caret when
    // an external native select receives arrow keys. Keep those keys native;
    // do not preventDefault, so option selection and change events still work.
    const isolateNativeSelect = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLSelectElement
        && this.hostElement.nativeElement.contains(event.target)
        && !event.target.closest('.cms-editor-surface')
        && !['Tab', 'Escape'].includes(event.key)) {
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', isolateNativeSelect, true);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('keydown', isolateNativeSelect, true);
      this.isDestroyed = true;
      this.postImportOperationId += 1;
      this.dismissPostImportErrorToast();
    });

    this.postForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.invalidateSeoChecklistInput();
        this.requestRecoverySave();
      });

    this.recoveryRequests
      .pipe(
        debounceTime(1500),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => void this.persistRecovery());

    if (!this.firestorePost) return;

    effect(() => {
      const post = this.firestorePost?.();
      const disposition = getRemotePostDisposition({
        localPost: this.currentPost,
        remotePost: post,
        hasHydrated: this.hasHydratedFirestorePost,
        hasUnsavedChanges: this.hasUnsavedChanges,
        isLoading: this.isPostLoading(),
      });

      if (disposition === 'deleted') {
          this.saveConflict.set(new BlogPostRevisionConflictError(
            this.currentPost?.id ?? this.slug ?? 'unknown-post',
            normalizeBlogPostRevision(this.currentPost?.revision),
            null
          ));
        return;
      }

      if (disposition === 'conflict' && post) {
        const currentRevision = normalizeBlogPostRevision(this.currentPost?.revision);
        const remoteRevision = normalizeBlogPostRevision(post.revision);
        this.saveConflict.set(new BlogPostRevisionConflictError(post.id, currentRevision, remoteRevision, post));
        return;
      }

      if (disposition === 'acknowledge' && post) {
        this.acknowledgeFirestorePost(post);
        return;
      }

      if (disposition === 'hydrate' && post) {
        void this.applyFirestorePost(post);
      }
    });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => void this.loadRecoveryDraft());
  }

  @HostListener('window:beforeunload', ['$event'])
  protected protectBrowserUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges && !this.isPostImportInProgress()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  canDeactivate(): boolean {
    if (this.isPostImportInProgress()) {
      this.toast.error('Wait for the active import to finish before leaving this editor. Closing the page interrupts unfinished file or media processing.');
      return false;
    }

    return !this.hasUnsavedChanges
      || window.confirm('You have unsaved post changes. A recovery copy may exist, but leaving now can still lose the latest keystrokes. Leave this editor?');
  }

  protected get hasActiveDraftPreview(): boolean {
    const post = this.currentPost;
    if (!post?.preview || post.status !== 'draft') return false;
    const expiresAt = new Date(post.preview.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  protected get draftPreviewUrl(): string {
    const preview = this.currentPost?.preview;
    return preview ? this.blogRepository.createPreviewUrl(preview.token) : '';
  }

  protected get editorTitle(): string {
    return requiredText(this.postForm.controls.title.value, 'Untitled Post');
  }

  protected get editorExcerpt(): string {
    return this.postForm.controls.excerpt.value.trim();
  }

  protected get assistantSourceLabel(): string {
    if (!this.assistantResult) {
      return 'Backend';
    }

    return this.assistantResult.source === 'backend' ? 'Backend' : 'Local fallback';
  }

  protected get mediaUploadSlug(): string {
    return this.postForm.controls.slug.value
      || createBlogSlug(this.postForm.controls.title.value)
      || this.currentPost?.slug
      || 'untitled-post';
  }

  protected get generatedCanonicalUrl(): string {
    return this.createCanonicalUrl(this.mediaUploadSlug);
  }

  protected get canonicalUrlMode(): string {
    const value = this.postForm.controls.canonical.value.trim();

    if (!value || value === this.generatedCanonicalUrl) {
      return 'Using the generated canonical URL.';
    }

    return 'Using a custom canonical override.';
  }

  protected get postedOnPreview(): string {
    const publishedAt = fromDateTimeLocalValue(this.postForm.controls.publishedAt.value);
    const status = this.postForm.controls.status.value;

    if (!publishedAt) {
      if (status === 'published') {
        return 'On first publish';
      }

      return status === 'scheduled' ? 'Required before scheduling' : 'Not set';
    }

    const formattedDate = postedDateFormatter.format(new Date(publishedAt));
    return status === 'scheduled' ? `Scheduled for ${formattedDate}` : formattedDate;
  }

  protected get distributionSummary(): string {
    const announcements = this.socialPromotionDraft.announcements;
    const activeCount = announcements.filter(announcement => announcement.status !== 'cancelled').length;
    return activeCount === 0 ? 'No social plans' : `${activeCount} social plan${activeCount === 1 ? '' : 's'}`;
  }

  protected get canOpenDistributionCalendar(): boolean {
    return !this.isNewPost
      && (this.currentPost?.status === 'scheduled' || this.currentPost?.status === 'published');
  }

  protected get openGraphImageMode(): string {
    const openGraphImage = this.postForm.controls.openGraphImage.value.trim();
    const coverImage = this.postForm.controls.coverImage.value.trim();

    if (!openGraphImage || openGraphImage === coverImage) {
      return 'Using cover image fallback.';
    }

    return 'Using custom Open Graph image.';
  }

  protected get mediaModuleSummary(): string {
    if (!this.postForm.controls.coverImage.value.trim()) {
      return 'Cover image required';
    }

    return this.postForm.controls.backgroundImage.value.trim()
      ? 'Cover ready · Editorial image ready'
      : 'Cover ready · No editorial image';
  }

  protected get seoModuleSummary(): string {
    const titleLength = this.postForm.controls.seoTitle.value.length;
    const descriptionLength = this.postForm.controls.seoDescription.value.length;
    return `${titleLength}/60 title · ${descriptionLength}/160 description · ${this.openGraphImageMode}`;
  }

  protected get lastSavedSummary(): string {
    return this.lastSaved ? `${this.lastSaved.blockCount} blocks · ${this.lastSaved.savedAt}` : 'Available after the first save';
  }

  protected get hasUnsavedChanges(): boolean {
    return this.postForm.dirty || this.hasUnsavedSocialChanges || this.hasUnsavedEditorChanges();
  }

  protected get hasUnsavedEditorialChanges(): boolean {
    return this.editorialControls.some(control => control.dirty);
  }

  protected get recoverySummary(): string {
    const draft = this.recoveryDraft();

    if (this.recoveryStatus() === 'saving') return 'Saving recovery copy…';
    if (this.recoveryStatus() === 'error') return 'Recovery needs attention';
    if (draft) return `Recovery saved ${this.formatRecoveryDate(draft.savedAt)}`;
    return 'No recovery copy stored';
  }

  protected get recoveryRevisionSummary(): string {
    const draft = this.recoveryDraft();
    return draft
      ? `Recovery base r${draft.baseRevision} · Current r${normalizeBlogPostRevision(this.currentPost?.revision)}`
      : `Current revision r${normalizeBlogPostRevision(this.currentPost?.revision)}`;
  }

  protected workspaceTabClass(workspace: PostEditorWorkspace): string {
    const base = 'min-w-0 flex-1 border-r border-zinc-800 px-4 py-3 text-left text-sm font-medium transition last:border-r-0';
    return this.activeWorkspace() === workspace
      ? `${base} bg-cyan-400 text-zinc-950`
      : `${base} text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100`;
  }

  protected async setWorkspace(workspace: PostEditorWorkspace): Promise<void> {
    if (this.rejectWhileImporting('changing editor workspaces') || this.isPreviewGenerationInProgress) return;
    if (workspace === 'import' && !this.isNewPost) return;

    if (workspace === 'social') {
      this.socialWorkspacePost = this.createSocialWorkspacePost();
    }

    if (workspace === 'preview') {
      this.isPreviewGenerationInProgress = true;
      try {
        if (!this.editorComponent) throw new Error('The article editor is still loading. Try review again in a moment.');
        const document = await this.editorComponent.getDocument();
        if (this.isDestroyed) return;
        this.reviewBlocks.set(createBlogBlocksFromEditorDocument(document));
        this.invalidateSeoChecklistInput();
        this.hasOpenedPreviewWorkspace.set(true);
      } catch (error) {
        this.toast.error(getErrorMessage(error));
        return;
      } finally {
        this.isPreviewGenerationInProgress = false;
      }
    }

    this.activeWorkspace.set(workspace);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {tab: workspace},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected openSeoFields(): void {
    this.seoSettingsOpen.set(true);
    this.openSettings('search');
  }

  protected openSettings(setting: PostEditorSettings): void {
    if (this.isPostImportInProgress() || this.isPreviewGenerationInProgress) return;
    this.activeSettings.set(setting);
    this.focusWriting.set(false);
    void this.setWorkspace('post');
    if (window.matchMedia('(max-width: 1279px)').matches) {
      requestAnimationFrame(() => {
        if (this.isDestroyed) return;
        this.settingsInspector?.nativeElement.focus({preventScroll: true});
        this.settingsInspector?.nativeElement.scrollIntoView({block: 'start'});
      });
    }
  }

  protected openRecoveryTools(): void {
    this.openSettings('tools');
    this.recoveryPanelExpanded.set(true);
  }

  protected statusDescription(status: BlogPostStatus): string {
    return {draft: 'Keep private until ready.', scheduled: 'Release at a future time.',
      published: 'Make saved changes public.', archived: 'Retain as an archived post.'}[status];
  }

  protected get saveActionLabel(): string {
    const status = this.postForm.controls.status.value;
    if (status === 'published') return this.currentPost?.status === 'published' ? 'Save published changes' : 'Publish post';
    return {draft: 'Save draft', scheduled: 'Save scheduled post', archived: 'Save archived post'}[status];
  }

  protected onSocialPromotionChange(promotion: BlogSocialPromotion): void {
    if (this.isPostImportInProgress()) return;

    this.socialPromotionDraft = promotion;
    this.hasUnsavedSocialChanges = true;
    this.requestRecoverySave();
  }

  protected onEditorContentChanged(): void {
    if (this.isApplyingEditorState || this.isPostImportInProgress()) return;
    this.hasUnsavedEditorChanges.set(true);
    this.requestRecoverySave();
  }

  protected async saveSocialPromotion(promotion: BlogSocialPromotion): Promise<void> {
    if (this.rejectWhileImporting('saving social promotion changes')) return;

    this.onSocialPromotionChange(promotion);
    await this.savePost();
  }

  protected formatRecoveryDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'unknown time' : date.toLocaleString();
  }

  protected recoveryEditorBlockCount(recovery: CmsPostRecoverySnapshot): string {
    if (recovery.editor.mode === 'json') {
      try {
        const parsed = JSON.parse(recovery.editor.source) as {blocks?: unknown};
        return Array.isArray(parsed.blocks) ? String(parsed.blocks.length) : 'Invalid JSON';
      } catch {
        return 'Invalid JSON';
      }
    }

    return String(recovery.editor.document.blocks.length);
  }

  protected isCommittedFirstSaveConflict(conflict: BlogPostRevisionConflictError): boolean {
    return isFirstSaveCommitConflict(this.isNewPost, conflict);
  }

  protected async restoreRecoveryDraft(): Promise<void> {
    if (this.rejectWhileImporting('restoring the recovery draft')) return;
    if (this.rejectWhileApplyingEditorState('restoring another recovery draft')) return;

    const recovery = this.recoveryDraft();
    if (!recovery) return;

    try {
      await this.enqueueEditorStateApplication(async () => {
        // Older schema-v1 recovery drafts do not have the additive editorial
        // fields. Patch the known values so those drafts remain recoverable.
        this.postForm.patchValue(recovery.form, {emitEvent: false});
        this.syncCatCornerDiscoveryControl();
        this.socialPromotionDraft = recovery.socialPromotion;
        this.socialWorkspacePost = this.createSocialWorkspacePost();
        await this.editorComponent?.restoreRecoverySnapshot(recovery.editor);
        this.postForm.markAsDirty();
        this.hasUnsavedEditorChanges.set(true);
        this.hasUnsavedSocialChanges = true;
        this.saveConflict.set(null);
        this.invalidateSeoChecklistInput();
        this.toast.success('Restored the private recovery copy. Review it, then explicitly save when ready.');
      });
    } finally {
      this.requestRecoverySave();
    }
  }

  protected async discardRecoveryDraft(): Promise<void> {
    const recovery = this.recoveryDraft();
    if (!recovery) return;

    const confirmed = window.confirm('Discard this private recovery copy? The canonical post will not be changed.');
    if (!confirmed) return;

    await this.deleteRecoveryBestEffort(recovery.postId);
  }

  protected async reloadRemotePost(automaticFirstSaveAdoption = false): Promise<boolean> {
    if (this.rejectWhileImporting('reloading the canonical post')) return false;
    if (this.rejectWhileApplyingEditorState('reloading the canonical post again')) return false;

    const remotePost = this.saveConflict()?.remotePost;
    if (!remotePost) {
      this.toast.error('The canonical post no longer exists. Save your work as a new draft instead.');
      return false;
    }

    let adopted = false;
    await this.enqueueEditorStateApplication(async () => {
      const recoverySaved = await this.persistRecovery(true);
      if (!recoverySaved) {
        this.toast.error('Reload was cancelled because the latest local work could not be written to Recovery.');
        return;
      }

      const latestRemotePost = this.resolveLatestReloadPost(remotePost);
      if (!latestRemotePost) {
        this.toast.error('Reload was cancelled because the canonical post was deleted while Recovery was being saved. Your local work remains available.');
        return;
      }

      await this.applyFirestorePostNow(latestRemotePost);

      if (this.isNewPost && !this.hasCreatedPost) {
        this.hasCreatedPost = true;
        this.recoveryService.clearNewPostId();
        void this.router.navigate(['/admin/cms', latestRemotePost.slug, 'edit'], {
          replaceUrl: true,
          queryParamsHandling: 'preserve',
        });
      }

      adopted = true;
      this.toast.success(automaticFirstSaveAdoption
        ? 'Your first save completed successfully. The editor adopted revision 1 and kept your earlier local work in Recovery.'
        : 'Reloaded the latest canonical revision. Your earlier local work remains available in Recovery.');
    });

    return adopted;
  }

  private resolveLatestReloadPost(requestedRemotePost: BlogPost): BlogPost | null {
    const currentConflict = this.saveConflict();

    if (currentConflict?.postId === requestedRemotePost.id && currentConflict.actualRevision === null) {
      return null;
    }

    const liveRemotePost = this.firestorePost?.();
    if (this.firestorePost && this.hasHydratedFirestorePost && !this.isPostLoading() && !liveRemotePost) {
      this.saveConflict.set(new BlogPostRevisionConflictError(
        requestedRemotePost.id,
        normalizeBlogPostRevision(this.currentPost?.revision),
        null
      ));
      return null;
    }

    const candidates = [
      requestedRemotePost,
      currentConflict?.remotePost,
      liveRemotePost,
    ].filter((post): post is BlogPost => post?.id === requestedRemotePost.id);

    return candidates.reduce<BlogPost>((latest, candidate) => (
      normalizeBlogPostRevision(candidate.revision) >= normalizeBlogPostRevision(latest.revision)
        ? candidate
        : latest
    ), requestedRemotePost);
  }

  protected async saveConflictAsCopy(): Promise<void> {
    if (this.isSaveInProgress) return;

    const confirmed = window.confirm(
      'Create a separate recovery draft? The canonical post will remain unchanged and both drafts will need manual review. Choose Cancel and use the saved draft unless you intentionally need two versions.'
    );
    if (!confirmed) return;

    this.isSaveInProgress = true;

    try {
      const backup = await this.createCurrentBackupPost();
      const template = this.blogRepository.createNewPostTemplate();
      const now = new Date().toISOString();
      const copy = await this.blogRepository.savePost({
        ...backup,
        id: template.id,
        revision: 0,
        title: `${backup.title} (Recovered Copy)`,
        slug: this.blogRepository.createUniqueSlug(`${backup.slug}-recovered`, template.id),
        status: 'draft',
        preview: undefined,
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
      });

      this.postForm.markAsPristine();
      this.hasUnsavedEditorChanges.set(false);
      this.hasUnsavedSocialChanges = false;
      this.saveConflict.set(null);
      await this.deleteRecoveryBestEffort(this.currentPost?.id);
      this.toast.success(`Saved local work as the new draft “${copy.title}”.`);
      await this.router.navigate(['/admin/cms', copy.slug, 'edit'], {replaceUrl: true});
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to save the recovered copy.');
    } finally {
      this.isSaveInProgress = false;
    }
  }

  protected async openDistributionCalendar(): Promise<void> {
    if (!this.canOpenDistributionCalendar || !this.currentPost) {
      this.toast.error('Save this post with a publish schedule before opening its Calendar plan.');
      return;
    }

    if (this.hasUnsavedChanges) {
      const saved = await this.savePost();
      if (!saved) {
        return;
      }
    }

    void this.router.navigate(['/admin/cms/calendar'], {queryParams: {post: this.currentPost.id}});
  }

  protected syncSlugFromTitle(): void {
    const slugControl = this.postForm.controls.slug;

    if (!this.isNewPost || slugControl.dirty) {
      return;
    }

    const previousSlug = slugControl.value;
    slugControl.setValue(createBlogSlug(this.postForm.controls.title.value), {emitEvent: false});
    this.syncCanonicalFromSlug(previousSlug);
  }

  protected normalizeSlug(): void {
    const postId = this.currentPost?.id;
    const previousSlug = this.postForm.controls.slug.value;
    const slug = this.blogRepository.createUniqueSlug(
      this.postForm.controls.slug.value || this.postForm.controls.title.value,
      postId
    );

    this.postForm.controls.slug.setValue(slug, {emitEvent: false});
    this.syncCanonicalFromSlug(previousSlug);
  }

  protected useGeneratedCanonicalUrl(): void {
    this.postForm.controls.canonical.setValue(this.generatedCanonicalUrl);
    this.postForm.controls.canonical.markAsDirty();
    this.postForm.markAsDirty();
  }

  protected setPublishedAtNow(): void {
    this.postForm.controls.publishedAt.setValue(toDateTimeLocalValue(new Date().toISOString()));
    this.postForm.controls.publishedAt.markAsDirty();
  }

  protected applyScheduleCalendarValue(value: string): void {
    const control = this.postForm.controls.publishedAt;
    control.setValue(value);
    control.markAsDirty();
    control.markAsTouched();
    this.postForm.markAsDirty();
  }

  protected startAddingAuthor(): void {
    this.newAuthor.set(this.authorRepository.createNewAuthorTemplate());
  }

  protected onAuthorCreated(author: AuthorProfile): void {
    this.postForm.controls.authorId.setValue(author.id);
    this.postForm.controls.authorId.markAsDirty();
    this.newAuthor.set(null);
    this.toast.success(`Added ${author.name} and selected the new author.`);
  }

  protected onCatCornerEnabledChanged(event: Event): void {
    const enabled = event.target instanceof HTMLInputElement
      ? event.target.checked
      : this.postForm.controls.catCornerEnabled.value;

    this.postForm.controls.catCornerEnabled.setValue(enabled, {emitEvent: false});

    if (!enabled) {
      this.postForm.controls.catCornerDiscoveryPost.setValue(false, {emitEvent: false});
    }

    this.syncCatCornerDiscoveryControl();
    this.postForm.markAsDirty();
  }

  protected openPostJsonPicker(input: HTMLInputElement): void {
    if (this.rejectWhilePostOperation('choosing another import')) return;
    this.dismissPostImportFeedback();
    input.click();
  }

  protected openPostPackagePicker(input: HTMLInputElement): void {
    if (this.rejectWhilePostOperation('choosing another import')) return;
    this.dismissPostImportFeedback();
    input.click();
  }

  protected dismissPostImportFeedback(): void {
    if (this.isPostImportInProgress()) return;

    this.packageImportProgress.set(null);
    this.postImportAnnouncement.set('');
    this.dismissPostImportErrorToast();
  }

  private dismissPostImportErrorToast(): void {
    if (this.postImportErrorToastId === null) return;

    this.toast.dismiss(this.postImportErrorToastId);
    this.postImportErrorToastId = null;
  }

  protected async importPostJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (input) {
      input.value = '';
    }

    if (!file) {
      return;
    }

    if (this.rejectWhilePostOperation('importing another document')) return;

    this.dismissPostImportFeedback();
    const operationId = ++this.postImportOperationId;
    this.isJsonImportInProgress.set(true);
    this.postImportAnnouncement.set('Importing the selected JSON document.');
    try {
      const parsedJson: unknown = JSON.parse(await file.text());
      if (!this.isActiveJsonImport(operationId)) return;

      const importedDocument = this.createImportedPostDocument(parsedJson);
      if (!this.isNewPost && !window.confirm(
        `Stage JSON in "${this.editorTitle}"? The imported status is ${importedDocument.post.status}`
        + ` and the publish date is ${importedDocument.post.publishedAt || 'not set'}.`
        + ' This replaces the current editor contents, including unsaved edits. Review before saving; the stored post is not changed by this import.'
      )) return;
      await this.applyImportedPost(importedDocument.post);
      if (this.isActiveJsonImport(operationId)) this.importReceipt.set({source: file.name, kind: 'JSON staged'});
      if (!this.isActiveJsonImport(operationId)) return;

      this.postImportAnnouncement.set('');
      this.toast.success(`Imported ${importedDocument.sourceLabel} from ${file.name}. Review and save to persist it.`);
    } catch (error) {
      if (!this.isActiveJsonImport(operationId)) return;

      this.postImportAnnouncement.set('');
      this.postImportErrorToastId = this.toast.error(`Unable to import JSON: ${getErrorMessage(error)}`);
    } finally {
      if (!this.isDestroyed && this.postImportOperationId === operationId) {
        this.isJsonImportInProgress.set(false);
      }
    }
  }

  /**
   * Imports one generated post package without auto-saving it. A package keeps
   * ordinary post JSON plus an image manifest and image files in one folder;
   * images are uploaded through the same trusted CMS path as manual uploads.
   */
  protected async importPostPackage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);

    if (input) {
      input.value = '';
    }

    if (files.length === 0) {
      return;
    }

    if (this.rejectWhilePostOperation('importing another package')) return;

    if (!this.isNewPost) {
      this.toast.error('Post packages can only be imported from New Post.');
      return;
    }

    this.dismissPostImportFeedback();
    const operationId = ++this.postImportOperationId;
    let hasAnnouncedProcessing = false;
    this.isPackageImportInProgress.set(true);
    this.postImportAnnouncement.set('Checking the selected post package.');
    this.packageImportProgress.set({
      stage: 'checking',
      message: `Reading ${files.length} selected file${files.length === 1 ? '' : 's'} and locating the post and image manifest.`,
      detail: 'The package is being checked before any media is uploaded.',
      progress: null,
      completedImages: 0,
      totalImages: 0,
    });
    let uploadedCount = 0;

    try {
      const jsonFiles = files.filter(file => file.name.toLowerCase().endsWith('.json'));

      if (jsonFiles.length === 0) {
        throw new Error('Choose a package folder containing a post JSON file and an image manifest.');
      }

      const parsedFiles = await Promise.all(jsonFiles.map(async file => ({
        file,
        value: JSON.parse(await file.text()) as unknown,
      })));
      if (!this.isActivePackageImport(operationId)) return;

      this.packageImportProgress.set({
        stage: 'checking',
        message: 'Validating the post document, image manifest, and media references.',
        detail: `Found ${jsonFiles.length} JSON file${jsonFiles.length === 1 ? '' : 's'} in the selected package.`,
        progress: null,
        completedImages: 0,
        totalImages: 0,
      });
      const postCandidates = parsedFiles.flatMap(({file, value}) => {
        if (!isBlogPostPackagePostDocument(value)) {
          return [];
        }

        try {
          return [{file, value, imported: this.createImportedPostDocument(value)}];
        } catch {
          return [];
        }
      });

      if (postCandidates.length !== 1) {
        const candidateDetail = postCandidates.length === 0
          ? `Found none among: ${jsonFiles.map(file => file.webkitRelativePath || file.name).join(', ')}.`
          : `Found ${postCandidates.length}: ${postCandidates.map(({file}) => file.webkitRelativePath || file.name).join(', ')}.`;
        throw new Error(`A post package must contain exactly one importable post JSON document. ${candidateDetail}`);
      }

      const postCandidate = postCandidates[0];
      const manifestCandidates = parsedFiles.flatMap(({file, value}) => {
        try {
          const manifest = getEmbeddedBlogPostMediaPackageManifest(value);
          return manifest ? [{file, manifest}] : [];
        } catch (error) {
          throw new Error(`Unable to read the image manifest: ${getErrorMessage(error)}`, {cause: error});
        }
      });

      if (manifestCandidates.length !== 1) {
        const manifestDetail = manifestCandidates.length === 0
          ? 'Found none. Expected a top-level images array or an imageManifest/mediaManifest object.'
          : `Found ${manifestCandidates.length}: ${manifestCandidates.map(({file}) => file.webkitRelativePath || file.name).join(', ')}.`;
        throw new Error(`A post package must contain exactly one image manifest, either embedded in the post JSON or as a separate manifest JSON file. ${manifestDetail}`);
      }

      const manifest = manifestCandidates[0].manifest;
      const originalPost = postCandidate.imported.post;
      const requestedSlug = originalPost.slug || createBlogSlug(originalPost.title);
      const existingPost = this.blogRepository.getAdminPostBySlug(requestedSlug);
      if (existingPost) {
        const publishedWarning = existingPost.status === 'published'
          ? `\n\n"${existingPost.title}" is currently published.`
          : '';
        const confirmed = window.confirm(
          `A post already uses the slug "${existingPost.slug}".${publishedWarning}\n\n`
          + 'This package will not update or overwrite that post. Continue by importing a separate draft with a unique slug?'
        );
        if (!confirmed) {
          this.packageImportProgress.set({
            stage: 'cancelled',
            message: 'The package import was canceled before any media was uploaded.',
            detail: 'The current draft was not changed.',
            progress: 0,
            completedImages: 0,
            totalImages: manifest.images.length,
          });
          this.postImportAnnouncement.set('Post package import canceled. The current draft was not changed.');
          return;
        }
      }
      const declaredReferences = new Set(manifest.images.map(entry => entry.reference));
      const unresolvedReferences = getUnresolvedBlogPostMediaPackageReferences(originalPost);
      const undeclaredReferences = unresolvedReferences.filter(reference => !declaredReferences.has(reference));
      const unusedReferences = manifest.images
        .map(entry => entry.reference)
        .filter(reference => !unresolvedReferences.includes(reference));

      if (undeclaredReferences.length > 0) {
        throw new Error(`The post uses media placeholder${undeclaredReferences.length === 1 ? '' : 's'} missing from the manifest: ${undeclaredReferences.join(', ')}.`);
      }
      if (unusedReferences.length > 0) {
        throw new Error(`The manifest declares image${unusedReferences.length === 1 ? '' : 's'} not used by known post media fields: ${unusedReferences.join(', ')}.`);
      }
      if (unresolvedReferences.length === 0) {
        throw new Error(`Use ${'media://'} placeholders in the post JSON for the package images.`);
      }

      const fileMatches = matchBlogPostPackageImageFiles(manifest, files.filter(file => !jsonFiles.includes(file)));
      const uploadSlug = createBlogSlug(originalPost.slug || originalPost.title) || this.mediaUploadSlug;
      const uploadedUrls = new Map<string, string>();
      const totalImages = fileMatches.length;
      this.postImportAnnouncement.set(`Uploading ${totalImages} post package image${totalImages === 1 ? '' : 's'}.`);

      for (const [index, {entry, file}] of fileMatches.entries()) {
        const currentImageNumber = index + 1;
        this.packageImportProgress.set({
          stage: 'uploading',
          message: `Preparing image ${currentImageNumber} of ${totalImages}: ${entry.file}`,
          detail: 'Optimizing the image locally before transfer when that reduces its size.',
          progress: (uploadedCount / totalImages) * 100,
          completedImages: uploadedCount,
          totalImages,
          currentFile: entry.file,
        });
        const upload = await lastValueFrom(this.blogMediaUpload.uploadImage(file, {
          slug: uploadSlug,
          role: entry.role,
          altText: entry.altText,
          ...(entry.role === 'open-graph' ? {
            optimization: {enabled: true, outputType: 'image/jpeg', forceOutputType: true},
          } : {}),
        }).pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(uploadProgress => {
            if (!this.isActivePackageImport(operationId)) return;

            const currentFileProgress = Math.min(100, Math.max(0, uploadProgress.progress));
            const imageIsReady = Boolean(uploadProgress.downloadUrl);
            const processing = currentFileProgress >= 100 && !imageIsReady;
            if (processing && !hasAnnouncedProcessing) {
              hasAnnouncedProcessing = true;
              this.postImportAnnouncement.set('Upload transfer is complete. Processing media and creating web-ready versions.');
            }
            const completedImages = imageIsReady ? uploadedCount + 1 : uploadedCount;
            const overallProgress = ((uploadedCount + currentFileProgress / 100) / totalImages) * 100;
            const message = imageIsReady
              ? `Image ${currentImageNumber} of ${totalImages} is ready: ${entry.file}`
              : processing
                ? `Upload ${currentImageNumber} of ${totalImages} is complete. Processing ${entry.file} and creating web-ready versions.`
                : currentFileProgress > 0
                  ? `Uploading image ${currentImageNumber} of ${totalImages}: ${entry.file} (${Math.round(currentFileProgress)}%)`
                  : `Preparing image ${currentImageNumber} of ${totalImages}: ${entry.file}`;
            const detail = imageIsReady
              ? 'The finalized media URL is ready. Continuing with the package.'
              : processing
                ? 'The transfer is complete; server-side validation and image variants are still running.'
                : 'Package import will continue automatically after this image is ready.';

            this.packageImportProgress.set({
              stage: processing ? 'processing' : 'uploading',
              message,
              detail,
              progress: overallProgress,
              completedImages,
              totalImages,
              currentFile: entry.file,
            });
          })
        ));
        if (!this.isActivePackageImport(operationId)) return;

        if (!upload.downloadUrl) {
          throw new Error(`The upload for ${entry.file} completed without a media URL.`);
        }

        uploadedUrls.set(entry.reference, upload.downloadUrl);
        uploadedCount += 1;
      }

      this.packageImportProgress.set({
        stage: 'applying',
        message: `All ${totalImages} package image${totalImages === 1 ? ' is' : 's are'} ready. Loading the imported draft into the editor.`,
        detail: 'Replacing declared media references and preserving this New Post draft as unsaved work.',
        progress: 100,
        completedImages: uploadedCount,
        totalImages,
      });

      const resolvedPost = {
        ...replaceBlogPostMediaPackageReferences(originalPost, uploadedUrls),
        status: 'draft' as const,
        publishedAt: null,
        preview: undefined,
      };
      const remainingReferences = getUnresolvedBlogPostMediaPackageReferences(resolvedPost);

      if (remainingReferences.length > 0) {
        throw new Error(`The imported post still has unresolved media placeholders: ${remainingReferences.join(', ')}.`);
      }

      if (!this.isActivePackageImport(operationId)) return;
      await this.applyImportedPost(resolvedPost);
      if (this.isActivePackageImport(operationId)) this.importReceipt.set({source: postCandidate.file.name, kind: `${manifest.images.length} package images resolved`});
      if (!this.isActivePackageImport(operationId)) return;

      this.packageImportProgress.set({
        stage: 'complete',
        message: `Imported ${postCandidate.imported.sourceLabel} with ${uploadedCount} generated image${uploadedCount === 1 ? '' : 's'}.`,
        detail: 'The draft is loaded for review but has not been saved or published.',
        progress: 100,
        completedImages: uploadedCount,
        totalImages,
      });
      this.postImportAnnouncement.set('');
      this.toast.success(`Imported ${postCandidate.imported.sourceLabel} and uploaded ${uploadedCount} generated image${uploadedCount === 1 ? '' : 's'}. Review and save the draft to persist it.`);
    } catch (error) {
      if (!this.isActivePackageImport(operationId)) return;

      const uploadedMediaNotice = uploadedCount > 0
        ? ` ${uploadedCount} image${uploadedCount === 1 ? '' : 's'} already uploaded remain available in the Media Library.`
        : '';
      const errorMessage = getErrorMessage(error);
      const currentProgress = this.packageImportProgress();
      this.packageImportProgress.set({
        stage: 'error',
        message: `Unable to import post package: ${errorMessage}`,
        detail: uploadedMediaNotice.trim() || 'The current draft was not changed.',
        progress: currentProgress?.progress ?? null,
        completedImages: uploadedCount,
        totalImages: currentProgress?.totalImages ?? 0,
        currentFile: currentProgress?.currentFile,
      });
      this.postImportAnnouncement.set('');
      this.postImportErrorToastId = this.toast.error(`Unable to import post package: ${errorMessage}${uploadedMediaNotice}`);
    } finally {
      if (!this.isDestroyed && this.postImportOperationId === operationId) {
        this.isPackageImportInProgress.set(false);
      }
    }
  }

  protected async exportPostJson(): Promise<void> {
    if (this.rejectWhileImporting('exporting the draft')) return;
    if (this.isJsonExportInProgress || this.isPreviewGenerationInProgress) {
      this.toast.error('Wait for the current export or preview operation to finish.');
      return;
    }

    this.isJsonExportInProgress = true;
    try {
      const backupPost = await this.createCurrentBackupPost();
      if (this.isDestroyed) return;

      this.downloadJson(this.createPostBackupJson(backupPost), createPostBackupFileName(backupPost.slug));
      this.toast.success(`Exported "${backupPost.title}" as JSON.`);
    } catch (error) {
      if (this.isDestroyed) return;
      this.toast.error(`Unable to export JSON: ${getErrorMessage(error)}`);
    } finally {
      this.isJsonExportInProgress = false;
    }
  }

  protected setLastSavedPanelExpanded(expanded: boolean): void {
    this.lastSavedPanelExpanded.set(expanded);

    if (expanded) {
      this.getLastSavedBackupJson();
    }
  }

  protected async copyLastSavedJson(): Promise<void> {
    const backupJson = this.getLastSavedBackupJson();

    if (!backupJson) {
      this.toast.error('Save this post before copying its JSON backup.');
      return;
    }

    try {
      await this.copyTextToClipboard(backupJson);
      this.toast.success('Copied the last saved post JSON.');
    } catch (error) {
      this.toast.error(`Unable to copy JSON: ${getErrorMessage(error)}`);
    }
  }

  protected downloadLastSavedJson(): void {
    const backupJson = this.getLastSavedBackupJson();

    if (!backupJson || !this.currentPost) {
      this.toast.error('Save this post before downloading its JSON backup.');
      return;
    }

    this.downloadJson(backupJson, createPostBackupFileName(this.currentPost.slug));
    this.toast.success(`Downloaded the last saved JSON for "${this.currentPost.title}".`);
  }

  protected async generateAssistantSuggestions(): Promise<void> {
    this.assistantError = '';
    this.assistantMessage = '';
    this.isAssistantLoading = true;

    try {
      const context = await this.createAssistantContext();

      try {
        this.assistantResult = await this.blogAiFunctions.generateMetadata(context);
        this.assistantMessage = 'Generated AI metadata and thumbnail prompts with Firebase Functions.';
      } catch (backendError) {
        this.assistantResult = this.blogAssistant.createSuggestions(context);
        this.assistantMessage = `Generated local fallback suggestions because the backend was unavailable: ${getErrorMessage(backendError)}`;
      }
    } catch (error) {
      this.assistantError = error instanceof Error ? error.message : 'Unable to generate writing suggestions.';
    } finally {
      this.isAssistantLoading = false;
    }
  }

  protected async generateAndStoreThumbnail(thumbnail: BlogThumbnailSuggestion): Promise<void> {
    if (this.rejectWhileImporting('generating and applying a thumbnail')) return;
    if (this.activeMediaUploadFields.has('cover')) {
      this.toast.error('Wait for the current cover image upload to finish before generating a thumbnail.');
      return;
    }
    if (this.isThumbnailLoading) {
      this.toast.error('Wait for the current thumbnail generation to finish before generating another thumbnail.');
      return;
    }

    this.thumbnailError = '';
    this.lastGeneratedThumbnail = null;

    if (!this.currentPost) {
      this.thumbnailError = 'Unable to generate a thumbnail because the source post is missing.';
      return;
    }

    this.isThumbnailLoading = thumbnail.id;

    try {
      const storedThumbnail = await this.blogAiFunctions.generateAndStoreThumbnail({
        prompt: thumbnail.prompt,
        altText: thumbnail.altText,
        style: thumbnail.style,
        postId: this.currentPost.id,
        slug: this.postForm.controls.slug.value || this.currentPost.slug,
      });

      if (this.isDestroyed) return;

      this.postForm.controls.coverImage.setValue(storedThumbnail.downloadUrl);
      this.postForm.markAsDirty();
      this.lastGeneratedThumbnail = storedThumbnail;
      this.assistantMessage = 'Generated and stored a thumbnail in Firebase Storage and applied it to the cover image.';
    } catch (error) {
      this.thumbnailError = `Unable to generate and store the thumbnail: ${getErrorMessage(error)}`;
    } finally {
      this.isThumbnailLoading = null;
    }
  }

  protected onCoverImageUploaded(upload: BlogMediaUploadResult): void {
    this.markUploadedMedia(upload);
  }

  protected onBackgroundImageUploaded(upload: BlogMediaUploadResult): void {
    this.markUploadedMedia(upload);
  }

  protected onOpenGraphImageUploaded(upload: BlogMediaUploadResult): void {
    this.markUploadedMedia(upload);
  }

  protected setMediaUploadInProgress(field: string, isUploading: boolean): void {
    if (isUploading) {
      this.activeMediaUploadFields.add(field);
      return;
    }

    this.activeMediaUploadFields.delete(field);
  }

  protected isCoverMediaWriterUnavailable(): boolean {
    return this.isPostImportInProgress() || this.isThumbnailLoading !== null;
  }

  protected isThumbnailWriterUnavailable(): boolean {
    return this.isPostImportInProgress()
      || this.isThumbnailLoading !== null
      || this.activeMediaUploadFields.has('cover');
  }

  protected clearBackgroundImage(): void {
    const control = this.postForm.controls.backgroundImage;
    control.setValue('');
    control.markAsDirty();
    control.markAsTouched();
    this.postForm.markAsDirty();
  }

  protected clearOpenGraphImage(): void {
    this.postForm.controls.openGraphImage.setValue('');
    this.postForm.markAsDirty();
  }

  protected applySuggestion(suggestion: BlogMetadataSuggestion): void {
    this.applyTitleSuggestion(suggestion, false);
    this.applyDescriptionSuggestion(suggestion, false);
    this.applyTaxonomySuggestion(suggestion, false);
    this.postForm.controls.seoTitle.setValue(suggestion.seoTitle);
    this.postForm.controls.seoDescription.setValue(suggestion.seoDescription);
    this.assistantMessage = 'Applied the full writing assistant suggestion.';
    this.postForm.markAsDirty();
  }

  protected applyTitleSuggestion(suggestion: BlogMetadataSuggestion, showMessage = true): void {
    this.postForm.controls.title.setValue(suggestion.title);
    this.postForm.controls.seoTitle.setValue(suggestion.seoTitle);

    if (this.isNewPost && !this.postForm.controls.slug.dirty) {
      const previousSlug = this.postForm.controls.slug.value;
      this.postForm.controls.slug.setValue(createBlogSlug(suggestion.title));
      this.syncCanonicalFromSlug(previousSlug);
    }

    if (showMessage) {
      this.assistantMessage = 'Applied the suggested title and SEO title.';
    }

    this.postForm.markAsDirty();
  }

  protected applyDescriptionSuggestion(suggestion: BlogMetadataSuggestion, showMessage = true): void {
    this.postForm.controls.excerpt.setValue(suggestion.description);
    this.postForm.controls.seoDescription.setValue(suggestion.seoDescription);

    if (showMessage) {
      this.assistantMessage = 'Applied the suggested excerpt and SEO description.';
    }

    this.postForm.markAsDirty();
  }

  protected applyTaxonomySuggestion(suggestion: BlogMetadataSuggestion, showMessage = true): void {
    this.postForm.controls.categories.setValue(toCsv(suggestion.categories));
    this.postForm.controls.tags.setValue(toCsv(suggestion.tags));

    if (showMessage) {
      this.assistantMessage = 'Applied the suggested categories and tags.';
    }

    this.postForm.markAsDirty();
  }

  protected async savePost(): Promise<boolean> {
    if (this.rejectWhileImporting('saving the post')) return false;

    if (this.isEditorialSaveInProgress) {
      this.toast.error('Wait for the evidence-only update to finish before saving the complete post.');
      return false;
    }

    if (!this.editorComponent) {
      this.toast.error('The editor is still loading. Try saving again in a moment.');
      return false;
    }

    this.isSaveInProgress = true;

    try {
      const data = await this.editorComponent.getDocument();
      return await this.onSaved({
        data,
        savedAt: new Date().toISOString(),
        blockCount: data.blocks.length,
      });
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to save editor content.');
      return false;
    } finally {
      this.isSaveInProgress = false;
    }
  }

  protected async saveEditorialOnly(): Promise<void> {
    if (this.rejectWhileImporting('saving evidence metadata')) return;

    if (!this.currentPost || this.isNewPost) {
      this.toast.error('Save this post once before using the evidence-only update.');
      return;
    }
    if (!this.hasUnsavedEditorialChanges) {
      this.toast.error('Change an Evidence & Disclosures field before saving evidence only.');
      return;
    }

    this.isEditorialSaveInProgress = true;

    try {
      const savedPost = await this.blogRepository.updatePostEditorial(
        this.currentPost,
        createEditorialMetadataFromForm(this.postForm.getRawValue())
      );

      this.currentPost = savedPost;
      this.setEditorialFormFromPost(savedPost);
      this.editorialControls.forEach(control => control.markAsPristine());
      this.saveConflict.set(null);
      this.syncLastSavedBackupJson();

      if (this.hasUnsavedChanges) {
        this.requestRecoverySave();
      } else {
        await this.deleteRecoveryBestEffort(savedPost.id);
      }

      this.toast.success(`Saved evidence metadata for "${savedPost.title}" without rewriting article blocks.`);
    } catch (error) {
      if (error instanceof BlogPostRevisionConflictError) {
        this.saveConflict.set(error);
        this.requestRecoverySave();
      }
      this.toast.error(error instanceof Error ? error.message : 'Unable to save evidence metadata.');
    } finally {
      this.isEditorialSaveInProgress = false;
    }
  }

  protected async deleteCurrentPost(): Promise<void> {
    if (this.rejectWhileImporting('deleting the post')) return;

    if (!this.currentPost || this.isNewPost) {
      this.toast.error('Save this post before deleting it.');
      return;
    }

    const post = this.currentPost;
    const confirmed = window.confirm(`Delete "${post.title}" from Firestore? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    this.isDeleteInProgress = true;

    try {
      const result = await this.blogRepository.deletePost(post.id);

      if (result === 'not-found') {
        this.toast.error(`Could not delete "${post.title}" because it was not found.`);
        return;
      }

      this.postForm.markAsPristine();
      this.hasUnsavedEditorChanges.set(false);
      this.hasUnsavedSocialChanges = false;
      await this.deleteRecoveryBestEffort(post.id);
      await this.router.navigate(['/admin/cms']);
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to delete post from Firestore.');
    } finally {
      this.isDeleteInProgress = false;
    }
  }

  protected async generatePreviewLink(): Promise<void> {
    if (this.rejectWhileImporting('generating a preview')) return;
    if (this.isPreviewGenerationInProgress || this.isJsonExportInProgress) {
      this.draftPreviewPanel?.onPreviewError('Wait for the current preview or export operation to finish.');
      return;
    }

    this.draftPreviewPanel?.clearMessages();

    if (this.postForm.controls.status.value !== 'draft') {
      this.draftPreviewPanel?.onPreviewError('Set the post status to draft before creating a preview link.');
      return;
    }

    try {
      const saved = await this.savePost();

      if (!saved || !this.currentPost) {
        this.draftPreviewPanel?.onPreviewError('Save the draft before creating a preview link.');
        return;
      }

      this.isPreviewGenerationInProgress = true;
      try {
        const result = await this.blogRepository.createPreviewForPost(this.currentPost);
        if (this.isDestroyed) return;

        this.currentPost = result.post;
        this.syncLastSavedBackupJson();
        this.toast.success('Saved the draft and refreshed its public preview link.');
        this.draftPreviewPanel?.onPreviewGenerated(result.post);
      } finally {
        this.isPreviewGenerationInProgress = false;
      }
    } catch (error) {
      if (this.isDestroyed) return;
      if (error instanceof BlogPostRevisionConflictError) {
        this.saveConflict.set(error);
        this.requestRecoverySave();
      }
      this.draftPreviewPanel?.onPreviewError(error instanceof Error ? error.message : 'Unable to create a preview link.');
    }
  }

  protected onPreviewPostChanged(post: BlogPost): void {
    if (this.isPostImportInProgress()) return;

    const socialPromotion = this.hasUnsavedSocialChanges
      ? this.socialPromotionDraft
      : post.socialPromotion ?? {announcements: []};
    this.currentPost = {
      ...post,
      socialPromotion: socialPromotion.announcements.length > 0 ? socialPromotion : undefined,
    };
    this.socialPromotionDraft = socialPromotion;
    this.socialWorkspacePost = this.createSocialWorkspacePost();
    this.syncLastSavedBackupJson();
  }

  protected async onSaved(saved: EditorSavedDocument): Promise<boolean> {
    if (this.rejectWhileImporting('saving the post')) return false;

    this.postForm.markAllAsTouched();

    if (!this.currentPost) {
      this.toast.error('Unable to save because the source post is missing.');
      return false;
    }

    if (this.postForm.invalid) {
      if (this.postForm.controls.title.invalid || this.postForm.controls.excerpt.invalid) {
        this.postDetailsOpen.set(true);
        this.openSettings('details');
      }
      if (this.postForm.controls.slug.invalid) {
        this.publishingSettingsOpen.set(true);
        this.openSettings(this.postForm.controls.slug.invalid ? 'details' : 'publish');
      }
      if (this.postForm.controls.coverImage.invalid) {
        this.mediaSettingsOpen.set(true);
        this.openSettings('media');
      }
      this.toast.error('Title, slug, excerpt, and cover image are required before saving.');
      return false;
    }

    const formValue = this.postForm.getRawValue();
    const selectedAuthor = this.authors().find(author => author.id === formValue.authorId);

    if (!selectedAuthor) {
      this.postDetailsOpen.set(true);
      this.openSettings('details');
      this.toast.error('Select a valid author before saving.');
      return false;
    }

    if (formValue.status === 'published' && selectedAuthor.status !== 'published') {
      this.postDetailsOpen.set(true);
      this.openSettings('details');
      this.toast.error('Publish the author profile before publishing this post.');
      return false;
    }
    const scheduledPublishDateError = this.getScheduledPublishDateError(formValue.status, formValue.publishedAt);

    if (scheduledPublishDateError) {
      this.publishingSettingsOpen.set(true);
      this.openSettings('publish');
      this.toast.error(scheduledPublishDateError);
      return false;
    }

    const readerReleaseDateError = getReaderReleaseDateError(formValue.earlyAccessAt, formValue.publishedAt);
    if (readerReleaseDateError) {
      this.publishingSettingsOpen.set(true);
      this.openSettings('publish');
      this.toast.error(readerReleaseDateError);
      return false;
    }

    const coverImage = requiredText(formValue.coverImage, DEFAULT_COVER_IMAGE);
    const openGraphImage = normalizeOpenGraphImage(formValue.openGraphImage, coverImage);
    const savedSlug = this.blogRepository.createUniqueSlug(formValue.slug || formValue.title, this.currentPost.id);

    try {
      const savedPost = await this.blogRepository.savePost({
        ...this.currentPost,
        authorId: selectedAuthor.id,
        author: this.createAuthorSnapshot(selectedAuthor),
        title: requiredText(formValue.title, 'Untitled Post'),
        slug: savedSlug,
        excerpt: formValue.excerpt.trim(),
        coverImage,
        backgroundImage: formValue.backgroundImage.trim() || undefined,
        featured: formValue.featured,
        catCorner: normalizeCmsCatCornerSettings(formValue.catCornerEnabled, formValue.catCornerDiscoveryPost),
        status: formValue.status,
        categories: fromCsv(formValue.categories),
        tags: fromCsv(formValue.tags),
        seo: {
          title: requiredText(formValue.seoTitle, formValue.title),
          description: requiredText(formValue.seoDescription, formValue.excerpt),
          canonical: this.resolveCanonicalUrlForSave(formValue.canonical, formValue.slug, savedSlug),
          openGraphImage,
        },
        editorial: createEditorialMetadataFromForm(formValue),
        readerRelease: createReaderReleaseFromForm(formValue),
        blocks: createBlogBlocksFromEditorDocument(saved.data),
        socialPromotion: this.socialPromotionDraft.announcements.length > 0
          ? this.socialPromotionDraft
          : undefined,
        updatedAt: saved.savedAt,
        publishedAt: this.getPublishedAt(formValue.status, formValue.publishedAt, this.currentPost.publishedAt, saved.savedAt),
      });

      this.currentPost = savedPost;
      this.postForm.controls.slug.setValue(savedPost.slug, {emitEvent: false});
      this.postForm.controls.canonical.setValue(savedPost.seo.canonical ?? this.createCanonicalUrl(savedPost.slug), {emitEvent: false});
      this.postForm.controls.publishedAt.setValue(toDateTimeLocalValue(savedPost.publishedAt), {emitEvent: false});
      this.postForm.markAsPristine();
      this.hasUnsavedEditorChanges.set(false);
      this.socialPromotionDraft = savedPost.socialPromotion ?? {announcements: []};
      this.socialWorkspacePost = this.createSocialWorkspacePost();
      this.hasUnsavedSocialChanges = false;
      this.saveConflict.set(null);
      this.lastSaved = saved;
      this.invalidateLastSavedBackupJson();
      this.invalidateSeoChecklistInput();
      this.toast.success(`Saved "${savedPost.title}" to Firestore.`);

      await this.deleteRecoveryBestEffort(savedPost.id);

      if (this.isNewPost && !this.hasCreatedPost) {
        this.hasCreatedPost = true;
        this.recoveryService.clearNewPostId();
        void this.router.navigate(['/admin/cms', savedPost.slug, 'edit'], {
          replaceUrl: true,
          queryParamsHandling: 'preserve',
        });
      }

      return true;
    } catch (error) {
      if (error instanceof BlogPostRevisionConflictError) {
        this.saveConflict.set(error);
        this.recoveryPanelExpanded.set(true);
        this.requestRecoverySave();

        if (isFirstSaveCommitConflict(this.isNewPost, error)) {
          return this.reloadRemotePost(true);
        }

        this.toast.error(error.message);
        return false;
      }
      this.toast.error(error instanceof Error ? error.message : 'Unable to save post to Firestore.');
      return false;
    }
  }

  private isActivePackageImport(operationId: number): boolean {
    return !this.isDestroyed
      && this.isPackageImportInProgress()
      && this.postImportOperationId === operationId;
  }

  private isActiveJsonImport(operationId: number): boolean {
    return !this.isDestroyed
      && this.isJsonImportInProgress()
      && this.postImportOperationId === operationId;
  }

  protected isImportLauncherUnavailable(): boolean {
    return this.isPostImportInProgress() || this.importBlockingOperation() !== null;
  }

  private rejectWhilePostOperation(action: string): boolean {
    if (this.rejectWhileImporting(action)) return true;

    const operation = this.importBlockingOperation();
    if (!operation) return false;

    this.toast.error(`Wait for ${operation} before ${action}.`);
    return true;
  }

  private importBlockingOperation(): string | null {
    if (this.isSaveInProgress || this.isEditorialSaveInProgress) return 'the current save to finish';
    if (this.isDeleteInProgress) return 'the current delete to finish';
    if (this.isPreviewGenerationInProgress) return 'preview generation to finish';
    if (this.isJsonExportInProgress) return 'the current JSON export to finish';
    if (this.isApplyingEditorState) return 'the editor state update to finish';
    if (this.isThumbnailLoading) return 'thumbnail generation to finish';
    if (this.activeMediaUploadFields.size > 0 || this.activeEditorImageUploadCount > 0) {
      return 'the current media upload to finish';
    }
    if (this.isPostLoading()) return 'the post to finish loading';
    return null;
  }

  private rejectWhileImporting(action: string): boolean {
    if (!this.isPostImportInProgress()) return false;

    this.toast.error(`Wait for the active import to finish before ${action}.`);
    return true;
  }

  private rejectWhileApplyingEditorState(action: string): boolean {
    if (!this.isApplyingEditorState) return false;

    this.toast.error(`Wait for the current editor state update to finish before ${action}.`);
    return true;
  }

  private beginEditorStateApplication(): void {
    this.editorStateOperationCount += 1;
    this.isApplyingEditorState = true;
  }

  private endEditorStateApplication(): void {
    this.editorStateOperationCount = Math.max(0, this.editorStateOperationCount - 1);
    this.isApplyingEditorState = this.editorStateOperationCount > 0;
  }

  private enqueueEditorStateApplication(work: () => Promise<void>): Promise<void> {
    this.beginEditorStateApplication();

    const operation = this.editorStateApplicationQueue.then(async () => {
      if (this.isDestroyed) return;
      await work();
    });
    const settledOperation = operation.finally(() => this.endEditorStateApplication());
    this.editorStateApplicationQueue = settledOperation.catch(() => undefined);

    return settledOperation;
  }

  private resolvePost(): BlogPost | undefined {
    if (this.slug) {
      return this.blogRepository.getAdminPostBySlug(this.slug);
    }

    const template = this.blogRepository.createNewPostTemplate();
    return {
      ...template,
      id: this.recoveryService.getOrCreateNewPostId(template.id),
    };
  }

  private async applyFirestorePost(post: BlogPost): Promise<void> {
    if (this.isPostImportInProgress()) return;

    await this.enqueueEditorStateApplication(async () => {
      const hasUnsavedChanges = this.hasUnsavedChanges;
      const disposition = getRemotePostDisposition({
        localPost: this.currentPost,
        remotePost: post,
        hasHydrated: this.hasHydratedFirestorePost || hasUnsavedChanges,
        hasUnsavedChanges,
        isLoading: this.isPostLoading(),
      });

      if (disposition === 'conflict') {
        this.saveConflict.set(new BlogPostRevisionConflictError(
          post.id,
          normalizeBlogPostRevision(this.currentPost?.revision),
          normalizeBlogPostRevision(post.revision),
          post
        ));
        return;
      }

      if (disposition === 'acknowledge') {
        this.acknowledgeFirestorePost(post);
        return;
      }

      if (disposition !== 'hydrate') return;

      await this.applyFirestorePostNow(post);
    });
  }

  private async applyFirestorePostNow(post: BlogPost): Promise<void> {
    this.currentPost = post;
    this.initialData = createEditorDocument(post);
    this.setFormFromPost(post);
    this.socialPromotionDraft = post.socialPromotion ?? {announcements: []};
    this.socialWorkspacePost = this.createSocialWorkspacePost();
    this.hasUnsavedSocialChanges = false;
    this.hasUnsavedEditorChanges.set(false);
    this.postForm.markAsPristine();
    this.hasHydratedFirestorePost = true;
    this.saveConflict.set(null);
    this.invalidateSeoChecklistInput();

    // Hydration runs through an async queue. On a cold edit route the mounted
    // template may still be the empty/loading state and no form view exists to
    // notify OnPush when these plain fields change.
    this.changeDetector.markForCheck();

    await this.editorComponent?.renderDocument(this.initialData);
    await this.loadRecoveryDraft();
  }

  private acknowledgeFirestorePost(post: BlogPost): void {
    this.currentPost = post;
    this.hasHydratedFirestorePost = true;
    this.saveConflict.set(null);
    this.invalidateSeoChecklistInput();
    this.changeDetector.markForCheck();
    void this.loadRecoveryDraft();
  }

  private createImportedPostDocument(value: unknown): ImportedPostDocument {
    const currentPost = this.currentPost ?? this.blogRepository.createNewPostTemplate();

    if (isBlogPost(value)) {
      return {
        post: value,
        sourceLabel: `post "${value.title || value.slug}"`,
      };
    }

    const nestedPost = isRecord(value) ? value['post'] : null;

    if (isBlogPost(nestedPost)) {
      return {
        post: nestedPost,
        sourceLabel: `post "${nestedPost.title || nestedPost.slug}"`,
      };
    }

    const looseNestedPost = isRecord(nestedPost) ? createLooseImportedPost(nestedPost, currentPost) : null;

    if (looseNestedPost) {
      return {
        post: looseNestedPost,
        sourceLabel: `post "${looseNestedPost.title || looseNestedPost.slug}"`,
      };
    }

    if (isRecord(value) && Array.isArray(value['posts'])) {
      const posts = value['posts'].filter(isBlogPost);
      const matchingPost = posts.find(post => post.id === currentPost.id || post.slug === currentPost.slug) ?? posts[0];

      if (matchingPost) {
        return {
          post: matchingPost,
          sourceLabel: `backup post "${matchingPost.title || matchingPost.slug}"`,
        };
      }

      const loosePosts = value['posts']
        .filter(isRecord)
        .map(post => createLooseImportedPost(post, currentPost))
        .filter((post): post is BlogPost => Boolean(post));
      const matchingLoosePost = loosePosts.find(post => post.id === currentPost.id || post.slug === currentPost.slug) ?? loosePosts[0];

      if (matchingLoosePost) {
        return {
          post: matchingLoosePost,
          sourceLabel: `backup post "${matchingLoosePost.title || matchingLoosePost.slug}"`,
        };
      }
    }

    const loosePost = isRecord(value) ? createLooseImportedPost(value, currentPost) : null;

    if (loosePost) {
      return {
        post: loosePost,
        sourceLabel: `post "${loosePost.title || loosePost.slug}"`,
      };
    }

    if (isEditorDocument(value)) {
      return {
        post: {
          ...currentPost,
          blocks: createBlogBlocksFromEditorDocument(value),
        },
        sourceLabel: 'Editor.js document',
      };
    }

    throw new Error('Expected a CMS post JSON object, a CMS export with posts, or an Editor.js document with blocks.');
  }

  private async applyImportedPost(importedPost: BlogPost): Promise<void> {
    if (!this.currentPost) {
      throw new Error('No current post is available to import into.');
    }

    const importedTitle = requiredText(importedPost.title, this.currentPost.title);
    const importedCoverImage = requiredText(importedPost.coverImage, DEFAULT_COVER_IMAGE);
    const importedOpenGraphImage = importedPost.seo.openGraphImage || importedPost.og?.image;
    const importedSlug = this.blogRepository.createUniqueSlug(
      importedPost.slug || createBlogSlug(importedTitle),
      this.currentPost.id
    );
    const nextPost: BlogPost = {
      ...this.currentPost,
      ...importedPost,
      id: this.currentPost.id,
      revision: this.currentPost.revision,
      title: importedTitle,
      slug: importedSlug,
      excerpt: importedPost.excerpt.trim(),
      coverImage: importedCoverImage,
      author: {
        ...this.currentPost.author,
        ...importedPost.author,
      },
      categories: [...importedPost.categories],
      tags: [...importedPost.tags],
      blocks: normalizeImportedPostBlocks(importedPost.blocks),
      seo: {
        ...importedPost.seo,
        title: requiredText(importedPost.seo.title || importedPost.seo.metaTitle || importedPost.og?.title || '', importedTitle),
        description: requiredText(
          importedPost.seo.description || importedPost.seo.metaDescription || importedPost.og?.description || '',
          importedPost.excerpt
        ),
        canonical: importedPost.seo.canonical ?? this.createCanonicalUrl(importedSlug),
        openGraphImage: normalizeOpenGraphImage(importedOpenGraphImage, importedCoverImage),
      },
      contentFormat: 'editorjs',
      createdAt: this.currentPost.createdAt,
      updatedAt: new Date().toISOString(),
      publishedAt: importedPost.publishedAt,
    };

    this.currentPost = nextPost;
    this.setFormFromPost(nextPost);
    this.socialPromotionDraft = nextPost.socialPromotion ?? {announcements: []};
    this.socialWorkspacePost = this.createSocialWorkspacePost();
    this.hasUnsavedSocialChanges = true;
    this.hasUnsavedEditorChanges.set(true);
    this.postForm.markAsDirty();
    this.lastSaved = null;
    this.lastSavedBackupJson = '';
    this.invalidateSeoChecklistInput();
    await this.editorComponent?.renderDocument(createEditorDocument(nextPost));
    this.activeWorkspace.set('post');
    this.focusWriting.set(false);
    this.requestRecoverySave();
  }

  private requestRecoverySave(): void {
    if (this.isApplyingEditorState) return;
    this.recoveryRequests.next();
  }

  private async loadRecoveryDraft(): Promise<void> {
    if (!this.currentPost || this.hasLoadedRecoveryDraft) return;
    this.hasLoadedRecoveryDraft = true;

    try {
      const recovery = await this.recoveryService.load(this.currentPost.id);
      this.recoveryDraft.set(recovery ?? null);
      this.recoveryStatus.set(recovery ? 'saved' : 'idle');
      this.recoveryError.set('');
    } catch (error) {
      this.hasLoadedRecoveryDraft = false;
      this.setRecoveryError(error);
    }
  }

  private async persistRecovery(force = false): Promise<boolean> {
    if (!this.currentPost || !this.editorComponent) return false;
    if (this.isRecoveryCleanupInProgress) return false;
    if (!force && (
      !this.hasUnsavedChanges
      || this.isSaveInProgress
      || this.isDeleteInProgress
      || this.isPostImportInProgress()
    )) return false;

    this.recoveryWritePending = true;
    this.recoveryForcePending ||= force;
    let didPersist = false;

    do {
      const writePromise = this.ensureRecoveryWritePromise();
      didPersist = await writePromise || didPersist;
    } while (this.recoveryWritePending || this.recoveryWritePromise);

    return didPersist;
  }

  private ensureRecoveryWritePromise(): Promise<boolean> {
    if (this.recoveryWritePromise) {
      return this.recoveryWritePromise;
    }

    const writePromise = this.drainRecoveryWrites();
    this.recoveryWritePromise = writePromise;
    void writePromise.finally(() => {
      if (this.recoveryWritePromise === writePromise) {
        this.recoveryWritePromise = null;
      }

      if (this.recoveryWritePending && !this.isRecoveryCleanupInProgress) {
        this.ensureRecoveryWritePromise();
      }
    });

    return writePromise;
  }

  private async drainRecoveryWrites(): Promise<boolean> {
    let didPersist = false;

    while (this.recoveryWritePending) {
      const force = this.recoveryForcePending;
      this.recoveryWritePending = false;
      this.recoveryForcePending = false;

      if (!this.currentPost || !this.editorComponent || this.isRecoveryCleanupInProgress) {
        continue;
      }

      if (!force && (
        !this.hasUnsavedChanges
        || this.isSaveInProgress
        || this.isDeleteInProgress
        || this.isPostImportInProgress()
      )) {
        continue;
      }

      this.recoveryStatus.set('saving');
      this.recoveryError.set('');

      try {
        await this.writeRecoverySnapshot();
        didPersist = true;
      } catch (error) {
        this.setRecoveryError(error);
      }
    }

    return didPersist;
  }

  private async writeRecoverySnapshot(): Promise<void> {
    if (!this.currentPost || !this.editorComponent) return;

    const editor = await this.editorComponent.getRecoverySnapshot();
    const write: CmsPostRecoveryWrite = {
      postId: this.currentPost.id,
      postSlug: this.postForm.controls.slug.value,
      isNewPost: this.isNewPost && !this.hasCreatedPost,
      baseRevision: normalizeBlogPostRevision(this.currentPost.revision),
      baseUpdatedAt: this.currentPost.updatedAt,
      form: this.postForm.getRawValue(),
      editor,
      socialPromotion: this.socialPromotionDraft,
    };
    const recovery = await this.recoveryService.save(write);
    this.recoveryDraft.set(recovery);
    this.recoveryStatus.set('saved');
  }

  private async deleteRecoveryBestEffort(postId: string | undefined): Promise<void> {
    if (!postId) return;

    this.isRecoveryCleanupInProgress = true;

    try {
      this.recoveryWritePending = false;
      this.recoveryForcePending = false;
      await this.recoveryWritePromise;
      this.recoveryWritePending = false;
      this.recoveryForcePending = false;
      await this.recoveryService.delete(postId);
      this.recoveryDraft.set(null);
      this.showRecoveryComparison.set(false);
      this.recoveryStatus.set('idle');
      this.recoveryError.set('');
    } catch (error) {
      this.setRecoveryError(error);
    } finally {
      this.isRecoveryCleanupInProgress = false;

      if (this.hasUnsavedChanges) {
        this.requestRecoverySave();
      }
    }
  }

  private setRecoveryError(error: unknown): void {
    this.recoveryStatus.set('error');
    this.recoveryError.set(error instanceof Error ? error.message : 'Unable to access the private recovery draft.');
  }

  private createSocialWorkspacePost(): BlogPost {
    const sourcePost = this.currentPost ?? this.blogRepository.createNewPostTemplate();
    const form = this.postForm.getRawValue();
    const coverImage = requiredText(form.coverImage, sourcePost.coverImage || DEFAULT_COVER_IMAGE);

    return {
      ...sourcePost,
      title: requiredText(form.title, 'Untitled Post'),
      slug: createBlogSlug(form.slug || form.title || sourcePost.slug),
      excerpt: form.excerpt.trim(),
      coverImage,
      backgroundImage: form.backgroundImage.trim() || undefined,
      featured: form.featured,
      status: form.status,
      categories: fromCsv(form.categories),
      tags: fromCsv(form.tags),
      seo: {
        ...sourcePost.seo,
        title: requiredText(form.seoTitle, form.title),
        description: requiredText(form.seoDescription, form.excerpt),
        canonical: form.canonical.trim() || this.createCanonicalUrl(form.slug),
        openGraphImage: normalizeOpenGraphImage(form.openGraphImage, coverImage),
      },
      editorial: createEditorialMetadataFromForm(form),
      readerRelease: createReaderReleaseFromForm(form),
      publishedAt: fromDateTimeLocalValue(form.publishedAt),
      socialPromotion: this.socialPromotionDraft,
    };
  }

  private async createAssistantContext(): Promise<BlogAssistantContext> {
    const document = await this.editorComponent?.getDocument() ?? this.initialData;
    const formValue = this.postForm.getRawValue();

    return {
      title: formValue.title,
      excerpt: formValue.excerpt,
      seoTitle: formValue.seoTitle,
      seoDescription: formValue.seoDescription,
      categories: fromCsv(formValue.categories),
      tags: fromCsv(formValue.tags),
      blocks: createBlogBlocksFromEditorDocument(document),
    };
  }

  private async createCurrentBackupPost(): Promise<BlogPost> {
    if (!this.currentPost) {
      throw new Error('No current post is available to export.');
    }

    const document = await (this.editorComponent?.getDocument() ?? Promise.resolve(this.initialData));
    const formValue = this.postForm.getRawValue();
    const backupCreatedAt = new Date().toISOString();
    const coverImage = requiredText(formValue.coverImage, DEFAULT_COVER_IMAGE);
    const openGraphImage = normalizeOpenGraphImage(formValue.openGraphImage, coverImage);
    const slug = this.blogRepository.createUniqueSlug(
      formValue.slug || formValue.title || this.currentPost.slug,
      this.currentPost.id
    );
    const selectedAuthor = this.authors().find(author => author.id === formValue.authorId);

    return {
      ...this.currentPost,
      ...(selectedAuthor ? {
        authorId: selectedAuthor.id,
        author: this.createAuthorSnapshot(selectedAuthor),
      } : {}),
      title: requiredText(formValue.title, 'Untitled Post'),
      slug,
      excerpt: formValue.excerpt.trim(),
      coverImage,
      backgroundImage: formValue.backgroundImage.trim() || undefined,
      featured: formValue.featured,
      catCorner: normalizeCmsCatCornerSettings(formValue.catCornerEnabled, formValue.catCornerDiscoveryPost),
      status: formValue.status,
      categories: fromCsv(formValue.categories),
      tags: fromCsv(formValue.tags),
      seo: {
        ...this.currentPost.seo,
        title: requiredText(formValue.seoTitle, formValue.title),
        description: requiredText(formValue.seoDescription, formValue.excerpt),
        canonical: this.resolveCanonicalUrlForSave(formValue.canonical, formValue.slug, slug),
        openGraphImage,
      },
      editorial: createEditorialMetadataFromForm(formValue),
      readerRelease: createReaderReleaseFromForm(formValue),
      blocks: createBlogBlocksFromEditorDocument(document),
      socialPromotion: this.socialPromotionDraft.announcements.length > 0
        ? this.socialPromotionDraft
        : undefined,
      updatedAt: backupCreatedAt,
      publishedAt: this.getPublishedAt(formValue.status, formValue.publishedAt, this.currentPost.publishedAt, backupCreatedAt),
    };
  }

  private createPostBackupJson(post: BlogPost): string {
    return JSON.stringify(this.blogRepository.createExportDocument([post]), null, 2);
  }

  private getLastSavedBackupJson(): string {
    if (!this.lastSavedBackupJson && this.lastSaved && this.currentPost) {
      this.lastSavedBackupJson = this.createPostBackupJson(this.currentPost);
    }

    return this.lastSavedBackupJson;
  }

  private invalidateLastSavedBackupJson(): void {
    this.lastSavedBackupJson = '';

    if (this.lastSavedPanelExpanded()) {
      this.getLastSavedBackupJson();
    }
  }

  private syncLastSavedBackupJson(): void {
    if (!this.lastSaved || !this.currentPost) {
      return;
    }

    this.invalidateLastSavedBackupJson();
    this.invalidateSeoChecklistInput();
  }

  private downloadJson(contents: string, fileName: string): void {
    const blob = new Blob([contents], {type: 'application/json'});
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
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
      throw new Error('Clipboard access is unavailable in this browser.');
    }
  }

  private get editorialControls() {
    return [
      this.postForm.controls.evidenceBasis,
      this.postForm.controls.evidenceSummary,
      this.postForm.controls.sourceReviewedAt,
      this.postForm.controls.relationshipDisclosure,
      this.postForm.controls.aiAssistanceDisclosure,
      this.postForm.controls.syntheticMediaDisclosure,
      this.postForm.controls.updateNote,
    ] as const;
  }

  private createForm(post: BlogPost): FormGroup<PostEditorForm> {
    const catCorner = createCmsCatCornerFormValue(post.catCorner);

    return new FormGroup<PostEditorForm>({
      authorId: new FormControl(post.authorId ?? DEFAULT_AUTHOR_ID, {nonNullable: true, validators: [Validators.required]}),
      title: new FormControl(post.title, {nonNullable: true, validators: [Validators.required]}),
      slug: new FormControl(post.slug, {nonNullable: true, validators: [Validators.required]}),
      excerpt: new FormControl(post.excerpt, {nonNullable: true, validators: [Validators.required]}),
      coverImage: new FormControl(post.coverImage, {nonNullable: true, validators: [Validators.required]}),
      backgroundImage: new FormControl(post.backgroundImage ?? '', {nonNullable: true}),
      featured: new FormControl(Boolean(post.featured), {nonNullable: true}),
      catCornerEnabled: new FormControl(catCorner.enabled, {nonNullable: true}),
      catCornerDiscoveryPost: new FormControl(
        {value: catCorner.discoveryPost, disabled: !catCorner.enabled},
        {nonNullable: true}
      ),
      status: new FormControl(post.status, {nonNullable: true, validators: [Validators.required]}),
      publishedAt: new FormControl(toDateTimeLocalValue(post.publishedAt), {nonNullable: true}),
      announceInSchedule: new FormControl(post.readerRelease?.announceInSchedule ?? false, {nonNullable: true}),
      earlyAccessAt: new FormControl(toDateTimeLocalValue(post.readerRelease?.earlyAccessAt ?? null), {nonNullable: true}),
      categories: new FormControl(toCsv(post.categories), {nonNullable: true}),
      tags: new FormControl(toCsv(post.tags), {nonNullable: true}),
      seoTitle: new FormControl(post.seo.title, {nonNullable: true}),
      seoDescription: new FormControl(post.seo.description, {nonNullable: true}),
      canonical: new FormControl(post.seo.canonical ?? this.createCanonicalUrl(post.slug), {nonNullable: true}),
      openGraphImage: new FormControl(normalizeOpenGraphImage(post.seo.openGraphImage, post.coverImage), {nonNullable: true}),
      evidenceBasis: new FormControl<BlogEvidenceBasis | ''>(post.editorial?.evidenceBasis ?? '', {nonNullable: true}),
      evidenceSummary: new FormControl(post.editorial?.evidenceSummary ?? '', {nonNullable: true}),
      sourceReviewedAt: new FormControl(post.editorial?.sourceReviewedAt ?? '', {nonNullable: true}),
      relationshipDisclosure: new FormControl(post.editorial?.relationshipDisclosure ?? '', {nonNullable: true}),
      aiAssistanceDisclosure: new FormControl(post.editorial?.aiAssistanceDisclosure ?? '', {nonNullable: true}),
      syntheticMediaDisclosure: new FormControl(post.editorial?.syntheticMediaDisclosure ?? '', {nonNullable: true}),
      updateNote: new FormControl(post.editorial?.updateNote ?? '', {nonNullable: true}),
    });
  }

  private syncCatCornerDiscoveryControl(): void {
    const discoveryControl = this.postForm.controls.catCornerDiscoveryPost;

    if (this.postForm.controls.catCornerEnabled.value) {
      discoveryControl.enable({emitEvent: false});
      return;
    }

    discoveryControl.setValue(false, {emitEvent: false});
    discoveryControl.disable({emitEvent: false});
  }

  private setFormFromPost(post: BlogPost): void {
    const catCorner = createCmsCatCornerFormValue(post.catCorner);

    this.postForm.setValue({
      authorId: post.authorId ?? DEFAULT_AUTHOR_ID,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      backgroundImage: post.backgroundImage ?? '',
      featured: Boolean(post.featured),
      catCornerEnabled: catCorner.enabled,
      catCornerDiscoveryPost: catCorner.discoveryPost,
      status: post.status,
      publishedAt: toDateTimeLocalValue(post.publishedAt),
      announceInSchedule: post.readerRelease?.announceInSchedule ?? false,
      earlyAccessAt: toDateTimeLocalValue(post.readerRelease?.earlyAccessAt ?? null),
      categories: toCsv(post.categories),
      tags: toCsv(post.tags),
      seoTitle: post.seo.title,
      seoDescription: post.seo.description,
      canonical: post.seo.canonical ?? this.createCanonicalUrl(post.slug),
      openGraphImage: normalizeOpenGraphImage(post.seo.openGraphImage, post.coverImage),
      evidenceBasis: post.editorial?.evidenceBasis ?? '',
      evidenceSummary: post.editorial?.evidenceSummary ?? '',
      sourceReviewedAt: post.editorial?.sourceReviewedAt ?? '',
      relationshipDisclosure: post.editorial?.relationshipDisclosure ?? '',
      aiAssistanceDisclosure: post.editorial?.aiAssistanceDisclosure ?? '',
      syntheticMediaDisclosure: post.editorial?.syntheticMediaDisclosure ?? '',
      updateNote: post.editorial?.updateNote ?? '',
    });
    this.syncCatCornerDiscoveryControl();
  }

  private setEditorialFormFromPost(post: BlogPost): void {
    this.postForm.patchValue({
      evidenceBasis: post.editorial?.evidenceBasis ?? '',
      evidenceSummary: post.editorial?.evidenceSummary ?? '',
      sourceReviewedAt: post.editorial?.sourceReviewedAt ?? '',
      relationshipDisclosure: post.editorial?.relationshipDisclosure ?? '',
      aiAssistanceDisclosure: post.editorial?.aiAssistanceDisclosure ?? '',
      syntheticMediaDisclosure: post.editorial?.syntheticMediaDisclosure ?? '',
      updateNote: post.editorial?.updateNote ?? '',
    }, {emitEvent: false});
  }

  private createAuthorSnapshot(author: AuthorProfile): BlogPost['author'] {
    return {
      name: author.name,
      title: author.title || undefined,
      bio: author.shortBio || undefined,
      avatarUrl: author.avatarUrl || undefined,
      profileUrl: `/authors/${author.slug}`,
      slug: author.slug,
    };
  }

  protected createSeoChecklistInput(): SeoChecklistInput {
    if (this.seoChecklistInputCache) {
      return this.seoChecklistInputCache;
    }

    const formValue = this.postForm.getRawValue();

    this.seoChecklistInputCache = {
      title: formValue.title,
      slug: formValue.slug,
      excerpt: formValue.excerpt,
      coverImage: formValue.coverImage,
      categories: fromCsv(formValue.categories),
      tags: fromCsv(formValue.tags),
      seoTitle: formValue.seoTitle,
      seoDescription: formValue.seoDescription,
      canonical: formValue.canonical,
      generatedCanonicalUrl: this.generatedCanonicalUrl,
      openGraphImage: formValue.openGraphImage,
      blocks: this.activeWorkspace() === 'preview' && this.reviewBlocks() ? this.reviewBlocks()! : this.getLatestKnownBlocks(),
      editorial: createEditorialMetadataFromForm(formValue),
    };

    return this.seoChecklistInputCache;
  }

  private getLatestKnownBlocks(): readonly BlogContentBlock[] {
    if (this.lastSaved) {
      if (this.seoChecklistBlocksSource !== this.lastSaved || !this.seoChecklistBlocksCache) {
        this.seoChecklistBlocksSource = this.lastSaved;
        this.seoChecklistBlocksCache = createBlogBlocksFromEditorDocument(this.lastSaved.data);
      }

      return this.seoChecklistBlocksCache;
    }

    return this.currentPost?.blocks ?? [];
  }

  private invalidateSeoChecklistInput(): void {
    this.seoChecklistInputCache = null;

    if (this.seoChecklistBlocksSource !== this.lastSaved) {
      this.seoChecklistBlocksSource = null;
      this.seoChecklistBlocksCache = null;
    }
  }

  private createCanonicalUrl(slug: string): string {
    const normalizedSlug = createBlogSlug(slug);

    return normalizedSlug ? `${BLOG_CANONICAL_BASE_URL}/${normalizedSlug}` : BLOG_CANONICAL_BASE_URL;
  }

  private syncCanonicalFromSlug(previousSlug: string): void {
    const canonicalControl = this.postForm.controls.canonical;

    if (!this.isGeneratedCanonicalValue(canonicalControl.value, previousSlug)) {
      return;
    }

    canonicalControl.setValue(this.createCanonicalUrl(this.postForm.controls.slug.value), {emitEvent: false});
  }

  private resolveCanonicalUrlForSave(value: string, formSlug: string, savedSlug: string): string {
    const trimmedValue = value.trim();

    if (!trimmedValue || this.isGeneratedCanonicalValue(trimmedValue, formSlug)) {
      return this.createCanonicalUrl(savedSlug);
    }

    return trimmedValue;
  }

  private isGeneratedCanonicalValue(value: string, slug: string): boolean {
    const trimmedValue = value.trim();

    return !trimmedValue || trimmedValue === this.createCanonicalUrl(slug);
  }

  private getPublishedAt(
    status: BlogPostStatus,
    formValue: string,
    currentValue: string | null,
    savedAt: string
  ): string | null {
    const requestedValue = fromDateTimeLocalValue(formValue);

    if (requestedValue) {
      return requestedValue;
    }

    return status === 'published' ? currentValue ?? savedAt : null;
  }

  private getScheduledPublishDateError(status: BlogPostStatus, formValue: string): string | null {
    if (status !== 'scheduled') {
      return null;
    }

    const requestedValue = fromDateTimeLocalValue(formValue);

    if (!requestedValue) {
      return 'Choose a publish date before scheduling this post.';
    }

    const requestedTimestamp = new Date(requestedValue).getTime();

    if (!Number.isFinite(requestedTimestamp) || requestedTimestamp <= Date.now()) {
      return 'Choose a future publish date before scheduling this post.';
    }

    return null;
  }

  protected statusColorClass(status: BlogPostStatus): string {
    switch (status) {
      case 'draft':
        return 'text-amber-300';
      case 'scheduled':
        return 'text-blue-300';
      case 'published':
        return 'text-emerald-300';
      case 'archived':
        return 'text-zinc-500';
    }
  }

  private markUploadedMedia(upload: BlogMediaUploadResult): void {
    this.postForm.markAsDirty();
    this.toast.success(`Uploaded ${upload.originalName}. Save the post to persist the media URL.`);
  }
}
