import {CommonModule, isPlatformBrowser} from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnChanges,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import type EditorJS from '@editorjs/editorjs';
import type {BlockToolData, EditorConfig, OutputData, ToolConstructable} from '@editorjs/editorjs';

import {MediaLibraryItem} from '../../../media-library/models/media-library.models';
import {MediaLibraryService} from '../../../media-library/services/media-library.service';
import {
  BlogContentBlock,
  BlogImageLayout,
  BlogImageSize,
} from '../../../../features/blog/models/blog-post.model';
import {EditorRecoverySnapshot, EditorSavedDocument} from '../../models/editor-document.model';
import {createBlogBlocksFromEditorDocument} from '../../utils/blog-editorjs-adapter';
import {
  normalizeEditorDocumentForBlogEditor,
  validateEditorDocumentForBlog,
} from '../../utils/blog-editor-document-validation.util';
import {AppEmbedBlockTool} from './tools/app-embed-block.tool';
import {ChartBlockTool} from './tools/chart-block.tool';
import {CatCornerUnlockBlockTool} from './tools/cat-corner-unlock-block.tool';
import {CmsCodeBlockTool} from './tools/code-block.tool';
import {CmsImageBlockTool, CmsImageLibrarySelection} from './tools/cms-image-block.tool';
import {HtmlBlockTool} from './tools/html-block.tool';
import {ListPresentationTune} from './tools/list-presentation.tune';
import {CmsMarkdownBlockTool} from './tools/markdown-block.tool';
import {PollBlockTool} from './tools/poll-block.tool';
import {StatsBlockTool} from './tools/stats-block.tool';
import {SunoEmbedBlockTool} from './tools/suno-embed-block.tool';
import {TypographyBlockTool} from './tools/typography-block.tool';
import {UnsupportedBlockTool} from './tools/unsupported-block.tool';
import {YouTubeEmbedBlockTool} from './tools/youtube-embed-block.tool';
import {CmsProductionPreviewComponent} from '../production-preview/cms-production-preview.component';

interface EditorToolModules {
  Header: ToolConstructable;
  List: ToolConstructable;
  ListPresentationTune: ToolConstructable;
  Quote: ToolConstructable;
  Delimiter: ToolConstructable;
  Embed: ToolConstructable;
  YouTubeEmbed: ToolConstructable;
  CmsCodeBlock: ToolConstructable;
  CmsMarkdownBlock: ToolConstructable;
  CmsImageBlock: ToolConstructable;
  TypographyBlock: ToolConstructable;
  StatsBlock: ToolConstructable;
  ChartBlock: ToolConstructable;
  PollBlock: ToolConstructable;
  SunoEmbed: ToolConstructable;
  AppEmbedBlock: ToolConstructable;
  CatCornerUnlockBlock: ToolConstructable;
  HtmlBlock: ToolConstructable;
  UnsupportedBlock: ToolConstructable;
}

export interface EditorImageUploadResult {
  success: 1;
  file: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
}

type EditorImageInsertTab = 'library' | 'upload';
type EditorImagePanelMode = 'insert' | 'select';
type EditorImageLayoutMode = BlogImageLayout;
type EditorImageSizeMode = BlogImageSize | '';
type EditorViewMode = 'visual' | 'preview' | 'json';

interface EditorImageLayoutOption {
  value: EditorImageLayoutMode;
  label: string;
  description: string;
}

interface EditorImageSizeOption {
  value: BlogImageSize;
  label: string;
}

const imageLayoutOptions: readonly EditorImageLayoutOption[] = [
  {
    value: 'fullWidth',
    label: 'Full width',
    description: 'Best for hero-like images and visual breaks.',
  },
  {
    value: 'contained',
    label: 'Contained',
    description: 'Center the image inside the text column.',
  },
  {
    value: 'inlineStart',
    label: 'Inline left',
    description: 'Float beside following copy on desktop.',
  },
  {
    value: 'inlineEnd',
    label: 'Inline right',
    description: 'Float beside following copy on desktop.',
  },
];

const imageSizeOptions: readonly EditorImageSizeOption[] = [
  {value: 'small', label: 'Small'},
  {value: 'medium', label: 'Medium'},
  {value: 'large', label: 'Large'},
  {value: 'wide', label: 'Wide'},
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getDefaultExport(value: unknown): unknown {
  if (isRecord(value) && 'default' in value) {
    return getDefaultExport(value['default']);
  }

  return value;
}

function getToolConstructable(value: unknown, toolName: string): ToolConstructable {
  const candidate = getDefaultExport(value);

  if (typeof candidate !== 'function') {
    throw new Error(`Unable to load ${toolName} Editor.js tool.`);
  }

  return candidate as unknown as ToolConstructable;
}

async function loadEditorTools(): Promise<EditorToolModules> {
  const [
    headerModule,
    listModule,
    quoteModule,
    delimiterModule,
    embedModule,
  ] = await Promise.all([
    import('@editorjs/header'),
    import('@editorjs/list'),
    import('@editorjs/quote'),
    import('@editorjs/delimiter'),
    import('@editorjs/embed'),
  ]);

  return {
    Header: getToolConstructable(headerModule, 'Header'),
    List: getToolConstructable(listModule, 'List'),
    ListPresentationTune: ListPresentationTune as unknown as ToolConstructable,
    Quote: getToolConstructable(quoteModule, 'Quote'),
    Delimiter: getToolConstructable(delimiterModule, 'Delimiter'),
    Embed: getToolConstructable(embedModule, 'Embed'),
    YouTubeEmbed: YouTubeEmbedBlockTool as unknown as ToolConstructable,
    CmsCodeBlock: CmsCodeBlockTool as unknown as ToolConstructable,
    CmsMarkdownBlock: CmsMarkdownBlockTool as unknown as ToolConstructable,
    CmsImageBlock: CmsImageBlockTool as unknown as ToolConstructable,
    TypographyBlock: TypographyBlockTool as unknown as ToolConstructable,
    StatsBlock: StatsBlockTool as unknown as ToolConstructable,
    ChartBlock: ChartBlockTool as unknown as ToolConstructable,
    PollBlock: PollBlockTool as unknown as ToolConstructable,
    SunoEmbed: SunoEmbedBlockTool as unknown as ToolConstructable,
    AppEmbedBlock: AppEmbedBlockTool as unknown as ToolConstructable,
    CatCornerUnlockBlock: CatCornerUnlockBlockTool as unknown as ToolConstructable,
    HtmlBlock: HtmlBlockTool as unknown as ToolConstructable,
    UnsupportedBlock: UnsupportedBlockTool as unknown as ToolConstructable,
  };
}

function createObjectUrlUploadResult(file: File): EditorImageUploadResult {
  return {
    success: 1,
    file: {
      url: URL.createObjectURL(file),
    },
  };
}

function parseEditorDocument(source: string): OutputData {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The document could not be parsed.';
    throw new Error(`Invalid JSON: ${message}`, {cause: error});
  }

  if (!isRecord(parsed) || !Array.isArray(parsed['blocks'])) {
    throw new Error('Editor JSON must be an object with a blocks array.');
  }

  parsed['blocks'].forEach((block, index) => {
    if (!isRecord(block)) {
      throw new Error(`Block ${index + 1} must be a JSON object.`);
    }

    if (typeof block['type'] !== 'string' || !block['type'].trim()) {
      throw new Error(`Block ${index + 1} must have a non-empty type.`);
    }

    if (!isRecord(block['data'])) {
      throw new Error(`Block ${index + 1} must have a data object.`);
    }

    if ('id' in block && typeof block['id'] !== 'string') {
      throw new Error(`Block ${index + 1} has an invalid id.`);
    }
  });

  if ('time' in parsed && (typeof parsed['time'] !== 'number' || !Number.isFinite(parsed['time']))) {
    throw new Error('Editor JSON time must be a finite number.');
  }

  if ('version' in parsed && typeof parsed['version'] !== 'string') {
    throw new Error('Editor JSON version must be a string.');
  }

  return parsed as unknown as OutputData;
}

