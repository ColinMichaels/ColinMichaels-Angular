import {JsonPipe} from '@angular/common';
import {Component, ViewChild, effect, inject, ChangeDetectionStrategy} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import type {OutputData} from '@editorjs/editorjs';
import {lastValueFrom} from 'rxjs';

import {BlogContentBlock, BlogPost, BlogPostStatus} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService, createBlogSlug} from '../../../../features/blog/services/blog-repository.service';
import {SITE_URL} from '../../../../shared/seo/seo.metadata';
import {EditorImageUploadResult, EditorJsComponent} from '../../components/editor-js/editor-js.component';
import {BlogMediaUploaderComponent} from '../../components/media-uploader/blog-media-uploader.component';
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
import {createBlogBlocksFromEditorDocument, createEditorDocument} from '../../utils/blog-editorjs-adapter';

interface PostEditorForm {
  title: FormControl<string>;
  slug: FormControl<string>;
  excerpt: FormControl<string>;
  coverImage: FormControl<string>;
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

const DEFAULT_COVER_IMAGE = '/assets/images/backgrounds/night.webp';
const BLOG_CANONICAL_BASE_URL = `${SITE_URL}/blog`;
const statusOptions: readonly BlogPostStatus[] = ['draft', 'scheduled', 'published', 'archived'];
const postedDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isBlogPostStatus(value: unknown): value is BlogPostStatus {
  return typeof value === 'string' && statusOptions.includes(value as BlogPostStatus);
}

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isBlogAuthor(value: unknown): value is BlogPost['author'] {
  return isRecord(value)
    && typeof value['name'] === 'string'
    && (typeof value['title'] === 'string' || typeof value['title'] === 'undefined');
}

function isBlogSeo(value: unknown): value is BlogPost['seo'] {
  return isRecord(value)
    && typeof value['title'] === 'string'
    && typeof value['description'] === 'string'
    && (typeof value['metaTitle'] === 'string' || typeof value['metaTitle'] === 'undefined')
    && (typeof value['metaDescription'] === 'string' || typeof value['metaDescription'] === 'undefined')
    && (typeof value['canonical'] === 'string' || typeof value['canonical'] === 'undefined')
    && (typeof value['openGraphImage'] === 'string' || typeof value['openGraphImage'] === 'undefined');
}

function isBlogOpenGraph(value: unknown): value is NonNullable<BlogPost['og']> {
  return isRecord(value)
    && (typeof value['title'] === 'string' || typeof value['title'] === 'undefined')
    && (typeof value['description'] === 'string' || typeof value['description'] === 'undefined')
    && (typeof value['image'] === 'string' || typeof value['image'] === 'undefined')
    && (typeof value['imageAlt'] === 'string' || typeof value['imageAlt'] === 'undefined');
}

function isBlogPost(value: unknown): value is BlogPost {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value['id'] === 'string'
    && typeof value['slug'] === 'string'
    && typeof value['title'] === 'string'
    && typeof value['excerpt'] === 'string'
    && typeof value['coverImage'] === 'string'
    && (typeof value['thumbnailImage'] === 'string' || typeof value['thumbnailImage'] === 'undefined')
    && isBlogAuthor(value['author'])
    && isStringArray(value['categories'])
    && (isStringArray(value['subcategories']) || typeof value['subcategories'] === 'undefined')
    && isStringArray(value['tags'])
    && isBlogPostStatus(value['status'])
    && isBlogSeo(value['seo'])
    && (isBlogOpenGraph(value['og']) || typeof value['og'] === 'undefined')
    && value['contentFormat'] === 'editorjs'
    && Array.isArray(value['blocks'])
    && typeof value['createdAt'] === 'string'
    && typeof value['updatedAt'] === 'string'
    && (typeof value['publishedAt'] === 'string' || value['publishedAt'] === null);
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

function createImportedBlockId(index: number): string {
  return `imported-${Date.now().toString(36)}-${index}`;
}

function normalizeMarkdownInline(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function createMarkdownParagraph(lines: readonly string[], index: number): BlogContentBlock {
  return {
    id: createImportedBlockId(index),
    type: 'paragraph',
    data: {
      text: normalizeMarkdownInline(lines.join(' ')),
    },
  };
}

function createBlogBlocksFromMarkdown(content: string): readonly BlogContentBlock[] {
  const blocks: BlogContentBlock[] = [];
  const paragraphLines: string[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let index = 0;
  let isInCodeFence = false;
  let codeFenceLanguage = '';
  let codeFenceLines: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push(createMarkdownParagraph(paragraphLines, index));
    paragraphLines.length = 0;
    index += 1;
  };

  const pushBlock = (block: Omit<BlogContentBlock, 'id'>): void => {
    blocks.push({
      ...block,
      id: createImportedBlockId(index),
    });
    index += 1;
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const trimmedLine = line.trim();
    const codeFenceMatch = trimmedLine.match(/^```([a-z0-9_-]*)/i);

    if (codeFenceMatch) {
      if (isInCodeFence) {
        pushBlock({
          type: 'code',
          data: {
            language: codeFenceLanguage,
            code: codeFenceLines.join('\n'),
          },
        });
        isInCodeFence = false;
        codeFenceLanguage = '';
        codeFenceLines = [];
      } else {
        flushParagraph();
        isInCodeFence = true;
        codeFenceLanguage = codeFenceMatch[1] ?? '';
      }

      continue;
    }

    if (isInCodeFence) {
      codeFenceLines.push(line);
      continue;
    }

    if (!trimmedLine) {
      flushParagraph();
      continue;
    }

    const imageMatch = trimmedLine.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
    const unorderedListMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    const orderedListMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    const quoteMatch = trimmedLine.match(/^>\s+(.+)$/);

    if (imageMatch) {
      flushParagraph();
      pushBlock({
        type: 'image',
        data: {
          url: imageMatch[2],
          alt: imageMatch[1],
          caption: '',
          stretched: true,
        },
      });
      continue;
    }

    if (headingMatch) {
      flushParagraph();
      pushBlock({
        type: 'header',
        data: {
          text: normalizeMarkdownInline(headingMatch[2]),
          level: headingMatch[1].length >= 3 ? 3 : 2,
        },
      });
      continue;
    }

    if (unorderedListMatch || orderedListMatch) {
      flushParagraph();
      const ordered = Boolean(orderedListMatch);
      const items = [normalizeMarkdownInline((orderedListMatch ?? unorderedListMatch)?.[1] ?? '')];

      while (lines[lineIndex + 1]) {
        const nextLine = lines[lineIndex + 1]?.trim() ?? '';
        const nextMatch = ordered
          ? nextLine.match(/^\d+\.\s+(.+)$/)
          : nextLine.match(/^[-*]\s+(.+)$/);

        if (!nextMatch) {
          break;
        }

        items.push(normalizeMarkdownInline(nextMatch[1]));
        lineIndex += 1;
      }

      pushBlock({
        type: 'list',
        data: {
          ordered,
          items,
        },
      });
      continue;
    }

    if (quoteMatch) {
      flushParagraph();
      pushBlock({
        type: 'quote',
        data: {
          text: normalizeMarkdownInline(quoteMatch[1]),
          caption: '',
        },
      });
      continue;
    }

    if (/^-{3,}$/.test(trimmedLine)) {
      flushParagraph();
      pushBlock({
        type: 'delimiter',
        data: {},
      });
      continue;
    }

    paragraphLines.push(trimmedLine);
  }

  flushParagraph();

  if (isInCodeFence || codeFenceLines.length > 0) {
    pushBlock({
      type: 'code',
      data: {
        language: codeFenceLanguage,
        code: codeFenceLines.join('\n'),
      },
    });
  }

  return blocks;
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

  const og = {
    title: getTrimmedString(value['title']),
    description: getTrimmedString(value['description']),
    image: getTrimmedString(value['image']),
    imageAlt: getTrimmedString(value['imageAlt']),
  };

  return og.title || og.description || og.image || og.imageAlt ? og : undefined;
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
  const seoTitle = getTrimmedString(seo['title']) || getTrimmedString(seo['metaTitle']) || og?.title || importedTitle;
  const seoDescription = getTrimmedString(seo['description']) || getTrimmedString(seo['metaDescription']) || og?.description || excerpt;
  const openGraphImage = getTrimmedString(seo['openGraphImage']) || og?.image;
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
    JsonPipe,
    ReactiveFormsModule,
    RouterLink,
    EditorJsComponent,
    BlogMediaUploaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-8">
        <nav class="flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/admin/cms" class="hover:text-zinc-100">Posts</a>
          <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
        </nav>

        @if (currentPost; as post) {
          <header class="grid gap-5 border-b border-zinc-800 pb-8 md:grid-cols-[1fr_auto] md:items-end">
            <div class="space-y-3">
              <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">{{ isNewPost ? 'New Post' : 'CMS Editor' }}</p>
              <h1 class="text-4xl font-semibold text-zinc-50">{{ editorTitle }}</h1>
              <p class="max-w-2xl text-zinc-400">{{ editorExcerpt || 'Create metadata, write blocks, then save the post into Firestore-backed CMS storage.' }}</p>
            </div>
            <div class="flex flex-wrap gap-3 md:justify-end">
              <input
                #postJsonImportInput
                type="file"
                class="hidden"
                accept=".json,application/json"
                (change)="importPostJson($event)"
              >
              <button
                type="button"
                class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                (click)="postJsonImportInput.click()"
              >
                Import JSON
              </button>
            </div>
          </header>

          <section class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section class="space-y-8">
              <form [formGroup]="postForm" class="grid gap-5 border border-zinc-800 bg-zinc-900/70 p-5 md:grid-cols-2">
                <label class="space-y-2 md:col-span-2">
                  <span class="text-sm font-medium text-zinc-200">Title</span>
                  <input
                    type="text"
                    formControlName="title"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                    (input)="syncSlugFromTitle()"
                  >
                </label>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-zinc-200">Slug</span>
                  <input
                    type="text"
                    formControlName="slug"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                    (blur)="normalizeSlug()"
                  >
                </label>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-zinc-200">Status</span>
                  <select
                    formControlName="status"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                    @for (status of statuses; track status) {
                      <option [value]="status">{{ status }}</option>
                    }
                  </select>
                </label>

                <label class="space-y-2 md:col-span-2">
                  <span class="flex items-center justify-between gap-3">
                    <span class="text-sm font-medium text-zinc-200">Posted on</span>
                    <button
                      type="button"
                      class="text-xs font-medium text-cyan-300 hover:text-cyan-200"
                      (click)="setPublishedAtNow()"
                    >
                      Use current time
                    </button>
                  </span>
                  <input
                    type="datetime-local"
                    formControlName="publishedAt"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                  <p class="text-xs leading-5 text-zinc-500">
                    Controls public blog ordering and article published metadata. Published posts use this value; blank published posts fall back to first publish time.
                  </p>
                </label>

                <label class="space-y-2 md:col-span-2">
                  <span class="text-sm font-medium text-zinc-200">Excerpt</span>
                  <textarea
                    formControlName="excerpt"
                    rows="3"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  ></textarea>
                </label>

                <app-blog-media-uploader
                  class="md:col-span-2"
                  formControlName="coverImage"
                  label="Cover Image"
                  description="Upload the post card and detail hero image. Social sharing falls back to this image unless a separate Open Graph image is selected."
                  buttonLabel="Upload Cover"
                  previewAlt="Cover image preview"
                  assetRole="cover"
                  [postSlug]="mediaUploadSlug"
                  [required]="true"
                  (mediaUploaded)="onCoverImageUploaded($event)"
                ></app-blog-media-uploader>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-zinc-200">Categories</span>
                  <input
                    type="text"
                    formControlName="categories"
                    placeholder="CMS, Angular"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-zinc-200">Tags</span>
                  <input
                    type="text"
                    formControlName="tags"
                    placeholder="Editor.js, Drafts"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>

                <label class="space-y-2 md:col-span-2">
                  <span class="text-sm font-medium text-zinc-200">SEO Title</span>
                  <input
                    type="text"
                    formControlName="seoTitle"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>

                <label class="space-y-2 md:col-span-2">
                  <span class="text-sm font-medium text-zinc-200">SEO Description</span>
                  <textarea
                    formControlName="seoDescription"
                    rows="2"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  ></textarea>
                </label>

                <label class="space-y-2 md:col-span-2">
                  <span class="flex items-center justify-between gap-3">
                    <span class="text-sm font-medium text-zinc-200">Canonical URL</span>
                    <button
                      type="button"
                      class="text-xs font-medium text-cyan-300 hover:text-cyan-200"
                      (click)="useGeneratedCanonicalUrl()"
                    >
                      Use generated
                    </button>
                  </span>
                  <input
                    type="url"
                    formControlName="canonical"
                    [placeholder]="generatedCanonicalUrl"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                  <p class="text-xs leading-5 text-zinc-500">
                    {{ canonicalUrlMode }} Generated from the current slug:
                    <span class="break-all text-zinc-400">{{ generatedCanonicalUrl }}</span>
                  </p>
                </label>

                <app-blog-media-uploader
                  class="md:col-span-2"
                  formControlName="openGraphImage"
                  label="Open Graph / Social Share Image"
                  description="Optional. Choose a separate image for Facebook, Twitter/X, and other link previews. Leave blank to fall back to the cover image."
                  buttonLabel="Upload OG Image"
                  placeholder="Optional custom social image URL"
                  previewAlt="Open Graph image preview"
                  assetRole="open-graph"
                  [postSlug]="mediaUploadSlug"
                  (mediaUploaded)="onOpenGraphImageUploaded($event)"
                ></app-blog-media-uploader>

                <div
                  class="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-950/70 px-4 py-3 md:col-span-2">
                  <p class="text-sm text-zinc-400">{{ openGraphImageMode }}</p>
                  @if (postForm.controls.openGraphImage.value.trim()) {
                    <button
                      type="button"
                      class="border border-zinc-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-200 hover:bg-zinc-800"
                      (click)="clearOpenGraphImage()"
                    >
                      Clear Custom OG Image
                    </button>
                  }
                </div>
              </form>

              @if (saveError) {
                <p class="border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{{ saveError }}</p>
              }

              @if (saveMessage) {
                <p class="border border-emerald-500/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{{ saveMessage }}</p>
              }

              <app-editor-js
                [title]="editorTitle"
                [saveLabel]="'Save Post'"
                [initialData]="initialData"
                [imageUploader]="uploadEditorImage"
                (saved)="onSaved($event)"
              ></app-editor-js>
            </section>

            <aside class="space-y-5 border-t border-zinc-800 pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
              <section class="space-y-3">
                <h2 class="text-lg font-semibold text-zinc-50">Post State</h2>
                <dl class="space-y-3 text-sm">
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Status</dt>
                    <dd class="text-zinc-200">{{ postForm.controls.status.value }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Slug</dt>
                    <dd class="text-right text-zinc-200">{{ postForm.controls.slug.value }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Posted</dt>
                    <dd class="text-right text-zinc-200">{{ postedOnPreview }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Format</dt>
                    <dd class="text-zinc-200">{{ post.contentFormat }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Storage</dt>
                    <dd class="text-zinc-200">Firestore-backed</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Social image</dt>
                    <dd class="text-right text-zinc-200">{{ openGraphImageMode }}</dd>
                  </div>
                </dl>
              </section>

              <section class="space-y-4 border-t border-zinc-800 pt-5">
                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <h2 class="text-lg font-semibold text-zinc-50">AI Writing Assistant</h2>
                    <span
                      class="border border-amber-500/50 px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-amber-200">
                      {{ assistantSourceLabel }}
                    </span>
                  </div>
                  <p class="text-sm text-zinc-400">
                    Suggests titles, descriptions, categories, tags, and thumbnail prompts from the current draft.
                  </p>
                </div>

                <button
                  type="button"
                  class="w-full border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                  [disabled]="isAssistantLoading"
                  (click)="generateAssistantSuggestions()"
                >
                  {{ isAssistantLoading ? 'Generating Suggestions' : 'Suggest Metadata' }}
                </button>

                @if (assistantError) {
                  <p
                    class="border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{{ assistantError }}</p>
                }

                @if (assistantMessage) {
                  <p
                    class="border border-emerald-500/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">{{ assistantMessage }}</p>
                }

                @if (assistantResult; as result) {
                  <div class="space-y-4">
                    @for (suggestion of result.suggestions; track suggestion.id) {
                      <article class="space-y-3 border border-zinc-800 bg-zinc-900/70 p-4">
                        <div class="space-y-2">
                          <h3 class="text-base font-semibold text-zinc-50">{{ suggestion.title }}</h3>
                          <p class="text-sm leading-6 text-zinc-400">{{ suggestion.description }}</p>
                          <p class="text-xs text-zinc-500">{{ suggestion.rationale }}</p>
                        </div>

                        <div class="space-y-2 text-xs text-zinc-400">
                          <p><span class="text-zinc-500">Categories:</span> {{ suggestion.categories.join(', ') }}</p>
                          <p><span class="text-zinc-500">Tags:</span> {{ suggestion.tags.join(', ') }}</p>
                        </div>

                        <div class="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            class="border border-cyan-500/70 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
                            (click)="applySuggestion(suggestion)"
                          >
                            Apply All
                          </button>
                          <button
                            type="button"
                            class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                            (click)="applyTitleSuggestion(suggestion)"
                          >
                            Use Title
                          </button>
                          <button
                            type="button"
                            class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                            (click)="applyDescriptionSuggestion(suggestion)"
                          >
                            Use Description
                          </button>
                          <button
                            type="button"
                            class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                            (click)="applyTaxonomySuggestion(suggestion)"
                          >
                            Use Taxonomy
                          </button>
                        </div>
                      </article>
                    }

                    <section class="space-y-3 border border-dashed border-zinc-700 bg-black/30 p-4">
                      <div>
                        <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Thumbnail Generator
                          Prep</h3>
                        <p class="mt-2 text-xs leading-5 text-zinc-500">
                          These prompts are ready for a future server-backed image generation endpoint.
                        </p>
                      </div>

                      @for (thumbnail of result.thumbnailSuggestions; track thumbnail.id) {
                        <article class="space-y-2 border-t border-zinc-800 pt-3">
                          <p class="text-xs font-medium uppercase tracking-wide text-cyan-300">{{ thumbnail.style }}</p>
                          <p class="text-sm leading-6 text-zinc-300">{{ thumbnail.prompt }}</p>
                          <p class="text-xs text-zinc-500">Alt text: {{ thumbnail.altText }}</p>
                          <button
                            type="button"
                            class="border border-cyan-500/70 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                            [disabled]="isThumbnailLoading === thumbnail.id"
                            (click)="generateAndStoreThumbnail(thumbnail)"
                          >
                            {{ isThumbnailLoading === thumbnail.id ? 'Generating Image' : 'Generate & Store' }}
                          </button>
                        </article>
                      }

                      @if (thumbnailError) {
                        <p
                          class="border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{{ thumbnailError }}</p>
                      }

                      @if (lastGeneratedThumbnail; as storedThumbnail) {
                        <div
                          class="space-y-2 border border-emerald-500/40 bg-emerald-950/20 p-3 text-xs text-emerald-100">
                          <p class="font-medium">Stored thumbnail and applied it to the Cover Image. The Open Graph
                            image remains independent.</p>
                          <a [href]="storedThumbnail.downloadUrl" target="_blank" rel="noopener noreferrer"
                             class="break-all text-cyan-200 hover:text-cyan-100">
                            {{ storedThumbnail.storagePath }}
                          </a>
                        </div>
                      }
                    </section>
                  </div>
                }
              </section>

              @if (lastSaved; as saved) {
                <section class="space-y-3 border-t border-zinc-800 pt-5">
                  <h2 class="text-lg font-semibold text-zinc-50">Last Saved</h2>
                  <p class="text-sm text-zinc-400">{{ saved.blockCount }} blocks at {{ saved.savedAt }}</p>
                  <pre class="max-h-[420px] overflow-auto bg-black p-4 text-xs leading-5 text-cyan-100">{{ saved.data | json }}</pre>
                </section>
              } @else {
                <section class="border-t border-zinc-800 pt-5 text-sm text-zinc-500">
                  Saved post JSON will appear here after the first save.
                </section>
              }
            </aside>
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
  `,
})
export class CmsPostEditorComponent {
  @ViewChild(EditorJsComponent) private editorComponent?: EditorJsComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly blogAssistant = inject(BlogAiAssistantService);
  private readonly blogAiFunctions = inject(BlogAiFunctionsService);
  private readonly blogMediaUpload = inject(BlogMediaUploadService);
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
  protected readonly isPostLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected lastSaved: EditorSavedDocument | null = null;
  protected saveMessage = '';
  protected saveError = '';
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

    if (!publishedAt) {
      return this.postForm.controls.status.value === 'published' ? 'On first publish' : 'Not set';
    }

    return postedDateFormatter.format(new Date(publishedAt));
  }

  protected get openGraphImageMode(): string {
    const openGraphImage = this.postForm.controls.openGraphImage.value.trim();
    const coverImage = this.postForm.controls.coverImage.value.trim();

    if (!openGraphImage || openGraphImage === coverImage) {
      return 'Using cover image fallback.';
    }

    return 'Using custom Open Graph image.';
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

    this.saveError = '';
    this.saveMessage = '';

    try {
      const parsedJson: unknown = JSON.parse(await file.text());
      const importedDocument = this.createImportedPostDocument(parsedJson);
      await this.applyImportedPost(importedDocument.post);
      this.saveMessage = `Imported ${importedDocument.sourceLabel} from ${file.name}. Review and save to persist it.`;
    } catch (error) {
      this.saveError = `Unable to import JSON: ${getErrorMessage(error)}`;
    }
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

  protected async onSaved(saved: EditorSavedDocument): Promise<void> {
    this.saveError = '';
    this.saveMessage = '';
    this.postForm.markAllAsTouched();

    if (!this.currentPost) {
      this.saveError = 'Unable to save because the source post is missing.';
      return;
    }

    if (this.postForm.invalid) {
      this.saveError = 'Title, slug, excerpt, and cover image are required before saving.';
      return;
    }

    const formValue = this.postForm.getRawValue();
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
      this.saveMessage = `Saved ${savedPost.title} to Firestore CMS storage.`;

      if (this.isNewPost && !this.hasCreatedPost) {
        this.hasCreatedPost = true;
        void this.router.navigate(['/admin/cms', savedPost.slug, 'edit'], {replaceUrl: true});
      }
    } catch (error) {
      this.saveError = error instanceof Error ? error.message : 'Unable to save post to Firestore.';
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
      blocks: importedPost.blocks,
      createdAt: this.currentPost.createdAt,
      updatedAt: new Date().toISOString(),
      publishedAt: importedPost.publishedAt,
    };

    this.currentPost = nextPost;
    this.setFormFromPost(nextPost);
    this.postForm.markAsDirty();
    this.lastSaved = null;
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

  private createForm(post: BlogPost): FormGroup<PostEditorForm> {
    return new FormGroup<PostEditorForm>({
      title: new FormControl(post.title, {nonNullable: true, validators: [Validators.required]}),
      slug: new FormControl(post.slug, {nonNullable: true, validators: [Validators.required]}),
      excerpt: new FormControl(post.excerpt, {nonNullable: true, validators: [Validators.required]}),
      coverImage: new FormControl(post.coverImage, {nonNullable: true, validators: [Validators.required]}),
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

  private markUploadedMedia(upload: BlogMediaUploadResult): void {
    this.postForm.markAsDirty();
    this.saveMessage = `Uploaded ${upload.originalName}. Save the post to persist the media URL.`;
    this.saveError = '';
  }
}
