import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
} from '../../../../features/blog/models/blog-post.model';
import {BlogPostRevisionConflictError, normalizeBlogPostRevision} from '../../../../features/blog/models/blog-post-revision.model';
import {
  BLOG_SOCIAL_CHANNELS,
  BlogSocialChannel,
  BlogSocialPromotion,
} from '../../../../features/blog/models/blog-social-promotion.model';
import {BlogRepositoryService, createBlogSlug} from '../../../../features/blog/services/blog-repository.service';
import {DEFAULT_COVER_IMAGE} from '../../../../features/blog/blog.constants';
import {
  BLOG_POST_STATUSES,
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

type PostEditorWorkspace = 'post' | 'social' | 'preview';

interface PostEditorWorkspaceTab {
  id: PostEditorWorkspace;
  label: string;
  description: string;
}

const POST_EDITOR_WORKSPACES: readonly PostEditorWorkspaceTab[] = [
  {id: 'post', label: 'Post', description: 'Write and publish the article'},
  {id: 'social', label: 'Social shares', description: 'Compose native platform posts'},
  {id: 'preview', label: 'Preview & SEO', description: 'Review the reader and search experience'},
];

function isPostEditorWorkspace(value: string | null): value is PostEditorWorkspace {
  return POST_EDITOR_WORKSPACES.some(workspace => workspace.id === value);
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
    AdminControlModuleComponent,
    CmsAuthorFormComponent,
    PostPackageImportProgressComponent,
    PostScheduleCalendarComponent,
    SocialPromotionEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 pb-20 pt-6 text-zinc-100 sm:px-8 sm:pb-28 lg:px-10">
      <section class="mx-auto max-w-7xl space-y-4">
        @if (currentPost; as post) {
          <header class="grid gap-3 border-b border-zinc-800 pb-5 md:grid-cols-[1fr_auto] md:items-end">
            <div class="space-y-1.5">
              <p class="text-xs uppercase tracking-[0.24em] text-cyan-300">{{ isNewPost ? 'New Post' : 'CMS Editor' }}</p>
              <h1 class="text-3xl font-semibold tracking-tight text-zinc-50">{{ editorTitle }}</h1>
              <p class="line-clamp-2 max-w-3xl text-sm leading-5 text-zinc-500">{{ editorExcerpt || 'Set the essentials, write the article, then finish publishing metadata when it is ready.' }}</p>
            </div>
            <div class="flex flex-wrap gap-2 md:justify-end">
              <input
                #postJsonImportInput
                type="file"
                class="hidden"
                accept=".json,application/json"
                [disabled]="isImportLauncherUnavailable()"
                (change)="importPostJson($event)"
              >
              <input
                #postPackageImportInput
                type="file"
                class="hidden"
                accept=".json,application/json,image/jpeg,image/png,image/webp,image/avif,image/gif"
                multiple
                webkitdirectory
                [disabled]="isImportLauncherUnavailable()"
                (change)="importPostPackage($event)"
              >
              @if (isNewPost) {
                <button
                  type="button"
                  class="inline-flex h-9 items-center justify-center border border-cyan-500/70 px-3 text-xs font-medium text-cyan-200 hover:bg-cyan-500 hover:text-zinc-950 aria-disabled:cursor-not-allowed aria-disabled:border-zinc-700 aria-disabled:text-zinc-500 aria-disabled:hover:bg-transparent aria-disabled:hover:text-zinc-500"
                  [attr.aria-disabled]="isImportLauncherUnavailable()"
                  title="Choose a folder containing the post JSON, image manifest, and generated images"
                  (click)="openPostPackagePicker(postPackageImportInput)"
                >
                  {{ isPackageImportInProgress() ? 'Importing package...' : 'Import post package' }}
                </button>
              }
              <button
                type="button"
                class="inline-flex h-9 items-center justify-center border border-zinc-700 px-3 text-xs font-medium text-zinc-300 hover:bg-zinc-800 aria-disabled:cursor-not-allowed aria-disabled:text-zinc-500 aria-disabled:hover:bg-transparent"
                [attr.aria-disabled]="isImportLauncherUnavailable()"
                (click)="openPostJsonPicker(postJsonImportInput)"
              >
                {{ isJsonImportInProgress() ? 'Importing JSON...' : 'Import JSON' }}
              </button>
              <button
                type="button"
                class="inline-flex h-9 items-center justify-center border border-zinc-700 px-3 text-xs font-medium text-zinc-300 hover:bg-zinc-800 aria-disabled:cursor-not-allowed aria-disabled:border-zinc-800 aria-disabled:text-zinc-600 aria-disabled:hover:bg-transparent"
                [attr.aria-disabled]="isPostImportInProgress() || isJsonExportInProgress || isPreviewGenerationInProgress"
                (click)="exportPostJson()"
              >
                {{ isJsonExportInProgress ? 'Exporting JSON...' : 'Export JSON' }}
              </button>
            </div>
          </header>

          <p
            class="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="post-import-announcement"
          >
            {{ postImportAnnouncement() }}
          </p>

          @if (packageImportProgress(); as importProgress) {
            <app-post-package-import-progress [progress]="importProgress"></app-post-package-import-progress>
          }

          <nav
            class="overflow-x-auto border border-zinc-800 bg-zinc-900/40"
            aria-label="Post workspace"
            [attr.inert]="isPostImportInProgress() ? '' : null"
            [attr.aria-disabled]="isPostImportInProgress()"
          >
            <div class="flex min-w-max">
              @for (workspace of workspaces; track workspace.id) {
                <button
                  type="button"
                  [class]="workspaceTabClass(workspace.id)"
                  [attr.aria-current]="activeWorkspace() === workspace.id ? 'page' : null"
                  (click)="setWorkspace(workspace.id)"
                >
                  <span class="block text-sm font-semibold">{{ workspace.label }}</span>
                  <span class="mt-0.5 hidden text-[11px] font-normal sm:block">{{ workspace.description }}</span>
                </button>
              }
            </div>
          </nav>

          <section
            class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"
            [hidden]="activeWorkspace() !== 'post'"
            [style.display]="activeWorkspace() === 'post' ? null : 'none'"
            [attr.inert]="isPostImportInProgress() ? '' : null"
            [attr.aria-busy]="isPostImportInProgress()"
            aria-label="Post editor workspace"
          >
            <section class="space-y-3">
              <form [formGroup]="postForm" class="space-y-2">
                <app-admin-control-module
                  title="Post Details"
                  [summary]="editorTitle"
                  description="The title and excerpt readers see across the site."
                  [expanded]="postDetailsOpen()"
                  (expandedChange)="postDetailsOpen.set($event)"
                >
                  <div class="grid gap-3 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] md:items-start">
                    <label class="space-y-1.5">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Title</span>
                      <input
                        type="text"
                        formControlName="title"
                        class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                        (input)="syncSlugFromTitle()"
                      >
                    </label>
                    <label class="space-y-1.5">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Excerpt</span>
                      <textarea
                        formControlName="excerpt"
                        rows="2"
                        class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                      ></textarea>
                    </label>
                    <div class="space-y-1.5 md:col-span-2">
                      <span class="flex items-center justify-between gap-3">
                        <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Author</span>
                        <button type="button" class="text-xs font-medium text-cyan-300 hover:text-cyan-100" (click)="startAddingAuthor()">Add author</button>
                      </span>
                      <select formControlName="authorId" class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                        @for (author of authors(); track author.id) {
                          <option [value]="author.id">{{ author.name }}{{ author.status === 'draft' ? ' (draft)' : '' }}</option>
                        }
                      </select>
                      @if (selectedAuthor(); as author) {
                        <p class="text-xs text-zinc-500">{{ author.title || 'Contributor' }} · /authors/{{ author.slug }}</p>
                      }
                    </div>
                    @if (newAuthor(); as author) {
                      <section class="border border-cyan-400/30 bg-zinc-900/70 p-4 md:col-span-2" aria-label="Add author">
                        <app-cms-author-form [author]="author" (authorSaved)="onAuthorCreated($event)" (cancelled)="newAuthor.set(null)"></app-cms-author-form>
                      </section>
                    }
                  </div>
                </app-admin-control-module>

                <app-admin-control-module
                  title="Publishing"
                  [summary]="postForm.controls.status.value + ' · ' + postedOnPreview"
                  description="Set the URL, schedule, taxonomy, and homepage priority. These values usually change once per post."
                  [expanded]="publishingSettingsOpen()"
                  (expandedChange)="publishingSettingsOpen.set($event)"
                >
                  <div class="grid gap-3 md:grid-cols-2">
                    <label class="space-y-1.5 md:col-span-2">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Slug</span>
                      <input
                        type="text"
                        formControlName="slug"
                        class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                        (blur)="normalizeSlug()"
                      >
                    </label>
                    <label class="space-y-1.5 md:col-span-2">
                      <span class="flex items-center justify-between gap-3">
                        <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Publish Date</span>
                        <span class="flex items-center gap-3">
                          <button
                            type="button"
                            class="text-xs font-medium text-cyan-300 hover:text-cyan-100"
                            (click)="scheduleCalendarOpen.set(!scheduleCalendarOpen())"
                          >
                            {{ scheduleCalendarOpen() ? 'Hide calendar' : 'View calendar' }}
                          </button>
                          <button type="button" class="text-xs font-medium text-cyan-300 hover:text-cyan-100"
                                  (click)="setPublishedAtNow()">Use current time</button>
                        </span>
                      </span>
                      <input
                        type="datetime-local"
                        formControlName="publishedAt"
                        class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                        (focus)="scheduleCalendarOpen.set(true)"
                        (input)="scheduleCalendarOpen.set(true)"
                      >
                      <span class="block text-xs leading-5 text-zinc-600">Scheduled posts require a future time.</span>
                    </label>
                    @if (scheduleCalendarOpen()) {
                      <div class="md:col-span-2">
                        <app-post-schedule-calendar
                          [posts]="calendarPosts()"
                          [currentPostId]="post.id"
                          [value]="postForm.controls.publishedAt.value"
                          (valueChange)="applyScheduleCalendarValue($event)"
                        ></app-post-schedule-calendar>
                      </div>
                    }
                    <label class="space-y-1.5">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Categories</span>
                      <input type="text" formControlName="categories" placeholder="CMS, Angular" class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                    </label>
                    <label class="space-y-1.5">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Tags</span>
                      <input type="text" formControlName="tags" placeholder="Editor.js, Drafts" class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                    </label>
                    <label class="flex items-center justify-between gap-3 border border-zinc-800 bg-zinc-950/70 px-3 py-2 md:col-span-2">
                      <span>
                        <span class="block text-xs font-medium text-zinc-300">Featured post</span>
                        <span class="mt-0.5 block text-xs text-zinc-600">
                          The newest published featured post owns the homepage hero; older featured posts can remain marked.
                        </span>
                      </span>
                      <input type="checkbox" formControlName="featured" class="border-zinc-600 bg-zinc-950 text-cyan-500 focus:ring-cyan-300">
                    </label>
                    <label class="flex items-center justify-between gap-3 border border-amber-500/30 bg-amber-950/15 px-3 py-3 md:col-span-2">
                      <span>
                        <span class="block text-xs font-medium text-amber-100">Cat Corner post</span>
                        <span class="mt-0.5 block text-xs leading-5 text-zinc-500">
                          Adds this post to Gretchen's Cat Corner. Non-discovery Cat Corner posts stay out of public blog listings but still work at their direct published URL.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        formControlName="catCornerEnabled"
                        class="border-zinc-600 bg-zinc-950 text-amber-500 focus:ring-amber-300"
                        (change)="onCatCornerEnabledChanged($event)"
                      >
                    </label>
                    <label
                      class="flex items-center justify-between gap-3 border border-zinc-800 bg-zinc-950/70 px-3 py-3 md:col-span-2"
                      [class.opacity-50]="!postForm.controls.catCornerEnabled.value"
                    >
                      <span>
                        <span class="block text-xs font-medium text-zinc-300">Discovery post</span>
                        <span class="mt-0.5 block text-xs leading-5 text-zinc-600">
                          Keeps this Cat Corner post visible in normal blog feeds so readers can find an embedded Gretchen unlock block.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        formControlName="catCornerDiscoveryPost"
                        class="border-zinc-600 bg-zinc-950 text-amber-500 focus:ring-amber-300"
                      >
                    </label>
                    @if (postForm.controls.catCornerEnabled.value && !postForm.controls.catCornerDiscoveryPost.value) {
                      <p class="border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs leading-5 text-amber-100 md:col-span-2" role="status">
                        Hidden listing mode: this post will appear in Cat Corner for members, but not in the public blog, home feed, categories, or search. Anyone with its direct URL can still read it.
                      </p>
                    }
                  </div>
                </app-admin-control-module>

                <app-admin-control-module
                  title="Post Images"
                  [summary]="mediaModuleSummary"
                  description="Choose the required cover image and an optional wide, text-free editorial image for featured reading surfaces."
                  [expanded]="mediaSettingsOpen()"
                  (expandedChange)="mediaSettingsOpen.set($event)"
                >
                  <div class="grid gap-3">
                    <app-blog-media-uploader
                      formControlName="coverImage"
                      label="Cover Image"
                      buttonLabel="Choose Cover"
                      previewAlt="Cover image preview"
                      assetRole="cover"
                      [postSlug]="mediaUploadSlug"
                      [required]="true"
                      [disabled]="isCoverMediaWriterUnavailable()"
                      (uploadStateChange)="setMediaUploadInProgress('cover', $event)"
                      (mediaUploaded)="onCoverImageUploaded($event)"
                    ></app-blog-media-uploader>

                    <app-blog-media-uploader
                      formControlName="backgroundImage"
                      label="Editorial Feature / Post Background"
                      description="Optional. Used behind the article and as the full-bleed homepage backdrop when this post owns the hero. The normal post image remains visible in the homepage panel. Use a clean landscape image without baked-in headlines; at least 1920px wide works best."
                      buttonLabel="Choose Editorial Image"
                      placeholder="Optional editorial image URL"
                      previewAlt="Editorial feature image preview"
                      assetRole="post-background"
                      [postSlug]="mediaUploadSlug"
                      [optimizationMaxWidth]="2560"
                      [optimizationMaxHeight]="1600"
                      [optimizationQuality]="0.84"
                      [disabled]="isPostImportInProgress()"
                      (uploadStateChange)="setMediaUploadInProgress('background', $event)"
                      (mediaUploaded)="onBackgroundImageUploaded($event)"
                    ></app-blog-media-uploader>

                    @if (postForm.controls.backgroundImage.value.trim()) {
                      <div
                        class="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                        <p class="text-xs text-zinc-500">The editorial image remains separate from the required cover
                          image and supplies the article and homepage backdrops.</p>
                        <button
                          type="button"
                          class="border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                          (click)="clearBackgroundImage()"
                        >
                          Remove editorial image from post
                        </button>
                      </div>
                    }
                  </div>
                </app-admin-control-module>

                <app-admin-control-module
                  title="Evidence & Disclosures"
                  [summary]="postForm.controls.evidenceBasis.value ? 'Classified · ' + postForm.controls.evidenceBasis.value : 'Unclassified · legacy notice shown'"
                  description="Tell readers what was personally experienced, researched, supplied, assisted, or materially corrected. Blank disclosure fields make no claim."
                  [expanded]="editorialSettingsOpen()"
                  (expandedChange)="editorialSettingsOpen.set($event)"
                >
                  <div class="grid gap-3 md:grid-cols-2">
                    <label class="space-y-1.5">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Primary evidence basis</span>
                      <select
                        formControlName="evidenceBasis"
                        class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                      >
                        <option value="">Not classified yet</option>
                        @for (option of evidenceBasisOptions; track option.value) {
                          <option [value]="option.value">{{ option.label }}</option>
                        }
                      </select>
                    </label>
                    <label class="space-y-1.5">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Sources checked</span>
                      <input
                        type="date"
                        formControlName="sourceReviewedAt"
                        class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                      >
                    </label>
                    <label class="space-y-1.5 md:col-span-2">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Evidence summary</span>
                      <textarea
                        formControlName="evidenceSummary"
                        rows="3"
                        maxlength="1200"
                        placeholder="Example: I flew the aircraft for three batteries; range and waterproofing specifications remain manufacturer claims."
                        class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                      ></textarea>
                    </label>
                    <label class="space-y-1.5 md:col-span-2">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Relationship disclosure</span>
                      <textarea
                        formControlName="relationshipDisclosure"
                        rows="2"
                        maxlength="1200"
                        placeholder="State sponsorship, affiliate links, free products, loans, travel, early access, or other relevant relationships."
                        class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                      ></textarea>
                    </label>
                    <label class="space-y-1.5">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">AI assistance disclosure</span>
                      <textarea
                        formControlName="aiAssistanceDisclosure"
                        rows="3"
                        maxlength="1200"
                        placeholder="Describe material AI help with research organization, transcription, drafting, code, or visual ideation."
                        class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                      ></textarea>
                    </label>
                    <label class="space-y-1.5">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Synthetic media disclosure</span>
                      <textarea
                        formControlName="syntheticMediaDisclosure"
                        rows="3"
                        maxlength="1200"
                        placeholder="Identify editorial illustrations or synthetic media that could be mistaken for documentary evidence."
                        class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                      ></textarea>
                    </label>
                    <label class="space-y-1.5 md:col-span-2">
                      <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Latest substantive update or correction</span>
                      <textarea
                        formControlName="updateNote"
                        rows="2"
                        maxlength="1000"
                        placeholder="Explain what materially changed and why. Leave blank for routine copy edits."
                        class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                      ></textarea>
                    </label>
                    <p class="border border-cyan-400/25 bg-cyan-400/5 px-3 py-2 text-xs leading-5 text-zinc-400 md:col-span-2">
                      Unclassified articles remain publishable for migration safety, but readers see that their evidence details have not yet been reviewed under the current editorial standard.
                    </p>
                    <div
                      class="flex flex-col gap-3 border border-zinc-800 bg-zinc-950/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:col-span-2">
                      <div class="space-y-1">
                        <p class="text-xs font-medium text-zinc-200">Legacy-safe evidence update</p>
                        @if (isNewPost) {
                          <p class="text-xs leading-5 text-zinc-500">Save the new post once before using the
                            evidence-only update.</p>
                        } @else {
                          <p class="text-xs leading-5 text-zinc-500">Updates only Evidence & Disclosures. Article blocks
                            and every other unsaved field stay untouched.</p>
                        }
                      </div>
                      <button
                        type="button"
                        class="h-9 shrink-0 border border-cyan-400/70 px-3 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent"
                        [disabled]="isNewPost || !hasUnsavedEditorialChanges || isEditorialSaveInProgress || isSaveInProgress || isDeleteInProgress"
                        (click)="saveEditorialOnly()"
                      >
                        {{ isEditorialSaveInProgress ? 'Saving evidence' : 'Save evidence only' }}
                      </button>
                    </div>
                  </div>
                </app-admin-control-module>

                <app-admin-control-module
                  title="Search & Sharing"
                  [summary]="seoModuleSummary"
                  description="Review search metadata, canonical URL, and the optional social-share image during the final publishing pass."
                  [expanded]="seoSettingsOpen()"
                  (expandedChange)="seoSettingsOpen.set($event)"
                >
                  <div class="grid gap-3">
                    <label class="space-y-1.5">
                      <span class="flex items-center justify-between gap-3">
                        <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">SEO Title</span>
                        <span class="text-xs tabular-nums text-zinc-500">{{ postForm.controls.seoTitle.value.length }} / 60</span>
                      </span>
                      <input type="text" formControlName="seoTitle" class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                    </label>
                    <label class="space-y-1.5">
                      <span class="flex items-center justify-between gap-3">
                        <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">SEO Description</span>
                        <span class="text-xs tabular-nums text-zinc-500">{{ postForm.controls.seoDescription.value.length }} / 160</span>
                      </span>
                      <textarea formControlName="seoDescription" rows="2" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"></textarea>
                    </label>
                    <label class="space-y-1.5">
                      <span class="flex items-center justify-between gap-3">
                        <span class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">Canonical URL</span>
                        <button type="button" class="text-xs font-medium text-cyan-300 hover:text-cyan-100" (click)="useGeneratedCanonicalUrl()">Use generated</button>
                      </span>
                      <input type="url" formControlName="canonical" [placeholder]="generatedCanonicalUrl" class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                      <span class="block break-all text-xs leading-5 text-zinc-600">{{ canonicalUrlMode }}</span>
                    </label>
                    <app-blog-media-uploader
                      formControlName="openGraphImage"
                      label="Open Graph / Social Share Image"
                      description="Optional JPEG override. Leave blank to use the cover image."
                      buttonLabel="Choose OG Image"
                      placeholder="Optional custom social image URL"
                      previewAlt="Open Graph image preview"
                      assetRole="open-graph"
                      optimizationOutputType="image/jpeg"
                      [forceOptimizationOutputType]="true"
                      [postSlug]="mediaUploadSlug"
                      [disabled]="isPostImportInProgress()"
                      (uploadStateChange)="setMediaUploadInProgress('open-graph', $event)"
                      (mediaUploaded)="onOpenGraphImageUploaded($event)"
                    ></app-blog-media-uploader>
                    <div class="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                      <p class="text-xs text-zinc-500">{{ openGraphImageMode }}</p>
                      @if (postForm.controls.openGraphImage.value.trim()) {
                        <button type="button" class="border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800" (click)="clearOpenGraphImage()">Clear custom image</button>
                      }
                    </div>
                  </div>
                </app-admin-control-module>
              </form>

              <app-editor-js
                title="Article Content"
                [saveLabel]="'Save Post'"
                [showSaveAction]="false"
                [initialData]="initialData"
                [imageUploader]="uploadEditorImage"
                [previewTitle]="editorTitle"
                [previewExcerpt]="editorExcerpt"
                [previewCoverImage]="postForm.controls.coverImage.value"
                [previewPostId]="post.id"
                [previewPostSlug]="postForm.controls.slug.value"
                (saved)="onSaved($event)"
                (contentChanged)="onEditorContentChanged()"
              ></app-editor-js>
            </section>

            <aside class="space-y-2 border-t border-zinc-800 pt-4 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-10rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:border-l xl:border-t-0 xl:pl-4 xl:pr-1 xl:pt-0">
              <app-admin-control-module
                title="Post State"
                [summary]="postForm.controls.status.value + ' · ' + postedOnPreview"
              >
                <dl class="space-y-2 text-xs">
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Status</dt>
                    <dd
                      [class]="statusColorClass(postForm.controls.status.value)">{{ postForm.controls.status.value }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Slug</dt>
                    <dd class="text-right text-zinc-200">{{ postForm.controls.slug.value }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Publish date</dt>
                    <dd class="text-right text-zinc-200">{{ postedOnPreview }}</dd>
                  </div>
                </dl>
              </app-admin-control-module>

              <app-admin-control-module
                title="Distribution"
                [summary]="distributionSummary"
                description="Compose channel-specific native posts while the article is still taking shape."
              >
                <p class="text-xs leading-5 text-zinc-500">
                  Social drafts save with this post. Scheduling remains available from Calendar after the article launch time is set.
                </p>
                <button
                  type="button"
                  class="mt-3 inline-flex h-9 items-center justify-center border border-cyan-400 px-3 text-xs font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
                  (click)="setWorkspace('social')"
                >
                  Compose social shares
                </button>
                @if (canOpenDistributionCalendar) {
                  <button
                    type="button"
                    class="mt-3 inline-flex h-9 items-center justify-center border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                    (click)="openDistributionCalendar()"
                  >
                    Open Calendar
                  </button>
                }
              </app-admin-control-module>

              <app-admin-control-module
                title="Recovery & Conflicts"
                [summary]="recoverySummary"
                description="Recovery copies are private to your account and never publish or replace the canonical post automatically."
              >
                <div class="space-y-3 text-xs">
                  <p class="text-zinc-500">{{ recoveryRevisionSummary }}</p>

                  @if (recoveryStatus() === 'error') {
                    <p class="border border-red-500/50 bg-red-950/30 px-3 py-2 leading-5 text-red-200" role="alert">
                      {{ recoveryError() }}
                    </p>
                  }

                  @if (saveConflict(); as conflict) {
                    <div class="space-y-2 border border-amber-500/60 bg-amber-950/20 p-3" role="alert">
                      <p class="font-semibold text-amber-200">Canonical save conflict</p>
                      <p class="leading-5 text-amber-100/80">{{ conflict.message }}</p>
                      <div class="flex flex-wrap gap-2">
                        @if (conflict.remotePost) {
                          <button type="button" class="border border-amber-500/70 px-2.5 py-1.5 font-medium text-amber-100 hover:bg-amber-900/50" (click)="reloadRemotePost()">
                            Reload remote
                          </button>
                        }
                        <button type="button" class="border border-cyan-500/70 px-2.5 py-1.5 font-medium text-cyan-100 hover:bg-cyan-900/40" (click)="saveConflictAsCopy()">
                          Save as new draft
                        </button>
                      </div>
                    </div>
                  }

                  @if (recoveryDraft(); as recovery) {
                    <div class="space-y-2 border border-zinc-700 bg-zinc-950/70 p-3">
                      <p class="font-medium text-zinc-200">Recovery available from {{ formatRecoveryDate(recovery.savedAt) }}</p>
                      <p class="break-all text-zinc-600">{{ recovery.contentHash }}</p>
                      <div class="flex flex-wrap gap-2">
                        <button type="button" class="border border-cyan-500/70 px-2.5 py-1.5 font-medium text-cyan-100 hover:bg-cyan-900/40" (click)="restoreRecoveryDraft()">
                          Restore recovery
                        </button>
                        <button type="button" class="border border-zinc-600 px-2.5 py-1.5 font-medium text-zinc-200 hover:bg-zinc-800" (click)="showRecoveryComparison.set(!showRecoveryComparison())">
                          {{ showRecoveryComparison() ? 'Hide compare' : 'Compare' }}
                        </button>
                        <button type="button" class="border border-red-500/60 px-2.5 py-1.5 font-medium text-red-200 hover:bg-red-950/40" (click)="discardRecoveryDraft()">
                          Discard
                        </button>
                      </div>
                      @if (showRecoveryComparison()) {
                        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-zinc-800 pt-2 text-zinc-400">
                          <dt>Title</dt><dd class="truncate text-zinc-200">{{ recovery.form.title }}</dd>
                          <dt>Status</dt><dd class="text-zinc-200">{{ recovery.form.status }}</dd>
                          <dt>Blocks</dt><dd class="text-zinc-200">{{ recoveryEditorBlockCount(recovery) }}</dd>
                          <dt>Base</dt><dd class="text-zinc-200">r{{ recovery.baseRevision }} · {{ formatRecoveryDate(recovery.baseUpdatedAt) }}</dd>
                        </dl>
                      }
                    </div>
                  }
                </div>
              </app-admin-control-module>

              <app-cms-assistant-panel
                [result]="assistantResult"
                [isLoading]="isAssistantLoading"
                [message]="assistantMessage"
                [error]="assistantError"
                [sourceLabel]="assistantSourceLabel"
                [isThumbnailLoading]="isThumbnailLoading"
                [isThumbnailWriterUnavailable]="isThumbnailWriterUnavailable()"
                [thumbnailError]="thumbnailError"
                [lastGeneratedThumbnail]="lastGeneratedThumbnail"
                (generateRequested)="generateAssistantSuggestions()"
                (applyAll)="applySuggestion($event)"
                (applyTitle)="applyTitleSuggestion($event)"
                (applyDescription)="applyDescriptionSuggestion($event)"
                (applyTaxonomy)="applyTaxonomySuggestion($event)"
                (generateThumbnail)="generateAndStoreThumbnail($event)"
              ></app-cms-assistant-panel>

              <app-admin-control-module title="Last Saved" [summary]="lastSavedSummary">
                @if (lastSaved; as saved) {
                  <div class="space-y-3">
                    <p class="text-sm text-zinc-400">{{ saved.blockCount }} blocks at {{ saved.savedAt }}</p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        class="border border-zinc-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-200 hover:bg-zinc-800"
                        (click)="copyLastSavedJson()"
                      >
                        Copy JSON
                      </button>
                      <button
                        type="button"
                        class="border border-zinc-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-200 hover:bg-zinc-800"
                        (click)="downloadLastSavedJson()"
                      >
                        Download JSON
                      </button>
                    </div>
                    <pre
                      class="max-h-[420px] overflow-auto bg-black p-4 text-xs leading-5 text-cyan-100">{{ lastSavedBackupJson }}</pre>
                  </div>
                } @else {
                  <p class="text-sm text-zinc-500">
                    Saved post JSON will appear here after the first save.
                  </p>
                }
              </app-admin-control-module>
            </aside>
          </section>

          <section
            class="space-y-4"
            [hidden]="activeWorkspace() !== 'social'"
            [style.display]="activeWorkspace() === 'social' ? null : 'none'"
            [attr.inert]="isPostImportInProgress() ? '' : null"
            [attr.aria-busy]="isPostImportInProgress()"
            aria-label="Social shares workspace"
          >
            <header class="border border-zinc-800 bg-zinc-900/50 px-4 py-4 sm:px-5">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Article campaign</p>
                  <h2 class="mt-1 text-xl font-semibold text-zinc-50">Build the social story alongside the article</h2>
                  <p class="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">
                    Draft native text, images, videos, reels, stories, threads, and Community posts here. Save them with the article, then use Calendar when a delivery time is ready.
                  </p>
                </div>
                <span class="border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400">
                  {{ distributionSummary }}
                </span>
              </div>
            </header>

            <app-social-promotion-editor
              [post]="socialWorkspacePost"
              mode="compose"
              [initialChannel]="initialSocialChannel"
              [initialAnnouncementId]="initialSocialAnnouncementId"
              [saving]="isSaveInProgress"
              [assistantContextProvider]="socialAssistantContextProvider"
              (promotionChange)="onSocialPromotionChange($event)"
              (saveRequested)="saveSocialPromotion($event)"
              (openCalendarRequested)="openDistributionCalendar()"
            ></app-social-promotion-editor>
          </section>

          <section
            class="space-y-4"
            [hidden]="activeWorkspace() !== 'preview'"
            [style.display]="activeWorkspace() === 'preview' ? null : 'none'"
            [attr.inert]="isPostImportInProgress() ? '' : null"
            [attr.aria-busy]="isPostImportInProgress()"
            aria-label="Preview and SEO workspace"
          >
            <header class="border border-zinc-800 bg-zinc-900/50 px-4 py-4 sm:px-5">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Final review</p>
              <h2 class="mt-1 text-xl font-semibold text-zinc-50">See the article the way readers and search engines will</h2>
              <p class="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">
                Generate a temporary reader preview, then resolve the SEO and share-card checks before publishing.
              </p>
            </header>

            <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <app-cms-draft-preview-panel
                #draftPreviewPanel
                [post]="currentPost"
                [status]="postForm.controls.status.value"
                [isSaving]="isSaveInProgress || isPreviewGenerationInProgress"
                [isDeleting]="isDeleteInProgress"
                (generateRequested)="generatePreviewLink()"
                (postChanged)="onPreviewPostChanged($event)"
              ></app-cms-draft-preview-panel>

              <div class="space-y-3">
                <app-cms-seo-checklist
                  [checklistInput]="createSeoChecklistInput()"
                ></app-cms-seo-checklist>
                <button
                  type="button"
                  class="inline-flex h-10 w-full items-center justify-center border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 hover:border-cyan-400 hover:text-cyan-200"
                  (click)="openSeoFields()"
                >
                  Edit SEO &amp; share-card fields
                </button>
              </div>
            </div>
          </section>

          <section
            class="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 px-5 py-2 shadow-2xl shadow-black/40 backdrop-blur transition-[left] duration-200 sm:px-8 lg:left-[var(--admin-sidebar-width)] lg:px-12"
            [attr.inert]="isPostImportInProgress() ? '' : null"
            [attr.aria-busy]="isPostImportInProgress()"
            aria-label="Post actions"
          >
            <div class="mx-auto flex max-w-7xl items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-3">
                <label class="shrink-0 sm:min-w-44">
                  <span class="sr-only">Status</span>
                  <select
                    [formControl]="postForm.controls.status"
                    class="h-9 w-28 border border-zinc-700 bg-zinc-950 px-3 text-sm font-medium text-zinc-100 outline-none focus:border-cyan-300 sm:w-full"
                  >
                    @for (status of statuses; track status) {
                      <option [value]="status">{{ status }}</option>
                    }
                  </select>
                </label>

                <div class="hidden min-w-0 text-sm text-zinc-400 md:block">
                  <p class="font-medium text-zinc-200">{{ editorTitle }}</p>
                  <p class="truncate text-xs text-zinc-500">/{{ postForm.controls.slug.value }}</p>
                </div>
              </div>

              <div class="flex min-w-0 items-center gap-2">
                @if (hasUnsavedChanges) {
                  <span class="hidden text-xs text-amber-300/80 lg:inline">● Unsaved changes</span>
                }
                <div class="flex items-center justify-end gap-2">
                  @if (!isNewPost || post.status === 'published' || hasActiveDraftPreview) {
                    <details class="group relative sm:hidden">
                      <summary class="flex h-9 cursor-pointer list-none items-center border border-zinc-700 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-800 focus-visible:border-cyan-400 focus-visible:outline-none">
                        More
                      </summary>
                      <div class="absolute bottom-full right-0 mb-2 grid min-w-40 gap-1 border border-zinc-700 bg-zinc-950 p-1.5 shadow-2xl shadow-black/60">
                        @if (post.status === 'published') {
                          <a
                            [routerLink]="['/blog', post.slug]"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex h-9 items-center px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                          >
                            View Post
                          </a>
                        } @else if (hasActiveDraftPreview) {
                          <a
                            [href]="draftPreviewUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex h-9 items-center px-3 text-xs font-medium text-amber-200 hover:bg-amber-950/30"
                          >
                            View Preview
                          </a>
                        }
                        @if (!isNewPost) {
                          <button
                            type="button"
                            class="h-9 px-3 text-left text-xs font-medium text-red-200 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:text-zinc-600"
                            [disabled]="isDeleteInProgress || isSaveInProgress || isPostImportInProgress()"
                            (click)="deleteCurrentPost()"
                          >
                            {{ isDeleteInProgress ? 'Deleting' : 'Delete Post' }}
                          </button>
                        }
                      </div>
                    </details>
                  }

                  @if (post.status === 'published') {
                    <a
                      [routerLink]="['/blog', post.slug]"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="hidden h-9 items-center justify-center border border-zinc-700 px-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 sm:inline-flex"
                    >
                      View Post
                    </a>
                  } @else if (hasActiveDraftPreview) {
                    <a
                      [href]="draftPreviewUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="hidden h-9 items-center justify-center border border-amber-500/60 px-3 text-sm font-medium text-amber-200 transition hover:bg-amber-950/30 sm:inline-flex"
                    >
                      View Preview
                    </a>
                  } @else {
                    <button
                      type="button"
                      class="hidden h-9 border border-zinc-800 px-3 text-sm font-medium text-zinc-600 sm:inline-block"
                      disabled
                    >
                      View Post
                    </button>
                  }

                  <button
                    type="button"
                    class="hidden h-9 border border-red-500/60 px-3 text-sm font-medium text-red-200 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent sm:inline-block"
                    [disabled]="isNewPost || isDeleteInProgress || isSaveInProgress || isEditorialSaveInProgress || isPostImportInProgress()"
                    (click)="deleteCurrentPost()"
                  >
                    {{ isDeleteInProgress ? 'Deleting' : 'Delete Post' }}
                  </button>

                  <button
                    type="button"
                    class="h-9 border border-cyan-400 bg-cyan-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-transparent disabled:text-zinc-600"
                    [disabled]="isSaveInProgress || isDeleteInProgress || isEditorialSaveInProgress || isPostImportInProgress()"
                    (click)="savePost()"
                  >
                    {{ isSaveInProgress ? 'Saving' : 'Save Post' }}
                  </button>
                </div>
              </div>
            </div>
          </section>
        } @else if (isPostLoading()) {
          <section class="border border-zinc-800 bg-zinc-900 p-6">
            <h1 class="text-2xl font-semibold text-zinc-50">Loading post</h1>
            <p class="mt-2 text-zinc-400">Fetching the latest CMS post data from Firestore.</p>
          </section>
        } @else {
          <section class="border border-zinc-800 bg-zinc-900 p-6">
            <h1 class="text-2xl font-semibold text-zinc-50">Post not found</h1>
            <p class="mt-2 text-zinc-400">This post is unavailable in the CMS repository.</p>
            <a routerLink="/admin/cms" class="mt-5 inline-block text-cyan-300 hover:text-cyan-200">Back to posts</a>
          </section>
        }
      </section>
    </main>
    <app-cms-toast-container></app-cms-toast-container>
  `,
})
export class CmsPostEditorComponent implements AfterViewInit {
  @ViewChild(EditorJsComponent) private editorComponent?: EditorJsComponent;
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
  private recoveryWritePromise: Promise<void> | null = null;
  private postImportOperationId = 0;
  private readonly activeMediaUploadFields = new Set<string>();
  private activeEditorImageUploadCount = 0;
  private isDestroyed = false;

  protected readonly isNewPost = !this.slug;
  protected readonly statuses = statusOptions;
  protected readonly evidenceBasisOptions = evidenceBasisOptions;
  protected readonly workspaces = POST_EDITOR_WORKSPACES;
  protected readonly activeWorkspace = signal<PostEditorWorkspace>(
    isPostEditorWorkspace(this.route.snapshot.queryParamMap.get('tab'))
      ? this.route.snapshot.queryParamMap.get('tab') as PostEditorWorkspace
      : 'post'
  );
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
  protected readonly isPostLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected lastSaved: EditorSavedDocument | null = null;
  protected lastSavedBackupJson = '';
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
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.postImportOperationId += 1;
    });

    this.postForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.requestRecoverySave());

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
    const base = 'min-w-36 border-r border-zinc-800 px-4 py-3 text-left transition last:border-r-0 sm:min-w-52';
    return this.activeWorkspace() === workspace
      ? `${base} bg-cyan-400 text-zinc-950`
      : `${base} text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100`;
  }

  protected setWorkspace(workspace: PostEditorWorkspace): void {
    if (this.rejectWhileImporting('changing editor workspaces')) return;

    if (workspace === 'social') {
      this.socialWorkspacePost = this.createSocialWorkspacePost();
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
    this.setWorkspace('post');
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

  protected async reloadRemotePost(): Promise<void> {
    if (this.rejectWhileImporting('reloading the canonical post')) return;
    if (this.rejectWhileApplyingEditorState('reloading the canonical post again')) return;

    const remotePost = this.saveConflict()?.remotePost;
    if (!remotePost) {
      this.toast.error('The canonical post no longer exists. Save your work as a new draft instead.');
      return;
    }

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
      this.toast.success('Reloaded the latest canonical revision. Your earlier local work remains available in Recovery.');
    });
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
    input.click();
  }

  protected openPostPackagePicker(input: HTMLInputElement): void {
    if (this.rejectWhilePostOperation('choosing another import')) return;
    input.click();
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

    const operationId = ++this.postImportOperationId;
    this.isJsonImportInProgress.set(true);
    this.postImportAnnouncement.set('Importing the selected JSON document.');
    try {
      const parsedJson: unknown = JSON.parse(await file.text());
      if (!this.isActiveJsonImport(operationId)) return;

      const importedDocument = this.createImportedPostDocument(parsedJson);
      await this.applyImportedPost(importedDocument.post);
      if (!this.isActiveJsonImport(operationId)) return;

      this.postImportAnnouncement.set('');
      this.toast.success(`Imported ${importedDocument.sourceLabel} from ${file.name}. Review and save to persist it.`);
    } catch (error) {
      if (!this.isActiveJsonImport(operationId)) return;

      this.postImportAnnouncement.set('');
      this.toast.error(`Unable to import JSON: ${getErrorMessage(error)}`);
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
      this.toast.error(`Unable to import post package: ${errorMessage}${uploadedMediaNotice}`);
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

  protected async copyLastSavedJson(): Promise<void> {
    if (!this.lastSavedBackupJson) {
      this.toast.error('Save this post before copying its JSON backup.');
      return;
    }

    try {
      await this.copyTextToClipboard(this.lastSavedBackupJson);
      this.toast.success('Copied the last saved post JSON.');
    } catch (error) {
      this.toast.error(`Unable to copy JSON: ${getErrorMessage(error)}`);
    }
  }

  protected downloadLastSavedJson(): void {
    if (!this.lastSavedBackupJson || !this.currentPost) {
      this.toast.error('Save this post before downloading its JSON backup.');
      return;
    }

    this.downloadJson(this.lastSavedBackupJson, createPostBackupFileName(this.currentPost.slug));
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
      }
      if (this.postForm.controls.slug.invalid) {
        this.publishingSettingsOpen.set(true);
      }
      if (this.postForm.controls.coverImage.invalid) {
        this.mediaSettingsOpen.set(true);
      }
      this.toast.error('Title, slug, excerpt, and cover image are required before saving.');
      return false;
    }

    const formValue = this.postForm.getRawValue();
    const selectedAuthor = this.authors().find(author => author.id === formValue.authorId);

    if (!selectedAuthor) {
      this.postDetailsOpen.set(true);
      this.toast.error('Select a valid author before saving.');
      return false;
    }

    if (formValue.status === 'published' && selectedAuthor.status !== 'published') {
      this.postDetailsOpen.set(true);
      this.toast.error('Publish the author profile before publishing this post.');
      return false;
    }
    const scheduledPublishDateError = this.getScheduledPublishDateError(formValue.status, formValue.publishedAt);

    if (scheduledPublishDateError) {
      this.publishingSettingsOpen.set(true);
      this.toast.error(scheduledPublishDateError);
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
      this.lastSavedBackupJson = this.createPostBackupJson(savedPost);
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
        this.requestRecoverySave();
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

    await this.editorComponent?.renderDocument(this.initialData);
    await this.loadRecoveryDraft();
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
    await this.editorComponent?.renderDocument(createEditorDocument(nextPost));
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
    if (!force && (
      !this.hasUnsavedChanges
      || this.isSaveInProgress
      || this.isDeleteInProgress
      || this.isPostImportInProgress()
    )) return false;

    if (this.recoveryWritePromise) {
      await this.recoveryWritePromise.catch(() => undefined);
    }

    if (!this.currentPost || !this.editorComponent) return false;
    if (!force && (
      !this.hasUnsavedChanges
      || this.isSaveInProgress
      || this.isDeleteInProgress
      || this.isPostImportInProgress()
    )) return false;

    this.recoveryStatus.set('saving');
    this.recoveryError.set('');

    const writePromise = this.writeRecoverySnapshot();
    this.recoveryWritePromise = writePromise;

    try {
      await writePromise;
      return true;
    } catch (error) {
      this.setRecoveryError(error);
      return false;
    } finally {
      if (this.recoveryWritePromise === writePromise) {
        this.recoveryWritePromise = null;
      }
    }
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

    try {
      await this.recoveryWritePromise?.catch(() => undefined);
      await this.recoveryService.delete(postId);
      this.recoveryDraft.set(null);
      this.showRecoveryComparison.set(false);
      this.recoveryStatus.set('idle');
      this.recoveryError.set('');
    } catch (error) {
      this.setRecoveryError(error);
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

  private syncLastSavedBackupJson(): void {
    if (!this.lastSaved || !this.currentPost) {
      return;
    }

    this.lastSavedBackupJson = this.createPostBackupJson(this.currentPost);
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
    const formValue = this.postForm.getRawValue();

    return {
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
      blocks: this.getLatestKnownBlocks(),
      editorial: createEditorialMetadataFromForm(formValue),
    };
  }

  private getLatestKnownBlocks(): readonly BlogContentBlock[] {
    if (this.lastSaved) {
      return createBlogBlocksFromEditorDocument(this.lastSaved.data);
    }

    return this.currentPost?.blocks ?? [];
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