@Component({
  selector: 'app-editor-js',
  imports: [
    CommonModule,
    CmsProductionPreviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="space-y-2">
      <div class="flex min-h-11 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-2">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="text-sm font-semibold text-zinc-100">{{ title }}</h2>

          <div class="flex border border-zinc-700 bg-zinc-950 p-0.5" role="tablist" aria-label="Editor view">
            <button
              type="button"
              role="tab"
              id="editor-view-tab-visual"
              aria-controls="editor-view-panel-visual"
              class="h-7 px-2.5 text-[11px] font-medium uppercase tracking-[0.12em]"
              [class.bg-cyan-400]="viewMode() === 'visual'"
              [class.text-zinc-950]="viewMode() === 'visual'"
              [class.text-zinc-400]="viewMode() !== 'visual'"
              [attr.aria-selected]="viewMode() === 'visual'"
              [attr.tabindex]="viewMode() === 'visual' ? 0 : -1"
              [disabled]="isLoading() || isSaving() || isSyncingView()"
              (click)="setViewMode('visual')"
              (keydown)="handleViewTabKeydown($event, 0)"
            >
              WYSIWYG
            </button>
            <button
              type="button"
              role="tab"
              id="editor-view-tab-preview"
              aria-controls="editor-view-panel-preview"
              class="h-7 px-2.5 text-[11px] font-medium uppercase tracking-[0.12em]"
              [class.bg-cyan-400]="viewMode() === 'preview'"
              [class.text-zinc-950]="viewMode() === 'preview'"
              [class.text-zinc-400]="viewMode() !== 'preview'"
              [attr.aria-selected]="viewMode() === 'preview'"
              [attr.tabindex]="viewMode() === 'preview' ? 0 : -1"
              [disabled]="isLoading() || isSaving() || isSyncingView()"
              (click)="setViewMode('preview')"
              (keydown)="handleViewTabKeydown($event, 1)"
            >
              Production Preview
            </button>
            <button
              type="button"
              role="tab"
              id="editor-view-tab-json"
              aria-controls="editor-view-panel-json"
              class="h-7 px-2.5 text-[11px] font-medium uppercase tracking-[0.12em]"
              [class.bg-cyan-400]="viewMode() === 'json'"
              [class.text-zinc-950]="viewMode() === 'json'"
              [class.text-zinc-400]="viewMode() !== 'json'"
              [attr.aria-selected]="viewMode() === 'json'"
              [attr.tabindex]="viewMode() === 'json' ? 0 : -1"
              [disabled]="isLoading() || isSaving() || isSyncingView()"
              (click)="setViewMode('json')"
              (keydown)="handleViewTabKeydown($event, 2)"
            >
              JSON
            </button>
          </div>
        </div>

        <div class="flex gap-2">
          @if (viewMode() === 'visual') {
            <button
              type="button"
              class="h-9 border border-zinc-700 px-3 text-xs text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
              [disabled]="isLoading() || isSaving() || isSyncingView()"
              (click)="openImageInsertPanel()"
            >
              Insert Image
            </button>
          }
          <button
            type="button"
            class="h-9 border border-zinc-700 px-3 text-xs text-zinc-200 hover:bg-zinc-800"
            [disabled]="isLoading() || isSaving() || isSyncingView()"
            (click)="reset()"
          >
            Reset
          </button>
          @if (showSaveAction) {
            <button
              type="button"
              class="h-9 border border-cyan-400 px-3 text-xs font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
              [disabled]="isLoading() || isSaving() || isSyncingView()"
              (click)="save()"
            >
              {{ isSaving() ? 'Saving' : saveLabel }}
            </button>
          }
        </div>
      </div>

      @if (error(); as message) {
        <p class="border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{{ message }}</p>
      }

      @if (viewMode() !== 'json' && jsonWarning(); as message) {
        <p class="border border-amber-500/50 bg-amber-950/30 px-4 py-3 text-sm leading-6 text-amber-100" role="status">
          {{ message }}
        </p>
      }

      @if (isLoading()) {
        <p class="border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">Loading editor...</p>
      }

      @if (viewMode() === 'preview') {
        <div id="editor-view-panel-preview" role="tabpanel" aria-labelledby="editor-view-tab-preview">
          @defer (on immediate) {
            <app-cms-production-preview
              [blocks]="previewBlocks()"
              [title]="previewTitle"
              [excerpt]="previewExcerpt"
              [coverImage]="previewCoverImage"
              [postId]="previewPostId"
              [postSlug]="previewPostSlug"
            ></app-cms-production-preview>
          } @placeholder {
            <p class="border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400" role="status">Loading production renderer...</p>
          }
        </div>
      }

      @if (viewMode() === 'json') {
        <section
          id="editor-view-panel-json"
          role="tabpanel"
          aria-labelledby="editor-view-tab-json"
          class="overflow-hidden border border-zinc-700 bg-zinc-950"
        >
          <header class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/70 px-3 py-2">
            <div>
              <p class="text-xs font-medium text-zinc-200">Editor.js document</p>
              <p class="mt-0.5 text-[11px] text-zinc-500">Changes are validated before they render or save.</p>
            </div>
            @if (jsonStatus(); as message) {
              <span class="text-xs text-emerald-300" role="status">{{ message }}</span>
            }
          </header>

          <textarea
            data-editor-json
            aria-label="Raw Editor.js JSON"
            class="block min-h-[520px] w-full resize-y bg-black px-4 py-4 font-mono text-[13px] leading-6 text-cyan-100 outline-none selection:bg-cyan-400 selection:text-zinc-950 focus:ring-1 focus:ring-inset focus:ring-cyan-400"
            [attr.aria-invalid]="jsonError() ? 'true' : null"
            [value]="jsonSource()"
            spellcheck="false"
            wrap="off"
            (input)="updateJsonSource($event)"
          ></textarea>

          @if (jsonError(); as message) {
            <p class="border-t border-red-500/50 bg-red-950/40 px-4 py-3 font-mono text-xs leading-5 text-red-200" role="alert">
              {{ message }}
            </p>
          }

          @if (jsonWarning(); as message) {
            <p class="border-t border-amber-500/50 bg-amber-950/30 px-4 py-3 font-mono text-xs leading-5 text-amber-200" role="status">
              {{ message }}
            </p>
          }
        </section>
      }

      <div
        #editorHolder
        id="editor-view-panel-visual"
        role="tabpanel"
        aria-labelledby="editor-view-tab-visual"
        class="cms-editor-surface min-h-[420px] bg-zinc-50 px-5 py-5 text-zinc-950"
        [class.opacity-50]="isLoading()"
        [hidden]="viewMode() !== 'visual'"
      ></div>

      @if (isImagePanelOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Insert image"
        >
          <button
            type="button"
            class="absolute inset-0 bg-black/80"
            aria-label="Close image insert panel"
            (click)="closeImageInsertPanel()"
          ></button>

          <section class="relative z-10 grid max-h-[92vh] w-full max-w-6xl overflow-hidden border border-zinc-700 bg-zinc-950 shadow-2xl lg:grid-cols-[minmax(0,1fr)_320px]">
            <div class="min-h-0 border-b border-zinc-800 lg:border-b-0 lg:border-r">
              <header class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.24em] text-cyan-300">Media</p>
                  <h3 class="text-lg font-semibold text-zinc-50">
                    {{ imagePanelMode === 'select' ? 'Choose Existing Image' : 'Insert Image' }}
                  </h3>
                </div>

                @if (imagePanelMode === 'insert') {
                  <div class="flex gap-2" role="tablist" aria-label="Image source">
                    <button
                      type="button"
                      role="tab"
                      [attr.aria-selected]="imageInsertTab === 'library'"
                      [class]="imageInsertTab === 'library' ? activeImageTabClass : inactiveImageTabClass"
                      (click)="setImageInsertTab('library')"
                    >
                      Media Library
                    </button>
                    <button
                      type="button"
                      role="tab"
                      [attr.aria-selected]="imageInsertTab === 'upload'"
                      [class]="imageInsertTab === 'upload' ? activeImageTabClass : inactiveImageTabClass"
                      (click)="setImageInsertTab('upload')"
                    >
                      Upload New
                    </button>
                  </div>
                } @else {
                  <span class="border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                    Media Library
                  </span>
                }
              </header>

              @if (imageInsertTab === 'library') {
                <div class="space-y-4 p-4">
                  <label class="block space-y-2">
                    <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Search library</span>
                    <input
                      type="search"
                      [value]="imageLibrarySearch"
                      class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
                      placeholder="Search image name, tag, folder..."
                      (input)="updateImageLibrarySearch($event)"
                    >
                  </label>

                  @if (isMediaLibraryLoading()) {
                    <p class="border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400" role="status">Loading media library images...</p>
                  }

                  @if (mediaLibraryError(); as message) {
                    <p class="border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">{{ message }}</p>
                  }

                  <div class="grid max-h-[54vh] gap-3 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                    @for (item of filteredMediaLibraryImages; track item.id) {
                      <button
                        type="button"
                        class="group border p-2 text-left transition hover:border-cyan-400"
                        [class.border-cyan-300]="selectedMediaItemId === item.id"
                        [class.bg-cyan-950]="selectedMediaItemId === item.id"
                        [class.border-zinc-800]="selectedMediaItemId !== item.id"
                        [class.bg-zinc-900]="selectedMediaItemId !== item.id"
                        [attr.aria-pressed]="selectedMediaItemId === item.id"
                        (click)="selectMediaItem(item)"
                      >
                        <img
                          [src]="getMediaPreviewUrl(item)"
                          [alt]="item.altText || item.displayName"
                          loading="lazy"
                          class="aspect-[4/3] w-full rounded bg-zinc-800 object-cover"
                        >
                        <span class="mt-2 block truncate text-sm font-medium text-zinc-100">{{ item.displayName }}</span>
                        <span class="mt-1 block truncate text-xs text-zinc-500">{{ getMediaMetaLabel(item) }}</span>
                      </button>
                    } @empty {
                      @if (!isMediaLibraryLoading()) {
                        <div class="col-span-full border border-dashed border-zinc-800 bg-zinc-900/70 p-6 text-center">
                          <p class="text-sm font-medium text-zinc-200">No images found.</p>
                          <p class="mt-1 text-xs text-zinc-500">Try a different search or upload a new image.</p>
                        </div>
                      }
                    }
                  </div>
                </div>
              } @else {
                <div class="flex min-h-[420px] items-center justify-center p-4">
                  <section class="w-full max-w-lg space-y-5 border border-dashed border-zinc-700 bg-zinc-900/70 p-6 text-center">
                    <div class="space-y-2">
                      <h4 class="text-lg font-semibold text-zinc-50">Upload and embed</h4>
                      <p class="text-sm leading-6 text-zinc-400">
                        Uploads through the existing CMS media upload service, then inserts the uploaded image into the editor.
                      </p>
                    </div>

                    <input
                      #insertUploadInput
                      type="file"
                      class="hidden"
                      accept="image/*"
                      [disabled]="isImageUploadInProgress()"
                      (change)="uploadAndInsertImage($event)"
                    >

                    <button
                      type="button"
                      class="border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                      [disabled]="isImageUploadInProgress()"
                      (click)="insertUploadInput.click()"
                    >
                      {{ isImageUploadInProgress() ? 'Uploading image' : 'Choose Image' }}
                    </button>

                    @if (imageInsertMessage(); as message) {
                      <p class="border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300" role="status">{{ message }}</p>
                    }
                  </section>
                </div>
              }
            </div>

            <aside class="space-y-5 overflow-auto p-4">
              <div class="space-y-2">
                <h4 class="text-base font-semibold text-zinc-50">Image options</h4>
                <p class="text-xs leading-5 text-zinc-500">
                  {{ imagePanelMode === 'select'
                    ? 'These options will update the current Editor.js image block.'
                    : 'These options are saved with the new Editor.js image block.' }}
                </p>
              </div>

              @if (selectedMediaItem; as item) {
                <figure class="overflow-hidden border border-zinc-800 bg-zinc-900">
                  <img
                    [src]="getMediaPreviewUrl(item)"
                    [alt]="item.altText || item.displayName"
                    class="aspect-video w-full object-contain"
                    loading="lazy"
                  >
                  <figcaption class="space-y-1 px-3 py-2">
                    <p class="truncate text-sm font-medium text-zinc-100">{{ item.displayName }}</p>
                    <p class="truncate text-xs text-zinc-500">{{ getMediaMetaLabel(item) }}</p>
                  </figcaption>
                </figure>
              } @else {
                <div class="border border-dashed border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-500">
                  Select an image from the library or upload a new one.
                </div>
              }

              <label class="block space-y-2">
                <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Caption</span>
                <textarea
                  rows="3"
                  [value]="imageCaption"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
                  placeholder="Optional image caption"
                  (input)="updateImageCaption($event)"
                ></textarea>
              </label>

              <label class="block space-y-2">
                <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Alt text</span>
                <input
                  type="text"
                  [value]="imageAltText"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
                  placeholder="Describe the image"
                  (input)="updateImageAltText($event)"
                >
              </label>

              <fieldset class="space-y-3">
                <legend class="text-xs uppercase tracking-[0.2em] text-zinc-500">Layout</legend>
                @for (option of imageLayoutOptions; track option.value) {
                  <button
                    type="button"
                    class="block w-full border px-3 py-3 text-left"
                    [class.border-cyan-300]="imageLayoutMode === option.value"
                    [class.bg-cyan-950]="imageLayoutMode === option.value"
                    [class.border-zinc-800]="imageLayoutMode !== option.value"
                    [class.bg-zinc-900]="imageLayoutMode !== option.value"
                    [attr.aria-pressed]="imageLayoutMode === option.value"
                    (click)="setImageLayoutMode(option.value)"
                  >
                    <span class="block text-sm font-medium text-zinc-100">{{ option.label }}</span>
                    <span class="mt-1 block text-xs text-zinc-500">{{ option.description }}</span>
                  </button>
                }
              </fieldset>

              <label class="block space-y-2">
                <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Size</span>
                <select
                  [value]="imageSizeMode"
                  data-testid="cms-image-size"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  (change)="setImageSizeMode($event)"
                >
                  <option value="">Automatic (preserve existing behavior)</option>
                  @for (option of imageSizeOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
                <span class="block text-xs leading-5 text-zinc-500">
                  Wide uses the safe article width. Inline images stack automatically when the viewport or Reader text scale is too narrow.
                </span>
              </label>

              @if (imageInsertMessage(); as message) {
                <p class="border border-emerald-500/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200" role="status">{{ message }}</p>
              }

              <footer class="flex flex-wrap justify-end gap-2 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  class="border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                  (click)="closeImageInsertPanel()"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                  [disabled]="!selectedMediaItem"
                  (click)="insertSelectedMediaImage()"
                >
                  {{ imagePanelMode === 'select' ? 'Use Selected Image' : 'Insert Selected' }}
                </button>
              </footer>
            </aside>
          </section>
        </div>
      }
    </section>
  `,
  styles: [`
    :host ::ng-deep .cms-editor-surface {
      border: 1px solid #d4d4d8;
      color: #18181b;
      font-family: Arimo, sans-serif;
      overflow: visible;
    }

    :host ::ng-deep .cms-editor-surface .codex-editor {
      margin: 0 auto;
      max-width: 960px;
      overflow: visible;
      padding-inline: 70px 34px;
    }

    :host ::ng-deep .cms-editor-surface .codex-editor__redactor {
      padding-bottom: 120px !important;
    }

    :host ::ng-deep .cms-editor-surface .ce-block {
      margin: 0;
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content,
    :host ::ng-deep .cms-editor-surface .ce-toolbar__content {
      max-width: 760px;
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content {
      border-left: 3px solid transparent;
      padding: 10px 18px;
      position: relative;
      transition: background-color 150ms ease, border-color 150ms ease;
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content:focus-within {
      background: #f8fafc;
      border-left-color: #0891b2;
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.ce-paragraph)::after,
    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.ce-header)::after,
    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.cdx-list)::after,
    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.cdx-quote)::after,
    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.ce-delimiter)::after,
    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.image-tool)::after {
      background: #0f172a;
      border-radius: 4px;
      box-shadow: 0 8px 20px rgb(15 23 42 / 18%);
      color: #e2e8f0;
      opacity: 0;
      padding: 4px 7px;
      pointer-events: none;
      position: absolute;
      right: calc(100% + 10px);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .12em;
      line-height: 1.2;
      text-transform: uppercase;
      top: 12px;
      transform: translateX(-4px);
      transition: opacity 120ms ease, transform 120ms ease;
      white-space: nowrap;
      z-index: 30;
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content:hover::after,
    :host ::ng-deep .cms-editor-surface .ce-block__content:focus-within::after {
      opacity: 1;
      transform: translateX(0);
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.ce-paragraph)::after {
      content: 'Paragraph';
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.ce-header)::after {
      content: 'Heading';
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.cdx-list)::after {
      content: 'List';
    }

    :host ::ng-deep .cms-editor-surface .cms-list-presentation {
      min-width: 0;
    }

    :host ::ng-deep .cms-editor-surface .cdx-list__item-content {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    :host ::ng-deep .cms-editor-surface .cms-list-presentation[data-list-presentation='steps']
      > .cdx-list-ordered {
      gap: .75rem;
    }

    :host ::ng-deep .cms-editor-surface .cms-list-presentation[data-list-presentation='steps']
      > .cdx-list-ordered
      > .cdx-list__item {
      background: rgb(8 145 178 / 8%);
      border: 1px solid rgb(8 145 178 / 22%);
      border-radius: .85rem;
      padding: .75rem .85rem;
    }

    :host-context(.dark) ::ng-deep .cms-editor-surface .cms-list-presentation[data-list-presentation='steps']
      > .cdx-list-ordered
      > .cdx-list__item {
      background: rgb(34 211 238 / 7%);
      border-color: rgb(103 232 249 / 20%);
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.cdx-quote)::after {
      content: 'Quote';
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.ce-delimiter)::after {
      content: 'Divider';
    }

    :host ::ng-deep .cms-editor-surface .ce-block__content:has(.image-tool)::after {
      content: 'Image';
    }

    :host ::ng-deep .cms-editor-surface .ce-toolbar {
      z-index: 20;
    }

    :host ::ng-deep .cms-editor-surface .ce-toolbar__plus,
    :host ::ng-deep .cms-editor-surface .ce-toolbar__settings-btn {
      background: #fff;
      border: 1px solid #cbd5e1;
      box-shadow: 0 8px 18px rgb(15 23 42 / 12%);
      color: #334155;
    }

    :host ::ng-deep .cms-editor-surface .ce-toolbar__plus:hover,
    :host ::ng-deep .cms-editor-surface .ce-toolbar__settings-btn:hover {
      background: #f8fafc;
      color: #0f172a;
    }

    :host ::ng-deep .cms-editor-surface .ce-paragraph {
      color: #334155;
      font-size: 16px;
      line-height: 1.85;
      min-height: 1.85em;
    }

    :host ::ng-deep .cms-editor-surface .ce-header {
      color: #0f172a;
      font-family: var(--font-heading);
      font-weight: 650;
      letter-spacing: var(--blog-heading-letter-spacing);
      padding: 0;
      text-wrap: balance;
    }

    :host ::ng-deep .cms-editor-surface h2.ce-header {
      max-width: var(--blog-heading-measure);
      font-size: var(--blog-h2-size);
      line-height: var(--blog-h2-line-height);
    }

    :host ::ng-deep .cms-editor-surface h3.ce-header {
      max-width: var(--blog-subheading-measure);
      font-family: var(--font-subheading);
      font-size: var(--blog-h3-size);
      line-height: var(--blog-h3-line-height);
    }

    :host ::ng-deep .cms-editor-surface .cdx-list {
      color: #334155;
      font-size: 16px;
      line-height: 1.75;
      padding-left: 1.35rem;
    }

    :host ::ng-deep .cms-editor-surface .cdx-quote {
      border-left: 3px solid #0891b2;
      color: #1e293b;
      padding: 10px 0 10px 18px;
    }

    :host ::ng-deep .cms-editor-surface .cdx-quote__text {
      font-size: 18px;
      line-height: 1.75;
      min-height: 1.75em;
    }

    :host ::ng-deep .cms-editor-surface .cdx-quote__caption {
      color: #64748b;
      font-size: 13px;
      margin-top: 8px;
    }

    :host ::ng-deep .cms-editor-surface .ce-delimiter {
      line-height: 1;
      padding: 14px 0;
    }

    :host ::ng-deep .cms-editor-surface .ce-delimiter::before {
      color: #94a3b8;
      font-size: 28px;
      letter-spacing: .3em;
    }

    :host ::ng-deep .cms-editor-surface .image-tool {
      color: #334155;
    }

    :host ::ng-deep .cms-editor-surface .image-tool__image-picture {
      border-radius: 6px;
      max-height: 70vh;
      object-fit: contain;
    }

    @media (max-width: 820px) {
      :host ::ng-deep .cms-editor-surface .codex-editor {
        padding-inline: 42px 12px;
      }

      :host ::ng-deep .cms-editor-surface .ce-block__content,
      :host ::ng-deep .cms-editor-surface .ce-toolbar__content {
        max-width: 100%;
      }

      :host ::ng-deep .cms-editor-surface .ce-block__content:has(.ce-paragraph)::after,
      :host ::ng-deep .cms-editor-surface .ce-block__content:has(.ce-header)::after,
      :host ::ng-deep .cms-editor-surface .ce-block__content:has(.cdx-list)::after,
      :host ::ng-deep .cms-editor-surface .ce-block__content:has(.cdx-quote)::after,
      :host ::ng-deep .cms-editor-surface .ce-block__content:has(.ce-delimiter)::after,
      :host ::ng-deep .cms-editor-surface .ce-block__content:has(.image-tool)::after {
        left: 10px;
        right: auto;
        top: -16px;
      }
    }
  `],
})
export class EditorJsComponent implements AfterViewInit, OnChanges {
  @Input({required: true}) initialData!: OutputData;
  @Input() title = 'Post Editor';
  @Input() saveLabel = 'Save Draft';
  @Input() showSaveAction = true;
  @Input() imageUploader: ((file: File) => Promise<EditorImageUploadResult>) | null = null;
  @Input() previewTitle = '';
  @Input() previewExcerpt = '';
  @Input() previewCoverImage = '';
  @Input() previewPostId = '';
  @Input() previewPostSlug = '';
  @Output() saved = new EventEmitter<EditorSavedDocument>();
  @Output() contentChanged = new EventEmitter<void>();

  @ViewChild('editorHolder', {static: true}) private readonly editorHolder!: ElementRef<HTMLElement>;

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isSyncingView = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly viewMode = signal<EditorViewMode>('visual');
  protected readonly previewBlocks = signal<readonly BlogContentBlock[]>([]);
  protected readonly jsonSource = signal('');
  protected readonly jsonError = signal<string | null>(null);
  protected readonly jsonStatus = signal<string | null>(null);
  protected readonly jsonWarning = signal<string | null>(null);
  protected readonly isImagePanelOpen = signal(false);
  protected readonly isImageUploadInProgress = signal(false);
  protected readonly isMediaLibraryLoading = signal(false);
  protected readonly mediaLibraryError = signal<string | null>(null);
  protected readonly imageInsertMessage = signal<string | null>(null);
  protected readonly mediaLibraryItems = signal<readonly MediaLibraryItem[]>([]);
  protected readonly activeImageTabClass = 'border border-cyan-300 bg-cyan-400 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-950';
  protected readonly inactiveImageTabClass = 'border border-zinc-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-300 hover:border-cyan-300 hover:text-cyan-200';
  protected readonly imageLayoutOptions = imageLayoutOptions;
  protected readonly imageSizeOptions = imageSizeOptions;
  protected imagePanelMode: EditorImagePanelMode = 'insert';
  protected imageInsertTab: EditorImageInsertTab = 'library';
  protected imageLibrarySearch = '';
  protected selectedMediaItemId: string | null = null;
  protected imageCaption = '';
  protected imageAltText = '';
  protected imageLayoutMode: EditorImageLayoutMode = 'fullWidth';
  protected imageSizeMode: EditorImageSizeMode = '';

  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaLibrary = inject(MediaLibraryService);
  private editor: EditorJS | null = null;
  private hasLoadedMediaLibrary = false;
  private pendingImageSelectionResolver: ((selection: CmsImageLibrarySelection | null) => void) | null = null;
  private suppressContentChanges = false;
  private previewDocument: OutputData | null = null;
  private diagnosticsTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    this.destroyRef.onDestroy(() => {
      if (this.diagnosticsTimer) {
        clearTimeout(this.diagnosticsTimer);
      }
      this.resolvePendingImageSelection(null);
      this.editor?.destroy();
      this.editor = null;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previewTitle'] && !changes['previewTitle'].firstChange) {
      this.scheduleDocumentDiagnostics();
    }
  }

  ngAfterViewInit(): void {
    this.setJsonDocument(this.initialData);
    void this.initializeEditor();
  }

  @HostListener('document:keydown.escape')
  protected closeImagePanelOnEscape(): void {
    if (this.isImagePanelOpen()) {
      this.closeImageInsertPanel();
    }
  }

  protected async save(): Promise<void> {
    this.isSaving.set(true);
    this.error.set(null);

    try {
      const data = await this.getDocument();
      this.saved.emit({
        data,
        savedAt: new Date().toISOString(),
        blockCount: data.blocks.length,
      });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to save editor content.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async reset(): Promise<void> {
    this.error.set(null);

    try {
      const document = this.requireValidEditorDocument(this.initialData);
      this.setJsonDocument(document);
      this.setProductionPreviewDocument(document);
      await this.renderEditorDocument(document);
      this.contentChanged.emit();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to reset editor content.');
    }
  }

  async getDocument(): Promise<OutputData> {
    if (this.viewMode() === 'json') {
      return this.getJsonDocument();
    }

    if (this.viewMode() === 'preview' && this.previewDocument) {
      return this.requireValidEditorDocument(this.previewDocument);
    }

    return this.editor ? this.getVisualDocument() : this.requireValidEditorDocument(this.initialData);
  }

  async renderDocument(document: OutputData): Promise<void> {
    this.error.set(null);

    try {
      const normalizedDocument = this.requireValidEditorDocument(document);
      this.initialData = normalizedDocument;
      this.setJsonDocument(normalizedDocument);
      this.setProductionPreviewDocument(normalizedDocument);

      if (this.editor) {
        await this.renderEditorDocument(normalizedDocument);
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to import editor content.');
    }
  }

  async getRecoverySnapshot(): Promise<EditorRecoverySnapshot> {
    if (this.viewMode() === 'json') {
      return {mode: 'json', source: this.jsonSource()};
    }

    const document = this.viewMode() === 'preview' && this.previewDocument
      ? this.requireValidEditorDocument(this.previewDocument)
      : this.editor
        ? await this.getVisualDocument()
        : this.requireValidEditorDocument(this.initialData);

    return {mode: 'visual', document};
  }

  async restoreRecoverySnapshot(snapshot: EditorRecoverySnapshot): Promise<void> {
    this.error.set(null);

    if (snapshot.mode === 'json') {
      this.viewMode.set('json');
      this.jsonSource.set(snapshot.source);

      try {
        this.setJsonValidationState(parseEditorDocument(snapshot.source));
      } catch (error) {
        this.jsonError.set(error instanceof Error ? error.message : 'Unable to validate editor JSON.');
        this.jsonStatus.set(null);
        this.jsonWarning.set(null);
      }

      return;
    }

    const document = this.requireValidEditorDocument(snapshot.document);
    this.initialData = document;
    this.setJsonDocument(document);
    this.setProductionPreviewDocument(document);
    this.viewMode.set('visual');
    await this.renderEditorDocument(document);
  }

  protected async setViewMode(mode: EditorViewMode): Promise<void> {
    if (mode === this.viewMode() || this.isLoading() || this.isSaving() || this.isSyncingView()) {
      return;
    }

    this.isSyncingView.set(true);
    this.error.set(null);

    try {
      if (mode === 'json') {
        const document = this.viewMode() === 'preview' && this.previewDocument
          ? this.requireValidEditorDocument(this.previewDocument)
          : this.editor
            ? await this.getVisualDocument()
            : this.requireValidEditorDocument(this.initialData);
        this.setJsonDocument(document);
        this.viewMode.set('json');
        return;
      }

      const document = this.viewMode() === 'json'
        ? this.getJsonDocument()
        : this.viewMode() === 'preview' && this.previewDocument
          ? this.previewDocument
          : this.editor
            ? await this.getVisualDocument()
            : this.initialData;
      const normalizedDocument = normalizeEditorDocumentForBlogEditor(document);

      if (mode === 'preview') {
        this.setJsonDocument(normalizedDocument);
        this.setProductionPreviewDocument(normalizedDocument);
        this.viewMode.set('preview');
        return;
      }

      if (this.editor) {
        await this.renderEditorDocument(normalizedDocument);
      }

      this.setJsonDocument(normalizedDocument);
      this.setProductionPreviewDocument(normalizedDocument);
      this.viewMode.set('visual');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to synchronize the editor views.';

      if (this.viewMode() === 'json') {
        this.jsonError.set(message);
        this.jsonStatus.set(null);
        this.jsonWarning.set(null);
      } else {
        this.error.set(message);
      }
    } finally {
      this.isSyncingView.set(false);
    }
  }

  protected handleViewTabKeydown(event: KeyboardEvent, currentIndex: number): void {
    const keyOffsets: Partial<Record<string, number>> = {
      ArrowLeft: -1,
      ArrowRight: 1,
    };
    const tabList = event.currentTarget instanceof HTMLElement ? event.currentTarget.parentElement : null;
    const tabs = tabList ? Array.from(tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]')) : [];
    let nextIndex: number | null = null;

    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else if (keyOffsets[event.key] !== undefined && tabs.length > 0) {
      nextIndex = (currentIndex + (keyOffsets[event.key] ?? 0) + tabs.length) % tabs.length;
    }

    if (nextIndex === null || !tabs[nextIndex]) {
      return;
    }

    event.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  }

  protected updateJsonSource(event: Event): void {
    const source = event.target instanceof HTMLTextAreaElement ? event.target.value : '';
    this.jsonSource.set(source);
    this.contentChanged.emit();

    try {
      const document = parseEditorDocument(source);
      this.setJsonValidationState(document);
    } catch (error) {
      this.jsonError.set(error instanceof Error ? error.message : 'Unable to validate editor JSON.');
      this.jsonStatus.set(null);
      this.jsonWarning.set(null);
    }
  }

  protected get filteredMediaLibraryImages(): readonly MediaLibraryItem[] {
    const searchTerm = this.imageLibrarySearch.trim().toLowerCase();
    const images = this.mediaLibraryItems()
      .filter(item => item.mediaType === 'image')
      .filter(item => item.status === 'ready')
      .filter(item => Boolean(this.getMediaSourceUrl(item)));

    const filteredImages = searchTerm
      ? images.filter(item => this.getMediaSearchText(item).includes(searchTerm))
      : images;

    return [...filteredImages].sort((left, right) =>
      (right.uploadedAt ?? '').localeCompare(left.uploadedAt ?? '')
      || left.displayName.localeCompare(right.displayName, undefined, {numeric: true, sensitivity: 'base'})
    );
  }

  protected get selectedMediaItem(): MediaLibraryItem | null {
    return this.mediaLibraryItems().find(item => item.id === this.selectedMediaItemId) ?? null;
  }

  protected openImageInsertPanel(): void {
    this.resolvePendingImageSelection(null);
    this.imagePanelMode = 'insert';
    this.imageInsertTab = 'library';
    this.resetImageInsertForm();
    this.imageInsertMessage.set(null);
    this.mediaLibraryError.set(null);
    this.isImagePanelOpen.set(true);
    this.ensureMediaLibraryLoaded();
  }

  protected closeImageInsertPanel(): void {
    this.resolvePendingImageSelection(null);
    this.isImagePanelOpen.set(false);
    this.imageInsertMessage.set(null);
    this.imagePanelMode = 'insert';
    this.resetImageInsertForm();
  }

  protected setImageInsertTab(tab: EditorImageInsertTab): void {
    this.imageInsertTab = tab;
    this.imageInsertMessage.set(null);

    if (tab === 'library') {
      this.ensureMediaLibraryLoaded();
    }
  }

  protected updateImageLibrarySearch(event: Event): void {
    this.imageLibrarySearch = event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  protected selectMediaItem(item: MediaLibraryItem): void {
    const previousItem = this.selectedMediaItem;
    const previousAltText = previousItem?.altText ?? previousItem?.displayName ?? '';
    const previousCaption = previousItem?.description ?? '';
    const shouldReplaceAltText = !this.imageAltText.trim() || this.imageAltText === previousAltText;
    const shouldReplaceCaption = !this.imageCaption.trim() || this.imageCaption === previousCaption;

    this.selectedMediaItemId = item.id;

    if (shouldReplaceAltText) {
      this.imageAltText = item.altText ?? item.displayName;
    }

    if (shouldReplaceCaption) {
      this.imageCaption = item.description ?? '';
    }

    this.imageInsertMessage.set(null);
  }

  protected updateImageCaption(event: Event): void {
    this.imageCaption = event.target instanceof HTMLTextAreaElement ? event.target.value : '';
  }

  protected updateImageAltText(event: Event): void {
    this.imageAltText = event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  protected setImageLayoutMode(mode: EditorImageLayoutMode): void {
    this.imageLayoutMode = mode;
  }

  protected setImageSizeMode(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    this.imageSizeMode = value === 'small' || value === 'medium' || value === 'large' || value === 'wide'
      ? value
      : '';
  }

  protected async insertSelectedMediaImage(): Promise<void> {
    const item = this.selectedMediaItem;
    const url = item ? this.getMediaSourceUrl(item) : '';

    if (!item || !url) {
      this.imageInsertMessage.set('Select an image before inserting.');
      return;
    }

    const selection: CmsImageLibrarySelection = {
      url,
      alt: this.imageAltText.trim() || item.altText || item.displayName,
      caption: this.imageCaption.trim(),
      imageLayout: this.imageLayoutMode,
      ...(this.imageSizeMode ? {imageSize: this.imageSizeMode} : {}),
      ...(item.width ? {width: item.width} : {}),
      ...(item.height ? {height: item.height} : {}),
    };

    if (this.imagePanelMode === 'select') {
      this.resolvePendingImageSelection(selection);
      this.closeImageInsertPanel();
      return;
    }

    await this.insertImageBlock(selection);
  }

  protected async uploadAndInsertImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (input) {
      input.value = '';
    }

    if (!file) {
      return;
    }

    this.isImageUploadInProgress.set(true);
    this.imageInsertMessage.set(null);

    try {
      const result = await this.uploadImageFile(file);
      await this.insertImageBlock({
        url: result.file.url,
        alt: this.imageAltText.trim() || result.file.alt || file.name,
        width: result.file.width,
        height: result.file.height,
      });
    } catch (error) {
      this.imageInsertMessage.set(error instanceof Error ? error.message : 'Unable to upload and insert image.');
    } finally {
      this.isImageUploadInProgress.set(false);
    }
  }

  protected getMediaPreviewUrl(item: MediaLibraryItem): string {
    return item.thumbnailUrl ?? item.previewUrl ?? item.originalUrl ?? item.downloadUrl ?? '';
  }

  protected getMediaMetaLabel(item: MediaLibraryItem): string {
    const dimensions = item.width && item.height ? `${item.width}x${item.height}` : 'Dimensions unknown';
    const folder = item.folderPath ? ` · ${item.folderPath}` : '';

    return `${dimensions}${folder}`;
  }

  private async initializeEditor(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.error.set('Editor.js is only available in the browser.');
      this.isLoading.set(false);
      return;
    }

    try {
      const [{default: EditorConstructor}, tools] = await Promise.all([
        import('@editorjs/editorjs'),
        loadEditorTools(),
      ]);

      const config: EditorConfig = {
        holder: this.editorHolder.nativeElement,
        data: this.requireValidEditorDocument(this.initialData),
        autofocus: false,
        inlineToolbar: true,
        placeholder: 'Start writing...',
        onChange: () => {
          if (!this.suppressContentChanges) {
            this.contentChanged.emit();
            this.scheduleDocumentDiagnostics();
          }
        },
        sanitizer: {
          a: {
            href: true,
            target: true,
            rel: true,
          },
          b: true,
          i: true,
          mark: true,
        },
        tools: {
          listPresentation: {
            class: tools.ListPresentationTune,
          },
          header: {
            class: tools.Header,
            inlineToolbar: true,
            config: {
              levels: [2, 3],
              defaultLevel: 2,
            },
          },
          list: {
            class: tools.List,
            inlineToolbar: true,
            tunes: ['listPresentation'],
            config: {
              defaultStyle: 'unordered',
              maxLevel: 3,
            },
          },
          quote: {
            class: tools.Quote,
            inlineToolbar: true,
          },
          typography: {
            class: tools.TypographyBlock,
          },
          stats: {
            class: tools.StatsBlock,
          },
          chart: {
            class: tools.ChartBlock,
          },
          poll: {
            class: tools.PollBlock,
          },
          sunoEmbed: {
            class: tools.SunoEmbed,
          },
          appEmbed: {
            class: tools.AppEmbedBlock,
          },
          catCornerUnlock: {
            class: tools.CatCornerUnlockBlock,
          },
          html: {
            class: tools.HtmlBlock,
          },
          unsupported: {
            class: tools.UnsupportedBlock,
          },
          code: {
            class: tools.CmsCodeBlock,
          },
          markdown: {
            class: tools.CmsMarkdownBlock,
          },
          delimiter: tools.Delimiter,
          embed: {
            class: tools.Embed,
            inlineToolbar: false,
          },
          youtubeEmbed: {
            class: tools.YouTubeEmbed,
            inlineToolbar: false,
          },
          image: {
            class: tools.CmsImageBlock,
            config: {
              mediaLibrary: {
                selectImage: (current: CmsImageLibrarySelection) => this.selectExistingImage(current),
              },
              uploader: {
                uploadByFile: async (file: File) => this.uploadImageFile(file),
              },
            },
          },
        },
      };

      this.editor = new EditorConstructor(config);
      await this.editor.isReady;
      this.isLoading.set(false);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to initialize Editor.js.');
      this.isLoading.set(false);
    }
  }

  private setProductionPreviewDocument(document: OutputData): void {
    this.previewDocument = document;
    this.previewBlocks.set(createBlogBlocksFromEditorDocument(document));
  }

  private async renderEditorDocument(document: OutputData): Promise<void> {
    if (!this.editor) {
      return;
    }

    this.suppressContentChanges = true;

    try {
      await this.editor.render(document);
    } finally {
      this.suppressContentChanges = false;
    }
  }

  private getJsonDocument(): OutputData {
    try {
      const document = parseEditorDocument(this.jsonSource());
      const validation = this.setJsonValidationState(document);

      if (!validation.isValid) {
        const errors = validation.diagnostics
          .filter(diagnostic => diagnostic.severity === 'error')
          .map(diagnostic => diagnostic.message);
        throw new Error(errors.join(' '));
      }

      return document;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to validate editor JSON.';
      this.jsonError.set(message);
      this.jsonStatus.set(null);
      this.jsonWarning.set(null);
      throw new Error(message, {cause: error});
    }
  }

  private setJsonDocument(document: OutputData): void {
    this.jsonSource.set(JSON.stringify(document, null, 2));
    this.setJsonValidationState(document);
  }

  private setJsonValidationState(document: OutputData): ReturnType<typeof validateEditorDocumentForBlog> {
    const validation = validateEditorDocumentForBlog(document, {postTitle: this.previewTitle});
    const errors = validation.diagnostics.filter(diagnostic => diagnostic.severity === 'error');
    const warnings = validation.diagnostics.filter(diagnostic => diagnostic.severity === 'warning');
    const blockLabel = document.blocks.length === 1 ? 'block' : 'blocks';
    const onlyPreservedBlocks = warnings.every(diagnostic => diagnostic.code === 'preserved-unsupported-block');
    const warningLabel = onlyPreservedBlocks
      ? warnings.length === 1 ? 'preserved block' : 'preserved blocks'
      : warnings.length === 1 ? 'warning' : 'warnings';

    this.jsonError.set(errors.length > 0 ? errors.map(diagnostic => diagnostic.message).join(' ') : null);
    this.jsonWarning.set(warnings.length > 0 ? warnings.map(diagnostic => diagnostic.message).join(' ') : null);
    this.jsonStatus.set(errors.length === 0
      ? `Valid JSON · ${document.blocks.length} ${blockLabel}${warnings.length > 0 ? ` · ${warnings.length} ${warningLabel}` : ''}`
      : null);

    return validation;
  }

  private requireValidEditorDocument(document: OutputData): OutputData {
    const validation = this.setJsonValidationState(document);

    if (!validation.isValid) {
      const message = validation.diagnostics
        .filter(diagnostic => diagnostic.severity === 'error')
        .map(diagnostic => diagnostic.message)
        .join(' ');
      throw new Error(message);
    }

    return normalizeEditorDocumentForBlogEditor(document);
  }

  private async getVisualDocument(): Promise<OutputData> {
    if (!this.editor) {
      return this.requireValidEditorDocument(this.initialData);
    }

    const blockCountBeforeSave = this.editor.blocks.getBlocksCount();
    const document = await this.editor.save();

    if (document.blocks.length !== blockCountBeforeSave) {
      throw new Error(
        `Editor.js returned ${document.blocks.length} of ${blockCountBeforeSave} blocks. Saving is blocked to prevent content loss.`
      );
    }

    return this.requireValidEditorDocument(document);
  }

  private scheduleDocumentDiagnostics(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.diagnosticsTimer) {
      clearTimeout(this.diagnosticsTimer);
    }

    this.diagnosticsTimer = setTimeout(() => {
      this.diagnosticsTimer = undefined;
      void this.refreshDocumentDiagnostics();
    }, 300);
  }

  private async refreshDocumentDiagnostics(): Promise<void> {
    try {
      const document = this.viewMode() === 'json'
        ? parseEditorDocument(this.jsonSource())
        : this.editor
          ? await this.editor.save()
          : this.previewDocument ?? this.initialData;
      this.setJsonValidationState(document);
    } catch {
      // JSON parsing and save validation retain their existing actionable errors.
    }
  }

  private uploadImageFile(file: File): Promise<EditorImageUploadResult> {
    return this.imageUploader ? this.imageUploader(file) : Promise.resolve(createObjectUrlUploadResult(file));
  }

  private selectExistingImage(current: CmsImageLibrarySelection): Promise<CmsImageLibrarySelection | null> {
    this.resolvePendingImageSelection(null);
    this.imagePanelMode = 'select';
    this.imageInsertTab = 'library';
    this.selectedMediaItemId = null;
    this.imageCaption = current.caption;
    this.imageAltText = current.alt;
    this.imageLayoutMode = current.imageLayout;
    this.imageSizeMode = current.imageSize ?? '';
    this.imageLibrarySearch = '';
    this.imageInsertMessage.set(null);
    this.mediaLibraryError.set(null);
    this.isImagePanelOpen.set(true);
    this.ensureMediaLibraryLoaded();

    return new Promise(resolve => {
      this.pendingImageSelectionResolver = resolve;
    });
  }

  private resolvePendingImageSelection(selection: CmsImageLibrarySelection | null): void {
    const resolver = this.pendingImageSelectionResolver;
    this.pendingImageSelectionResolver = null;
    resolver?.(selection);
  }

  private ensureMediaLibraryLoaded(): void {
    if (this.hasLoadedMediaLibrary) {
      return;
    }

    this.hasLoadedMediaLibrary = true;
    this.isMediaLibraryLoading.set(true);

    this.mediaLibrary.listenToMediaItems()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          this.mediaLibraryItems.set(items);
          this.isMediaLibraryLoading.set(false);
        },
        error: error => {
          this.hasLoadedMediaLibrary = false;
          this.isMediaLibraryLoading.set(false);
          this.mediaLibraryError.set(error instanceof Error ? error.message : 'Unable to load media library images.');
        },
      });
  }

  private async insertImageBlock(source: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  }): Promise<void> {
    if (!this.editor) {
      this.imageInsertMessage.set('The editor is not ready yet.');
      return;
    }

    const currentIndex = this.editor.blocks.getCurrentBlockIndex();
    const insertIndex = currentIndex >= 0 ? currentIndex + 1 : this.editor.blocks.getBlocksCount();

    this.editor.blocks.insert('image', this.createImageBlockData(source), undefined, insertIndex, true);
    this.imageInsertMessage.set('Inserted image into the editor.');
    this.closeImageInsertPanel();
    this.resetImageInsertForm();
  }

  private createImageBlockData(source: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  }): BlockToolData {
    const file: Record<string, string | number> = {
      url: source.url,
      alt: source.alt,
    };

    if (source.width) {
      file['width'] = source.width;
    }

    if (source.height) {
      file['height'] = source.height;
    }

    return {
      file,
      alt: source.alt,
      caption: this.imageCaption.trim(),
      withBorder: false,
      withBackground: false,
      imageLayout: this.imageLayoutMode,
      stretched: this.imageLayoutMode === 'fullWidth',
      ...(this.imageSizeMode ? {imageSize: this.imageSizeMode} : {}),
    };
  }

  private resetImageInsertForm(): void {
    this.selectedMediaItemId = null;
    this.imageLibrarySearch = '';
    this.imageCaption = '';
    this.imageAltText = '';
    this.imageLayoutMode = 'fullWidth';
    this.imageSizeMode = '';
  }

  private getMediaSourceUrl(item: MediaLibraryItem): string {
    return item.originalUrl ?? item.downloadUrl ?? item.previewUrl ?? item.thumbnailUrl ?? '';
  }

  private getMediaSearchText(item: MediaLibraryItem): string {
    return [
      item.displayName,
      item.originalFileName ?? '',
      item.fileName ?? '',
      item.folderPath ?? '',
      item.altText ?? '',
      item.description ?? '',
      item.tags.join(' '),
    ].join(' ').toLowerCase();
  }
}
