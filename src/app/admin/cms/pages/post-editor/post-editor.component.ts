import {Component, ViewChild, effect, inject, ChangeDetectionStrategy, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import type {OutputData} from '@editorjs/editorjs';
import {lastValueFrom} from 'rxjs';

import {BlogContentBlock, BlogPost, BlogPostStatus} from '../../../../features/blog/models/blog-post.model';
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
import {EditorImageUploadResult, EditorJsComponent} from '../../components/editor-js/editor-js.component';
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
import {BlogAiAssistantService} from '../../services/blog-ai-assistant.service';
import {BlogAiFunctionsService} from '../../services/blog-ai-functions.service';
import {BlogMediaUploadResult, BlogMediaUploadService} from '../../services/blog-media-upload.service';
import {CmsToastContainerComponent} from '../../components/toast/cms-toast.component';
import {CmsToastService} from '../../services/cms-toast.service';
import {createBlogBlocksFromEditorDocument, createEditorDocument} from '../../utils/blog-editorjs-adapter';
import {createBlogBlocksFromMarkdown} from '../../utils/blog-markdown-import.util';
import {SeoChecklistInput} from '../../utils/blog-seo-checklist';

interface PostEditorForm {
  title: FormControl<string>;
  slug: FormControl<string>;
  excerpt: FormControl<string>;
  coverImage: FormControl<string>;
  featured: FormControl<boolean>;
  status: FormControl<BlogPostStatus>;
  publishedAt: FormControl<string>;
  categories: FormControl<string>;
  tags: FormControl<string>;
  seoTitle: FormControl<string>;
  seoDescription: FormControl<string>;
  canonical: FormControl<string>;
  openGraphImage: FormControl<string>;
}

interface ImportedPostDocument {
  post: BlogPost;
  sourceLabel: string;
}

const BLOG_CANONICAL_BASE_URL = `${SITE_URL}/blog`;
const statusOptions: readonly BlogPostStatus[] = BLOG_POST_STATUSES;
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
    if (block.type !== 'stats' && block.type !== 'chart') {
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
  const thumbnailImage = getTrimmedString(value['thumbnailImage']) || getTrimmedString(value['thumbnail']);
  const categories = getImportedStringArray(value['categories']);
  const subcategories = getImportedStringArray(value['subcategories']);
  const tags = getImportedStringArray(value['tags']);
  const featured = typeof value['featured'] === 'boolean' ? value['featured'] : currentPost.featured;
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
    featured,
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
                (change)="importPostJson($event)"
              >
              <button
                type="button"
                class="inline-flex h-9 items-center justify-center border border-zinc-700 px-3 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                (click)="postJsonImportInput.click()"
              >
                Import JSON
              </button>
              <button
                type="button"
                class="inline-flex h-9 items-center justify-center border border-zinc-700 px-3 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                (click)="exportPostJson()"
              >
                Export JSON
              </button>
            </div>
          </header>

          <section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
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
                        <button type="button" class="text-xs font-medium text-cyan-300 hover:text-cyan-100" (click)="setPublishedAtNow()">Use current time</button>
                      </span>
                      <input
                        type="datetime-local"
                        formControlName="publishedAt"
                        class="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                      >
                      <span class="block text-xs leading-5 text-zinc-600">Scheduled posts require a future time.</span>
                    </label>
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
                        <span class="mt-0.5 block text-xs text-zinc-600">Prioritize this post on the homepage.</span>
                      </span>
                      <input type="checkbox" formControlName="featured" class="border-zinc-600 bg-zinc-950 text-cyan-500 focus:ring-cyan-300">
                    </label>
                  </div>
                </app-admin-control-module>

                <app-admin-control-module
                  title="Cover Image"
                  [summary]="mediaModuleSummary"
                  description="Choose the primary 16:9 image used by cards and the article hero."
                  [expanded]="mediaSettingsOpen()"
                  (expandedChange)="mediaSettingsOpen.set($event)"
                >
                  <app-blog-media-uploader
                    formControlName="coverImage"
                    label="Cover Image"
                    buttonLabel="Choose Cover"
                    previewAlt="Cover image preview"
                    assetRole="cover"
                    [postSlug]="mediaUploadSlug"
                    [required]="true"
                    (mediaUploaded)="onCoverImageUploaded($event)"
                  ></app-blog-media-uploader>
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
                (saved)="onSaved($event)"
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

              <app-cms-draft-preview-panel
                #draftPreviewPanel
                [post]="currentPost"
                [status]="postForm.controls.status.value"
                [isSaving]="isSaveInProgress"
                [isDeleting]="isDeleteInProgress"
                (generateRequested)="generatePreviewLink()"
                (postChanged)="onPreviewPostChanged($event)"
              ></app-cms-draft-preview-panel>

              <app-cms-seo-checklist
                [checklistInput]="createSeoChecklistInput()"
              ></app-cms-seo-checklist>

              <app-cms-assistant-panel
                [result]="assistantResult"
                [isLoading]="isAssistantLoading"
                [message]="assistantMessage"
                [error]="assistantError"
                [sourceLabel]="assistantSourceLabel"
                [isThumbnailLoading]="isThumbnailLoading"
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
            class="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 px-5 py-2 shadow-2xl shadow-black/40 backdrop-blur transition-[left] duration-200 sm:px-8 lg:left-[var(--admin-sidebar-width)] lg:px-12"
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
                @if (postForm.dirty) {
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
                            [disabled]="isDeleteInProgress || isSaveInProgress"
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
                    [disabled]="isNewPost || isDeleteInProgress || isSaveInProgress"
                    (click)="deleteCurrentPost()"
                  >
                    {{ isDeleteInProgress ? 'Deleting' : 'Delete Post' }}
                  </button>

                  <button
                    type="button"
                    class="h-9 border border-cyan-400 bg-cyan-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-transparent disabled:text-zinc-600"
                    [disabled]="isSaveInProgress || isDeleteInProgress"
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
export class CmsPostEditorComponent {
  @ViewChild(EditorJsComponent) private editorComponent?: EditorJsComponent;
  @ViewChild(CmsDraftPreviewPanelComponent) private draftPreviewPanel?: CmsDraftPreviewPanelComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly blogAssistant = inject(BlogAiAssistantService);
  private readonly blogAiFunctions = inject(BlogAiFunctionsService);
  private readonly blogMediaUpload = inject(BlogMediaUploadService);
  private readonly toast = inject(CmsToastService);
  private readonly slug = this.route.snapshot.paramMap.get('slug');
  private readonly firestorePost = this.slug
    ? toSignal(this.blogRepository.getAdminPostBySlug$(this.slug), {initialValue: undefined})
    : null;
  private hasHydratedFirestorePost = false;
  private hasCreatedPost = false;

  protected readonly isNewPost = !this.slug;
  protected readonly statuses = statusOptions;
  protected currentPost = this.resolvePost();
  protected initialData: OutputData = this.currentPost ? createEditorDocument(this.currentPost) : {blocks: []};
  protected readonly postForm = this.createForm(this.currentPost ?? this.blogRepository.createNewPostTemplate());
  protected readonly postDetailsOpen = signal(true);
  protected readonly publishingSettingsOpen = signal(false);
  protected readonly mediaSettingsOpen = signal(false);
  protected readonly seoSettingsOpen = signal(false);
  protected readonly isPostLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected lastSaved: EditorSavedDocument | null = null;
  protected lastSavedBackupJson = '';
  protected isSaveInProgress = false;
  protected isDeleteInProgress = false;
  protected assistantResult: BlogAssistantResult | null = null;
  protected assistantMessage = '';
  protected assistantError = '';
  protected isAssistantLoading = false;
  protected isThumbnailLoading: string | null = null;
  protected thumbnailError = '';
  protected lastGeneratedThumbnail: BlogStoredThumbnail | null = null;
  protected readonly uploadEditorImage = async (file: File): Promise<EditorImageUploadResult> => {
    const upload = await lastValueFrom(this.blogMediaUpload.uploadImage(file, {
      slug: this.mediaUploadSlug,
      role: 'editor-image',
    }));

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
  };

  constructor() {
    if (!this.firestorePost) {
      return;
    }

    effect(() => {
      const post = this.firestorePost?.();

      if (!post || (this.hasHydratedFirestorePost && this.postForm.dirty)) {
        return;
      }

      void this.applyFirestorePost(post);
    });
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

  protected get openGraphImageMode(): string {
    const openGraphImage = this.postForm.controls.openGraphImage.value.trim();
    const coverImage = this.postForm.controls.coverImage.value.trim();

    if (!openGraphImage || openGraphImage === coverImage) {
      return 'Using cover image fallback.';
    }

    return 'Using custom Open Graph image.';
  }

  protected get mediaModuleSummary(): string {
    return this.postForm.controls.coverImage.value.trim() ? 'Cover image ready' : 'Cover image required';
  }

  protected get seoModuleSummary(): string {
    const titleLength = this.postForm.controls.seoTitle.value.length;
    const descriptionLength = this.postForm.controls.seoDescription.value.length;
    return `${titleLength}/60 title · ${descriptionLength}/160 description · ${this.openGraphImageMode}`;
  }

  protected get lastSavedSummary(): string {
    return this.lastSaved ? `${this.lastSaved.blockCount} blocks · ${this.lastSaved.savedAt}` : 'Available after the first save';
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

  protected async importPostJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (input) {
      input.value = '';
    }

    if (!file) {
      return;
    }

    try {
      const parsedJson: unknown = JSON.parse(await file.text());
      const importedDocument = this.createImportedPostDocument(parsedJson);
      await this.applyImportedPost(importedDocument.post);
      this.toast.success(`Imported ${importedDocument.sourceLabel} from ${file.name}. Review and save to persist it.`);
    } catch (error) {
      this.toast.error(`Unable to import JSON: ${getErrorMessage(error)}`);
    }
  }

  protected async exportPostJson(): Promise<void> {
    try {
      const backupPost = await this.createCurrentBackupPost();
      this.downloadJson(this.createPostBackupJson(backupPost), createPostBackupFileName(backupPost.slug));
      this.toast.success(`Exported "${backupPost.title}" as JSON.`);
    } catch (error) {
      this.toast.error(`Unable to export JSON: ${getErrorMessage(error)}`);
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

  protected onOpenGraphImageUploaded(upload: BlogMediaUploadResult): void {
    this.markUploadedMedia(upload);
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

  protected async deleteCurrentPost(): Promise<void> {
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

      await this.router.navigate(['/admin/cms']);
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to delete post from Firestore.');
    } finally {
      this.isDeleteInProgress = false;
    }
  }

  protected async generatePreviewLink(): Promise<void> {
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

      const result = await this.blogRepository.createPreviewForPost(this.currentPost);
      this.currentPost = result.post;
      this.syncLastSavedBackupJson();
      this.toast.success('Saved the draft and refreshed its public preview link.');
      this.draftPreviewPanel?.onPreviewGenerated(result.post);
    } catch (error) {
      this.draftPreviewPanel?.onPreviewError(error instanceof Error ? error.message : 'Unable to create a preview link.');
    }
  }

  protected onPreviewPostChanged(post: BlogPost): void {
    this.currentPost = post;
    this.syncLastSavedBackupJson();
  }

  protected async onSaved(saved: EditorSavedDocument): Promise<boolean> {
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
        title: requiredText(formValue.title, 'Untitled Post'),
        slug: savedSlug,
        excerpt: formValue.excerpt.trim(),
        coverImage,
        featured: formValue.featured,
        status: formValue.status,
        categories: fromCsv(formValue.categories),
        tags: fromCsv(formValue.tags),
        seo: {
          title: requiredText(formValue.seoTitle, formValue.title),
          description: requiredText(formValue.seoDescription, formValue.excerpt),
          canonical: this.resolveCanonicalUrlForSave(formValue.canonical, formValue.slug, savedSlug),
          openGraphImage,
        },
        blocks: createBlogBlocksFromEditorDocument(saved.data),
        updatedAt: saved.savedAt,
        publishedAt: this.getPublishedAt(formValue.status, formValue.publishedAt, this.currentPost.publishedAt, saved.savedAt),
      });

      this.currentPost = savedPost;
      this.postForm.controls.slug.setValue(savedPost.slug, {emitEvent: false});
      this.postForm.controls.canonical.setValue(savedPost.seo.canonical ?? this.createCanonicalUrl(savedPost.slug), {emitEvent: false});
      this.postForm.controls.publishedAt.setValue(toDateTimeLocalValue(savedPost.publishedAt), {emitEvent: false});
      this.postForm.markAsPristine();
      this.lastSaved = saved;
      this.lastSavedBackupJson = this.createPostBackupJson(savedPost);
      this.toast.success(`Saved "${savedPost.title}" to Firestore.`);

      if (this.isNewPost && !this.hasCreatedPost) {
        this.hasCreatedPost = true;
        void this.router.navigate(['/admin/cms', savedPost.slug, 'edit'], {replaceUrl: true});
      }

      return true;
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to save post to Firestore.');
      return false;
    }
  }

  private resolvePost(): BlogPost | undefined {
    return this.slug
      ? this.blogRepository.getAdminPostBySlug(this.slug)
      : this.blogRepository.createNewPostTemplate();
  }

  private async applyFirestorePost(post: BlogPost): Promise<void> {
    this.currentPost = post;
    this.initialData = createEditorDocument(post);
    this.setFormFromPost(post);
    this.postForm.markAsPristine();
    this.hasHydratedFirestorePost = true;

    await this.editorComponent?.renderDocument(this.initialData);
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
    this.postForm.markAsDirty();
    this.lastSaved = null;
    this.lastSavedBackupJson = '';
    await this.editorComponent?.renderDocument(createEditorDocument(nextPost));
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

    return {
      ...this.currentPost,
      title: requiredText(formValue.title, 'Untitled Post'),
      slug,
      excerpt: formValue.excerpt.trim(),
      coverImage,
      featured: formValue.featured,
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
      blocks: createBlogBlocksFromEditorDocument(document),
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

  private createForm(post: BlogPost): FormGroup<PostEditorForm> {
    return new FormGroup<PostEditorForm>({
      title: new FormControl(post.title, {nonNullable: true, validators: [Validators.required]}),
      slug: new FormControl(post.slug, {nonNullable: true, validators: [Validators.required]}),
      excerpt: new FormControl(post.excerpt, {nonNullable: true, validators: [Validators.required]}),
      coverImage: new FormControl(post.coverImage, {nonNullable: true, validators: [Validators.required]}),
      featured: new FormControl(Boolean(post.featured), {nonNullable: true}),
      status: new FormControl(post.status, {nonNullable: true, validators: [Validators.required]}),
      publishedAt: new FormControl(toDateTimeLocalValue(post.publishedAt), {nonNullable: true}),
      categories: new FormControl(toCsv(post.categories), {nonNullable: true}),
      tags: new FormControl(toCsv(post.tags), {nonNullable: true}),
      seoTitle: new FormControl(post.seo.title, {nonNullable: true}),
      seoDescription: new FormControl(post.seo.description, {nonNullable: true}),
      canonical: new FormControl(post.seo.canonical ?? this.createCanonicalUrl(post.slug), {nonNullable: true}),
      openGraphImage: new FormControl(normalizeOpenGraphImage(post.seo.openGraphImage, post.coverImage), {nonNullable: true}),
    });
  }

  private setFormFromPost(post: BlogPost): void {
    this.postForm.setValue({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      featured: Boolean(post.featured),
      status: post.status,
      publishedAt: toDateTimeLocalValue(post.publishedAt),
      categories: toCsv(post.categories),
      tags: toCsv(post.tags),
      seoTitle: post.seo.title,
      seoDescription: post.seo.description,
      canonical: post.seo.canonical ?? this.createCanonicalUrl(post.slug),
      openGraphImage: normalizeOpenGraphImage(post.seo.openGraphImage, post.coverImage),
    });
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
