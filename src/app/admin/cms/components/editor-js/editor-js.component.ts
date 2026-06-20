import {CommonModule, isPlatformBrowser} from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  Output,
  PLATFORM_ID,
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
import {EditorSavedDocument} from '../../models/editor-document.model';
import {ChartBlockTool} from './tools/chart-block.tool';
import {HtmlBlockTool} from './tools/html-block.tool';
import {StatsBlockTool} from './tools/stats-block.tool';
import {TypographyBlockTool} from './tools/typography-block.tool';

interface EditorToolModules {
  Header: ToolConstructable;
  List: ToolConstructable;
  Quote: ToolConstructable;
  Code: ToolConstructable;
  Delimiter: ToolConstructable;
  Embed: ToolConstructable;
  YoutubeEmbed: ToolConstructable;
  ImageTool: ToolConstructable;
  TypographyBlock: ToolConstructable;
  StatsBlock: ToolConstructable;
  ChartBlock: ToolConstructable;
  HtmlBlock: ToolConstructable;
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
type EditorImageLayoutMode = 'fit-width' | 'intrinsic';

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
    codeModule,
    delimiterModule,
    embedModule,
    youtubeEmbedModule,
    imageModule,
  ] = await Promise.all([
    import('@editorjs/header'),
    import('@editorjs/list'),
    import('@editorjs/quote'),
    import('@editorjs/code'),
    import('@editorjs/delimiter'),
    import('@editorjs/embed'),
    import('editorjs-youtube-embed'),
    import('@editorjs/image'),
  ]);

  return {
    Header: getToolConstructable(headerModule, 'Header'),
    List: getToolConstructable(listModule, 'List'),
    Quote: getToolConstructable(quoteModule, 'Quote'),
    Code: getToolConstructable(codeModule, 'Code'),
    Delimiter: getToolConstructable(delimiterModule, 'Delimiter'),
    Embed: getToolConstructable(embedModule, 'Embed'),
    YoutubeEmbed: getToolConstructable(youtubeEmbedModule, 'YouTube Embed'),
    ImageTool: getToolConstructable(imageModule, 'Image'),
    TypographyBlock: TypographyBlockTool as unknown as ToolConstructable,
    StatsBlock: StatsBlockTool as unknown as ToolConstructable,
    ChartBlock: ChartBlockTool as unknown as ToolConstructable,
    HtmlBlock: HtmlBlockTool as unknown as ToolConstructable,
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

@Component({
  selector: 'app-editor-js',
  imports: [
    CommonModule,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <p class="text-xs uppercase tracking-[0.25em] text-cyan-300">Editor.js</p>
          <h2 class="mt-1 text-2xl font-semibold text-zinc-50">{{ title }}</h2>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
            [disabled]="isLoading() || isSaving()"
            (click)="openImageInsertPanel()"
          >
            Insert Image
          </button>
          <button
            type="button"
            class="border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            [disabled]="isLoading() || isSaving()"
            (click)="reset()"
          >
            Reset
          </button>
          @if (showSaveAction) {
            <button
              type="button"
              class="border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
              [disabled]="isLoading() || isSaving()"
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

      @if (isLoading()) {
        <p class="border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">Loading editor...</p>
      }

      <div
        #editorHolder
        class="min-h-[420px] bg-zinc-50 px-5 py-5 text-zinc-950"
        [class.opacity-50]="isLoading()"
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
                  <h3 class="text-lg font-semibold text-zinc-50">Insert Image</h3>
                </div>

                <div class="flex gap-2">
                  <button
                    type="button"
                    [class]="imageInsertTab === 'library' ? activeImageTabClass : inactiveImageTabClass"
                    (click)="setImageInsertTab('library')"
                  >
                    Media Library
                  </button>
                  <button
                    type="button"
                    [class]="imageInsertTab === 'upload' ? activeImageTabClass : inactiveImageTabClass"
                    (click)="setImageInsertTab('upload')"
                  >
                    Upload New
                  </button>
                </div>
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
                    <p class="border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">Loading media library images...</p>
                  }

                  @if (mediaLibraryError(); as message) {
                    <p class="border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{{ message }}</p>
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
                      <p class="border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">{{ message }}</p>
                    }
                  </section>
                </div>
              }
            </div>

            <aside class="space-y-5 overflow-auto p-4">
              <div class="space-y-2">
                <h4 class="text-base font-semibold text-zinc-50">Image options</h4>
                <p class="text-xs leading-5 text-zinc-500">These options are saved with the Editor.js image block.</p>
              </div>

              @if (selectedMediaItem; as item) {
                <figure class="overflow-hidden border border-zinc-800 bg-zinc-900">
                  <img
                    [src]="getMediaPreviewUrl(item)"
                    [alt]="item.altText || item.displayName"
                    class="aspect-video w-full object-cover"
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
                <button
                  type="button"
                  class="block w-full border px-3 py-3 text-left"
                  [class.border-cyan-300]="imageLayoutMode === 'fit-width'"
                  [class.bg-cyan-950]="imageLayoutMode === 'fit-width'"
                  [class.border-zinc-800]="imageLayoutMode !== 'fit-width'"
                  [class.bg-zinc-900]="imageLayoutMode !== 'fit-width'"
                  (click)="setImageLayoutMode('fit-width')"
                >
                  <span class="block text-sm font-medium text-zinc-100">Fit text area</span>
                  <span class="mt-1 block text-xs text-zinc-500">Stretch to the editor width without cropping.</span>
                </button>
                <button
                  type="button"
                  class="block w-full border px-3 py-3 text-left"
                  [class.border-cyan-300]="imageLayoutMode === 'intrinsic'"
                  [class.bg-cyan-950]="imageLayoutMode === 'intrinsic'"
                  [class.border-zinc-800]="imageLayoutMode !== 'intrinsic'"
                  [class.bg-zinc-900]="imageLayoutMode !== 'intrinsic'"
                  (click)="setImageLayoutMode('intrinsic')"
                >
                  <span class="block text-sm font-medium text-zinc-100">Maintain aspect ratio</span>
                  <span class="mt-1 block text-xs text-zinc-500">Keep a contained image layout inside the text column.</span>
                </button>
              </fieldset>

              @if (imageInsertMessage(); as message) {
                <p class="border border-emerald-500/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">{{ message }}</p>
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
                  Insert Selected
                </button>
              </footer>
            </aside>
          </section>
        </div>
      }
    </section>
  `,
})
export class EditorJsComponent implements AfterViewInit {
  @Input({required: true}) initialData!: OutputData;
  @Input() title = 'Post Editor';
  @Input() saveLabel = 'Save Draft';
  @Input() showSaveAction = true;
  @Input() imageUploader: ((file: File) => Promise<EditorImageUploadResult>) | null = null;
  @Output() saved = new EventEmitter<EditorSavedDocument>();

  @ViewChild('editorHolder', {static: true}) private readonly editorHolder!: ElementRef<HTMLElement>;

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isImagePanelOpen = signal(false);
  protected readonly isImageUploadInProgress = signal(false);
  protected readonly isMediaLibraryLoading = signal(false);
  protected readonly mediaLibraryError = signal<string | null>(null);
  protected readonly imageInsertMessage = signal<string | null>(null);
  protected readonly mediaLibraryItems = signal<readonly MediaLibraryItem[]>([]);
  protected readonly activeImageTabClass = 'border border-cyan-300 bg-cyan-400 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-950';
  protected readonly inactiveImageTabClass = 'border border-zinc-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-300 hover:border-cyan-300 hover:text-cyan-200';
  protected imageInsertTab: EditorImageInsertTab = 'library';
  protected imageLibrarySearch = '';
  protected selectedMediaItemId: string | null = null;
  protected imageCaption = '';
  protected imageAltText = '';
  protected imageLayoutMode: EditorImageLayoutMode = 'fit-width';

  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaLibrary = inject(MediaLibraryService);
  private editor: EditorJS | null = null;
  private hasLoadedMediaLibrary = false;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    this.destroyRef.onDestroy(() => {
      this.editor?.destroy();
      this.editor = null;
    });
  }

  ngAfterViewInit(): void {
    void this.initializeEditor();
  }

  protected async save(): Promise<void> {
    if (!this.editor) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);

    try {
      const data = await this.editor.save();
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
      await this.editor?.render(this.initialData);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to reset editor content.');
    }
  }

  async getDocument(): Promise<OutputData> {
    return this.editor ? this.editor.save() : this.initialData;
  }

  async renderDocument(document: OutputData): Promise<void> {
    this.initialData = document;
    this.error.set(null);

    if (!this.editor) {
      return;
    }

    try {
      await this.editor.render(document);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to import editor content.');
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
    this.imageInsertMessage.set(null);
    this.mediaLibraryError.set(null);
    this.isImagePanelOpen.set(true);
    this.ensureMediaLibraryLoaded();
  }

  protected closeImageInsertPanel(): void {
    this.isImagePanelOpen.set(false);
    this.imageInsertMessage.set(null);
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
    this.selectedMediaItemId = item.id;

    if (!this.imageAltText.trim()) {
      this.imageAltText = item.altText ?? item.displayName;
    }

    if (!this.imageCaption.trim()) {
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

  protected async insertSelectedMediaImage(): Promise<void> {
    const item = this.selectedMediaItem;
    const url = item ? this.getMediaSourceUrl(item) : '';

    if (!item || !url) {
      this.imageInsertMessage.set('Select an image before inserting.');
      return;
    }

    await this.insertImageBlock({
      url,
      alt: this.imageAltText.trim() || item.altText || item.displayName,
      width: item.width,
      height: item.height,
    });
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
        data: this.initialData,
        autofocus: false,
        inlineToolbar: true,
        placeholder: 'Start writing...',
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
            config: {
              defaultStyle: 'unordered',
              maxLevel: 2,
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
          html: {
            class: tools.HtmlBlock,
          },
          code: tools.Code,
          delimiter: tools.Delimiter,
          embed: {
            class: tools.Embed,
            inlineToolbar: false,
          },
          youtubeEmbed: {
            class: tools.YoutubeEmbed,
            inlineToolbar: false,
          },
          image: {
            class: tools.ImageTool,
            config: {
              captionPlaceholder: 'Image caption',
              buttonContent: 'Upload image',
              types: 'image/*',
              features: {
                border: true,
                background: true,
                stretch: true,
              },
              uploader: {
                uploadByFile: async (file: File) => this.uploadImageFile(file),
                uploadByUrl: async (url: string): Promise<EditorImageUploadResult> => ({
                  success: 1,
                  file: {url},
                }),
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

  private uploadImageFile(file: File): Promise<EditorImageUploadResult> {
    return this.imageUploader ? this.imageUploader(file) : Promise.resolve(createObjectUrlUploadResult(file));
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
    height?: number
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
    height?: number
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
      stretched: this.imageLayoutMode === 'fit-width',
    };
  }

  private resetImageInsertForm(): void {
    this.selectedMediaItemId = null;
    this.imageCaption = '';
    this.imageAltText = '';
    this.imageLayoutMode = 'fit-width';
  }

  private getMediaSourceUrl(item: MediaLibraryItem): string {
    return item.previewUrl ?? item.originalUrl ?? item.downloadUrl ?? item.thumbnailUrl ?? '';
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
