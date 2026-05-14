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
} from '@angular/core';
import type EditorJS from '@editorjs/editorjs';
import type {EditorConfig, OutputData, ToolConstructable} from '@editorjs/editorjs';

import {EditorSavedDocument} from '../../models/editor-document.model';

interface EditorToolModules {
  Header: ToolConstructable;
  List: ToolConstructable;
  Quote: ToolConstructable;
  Code: ToolConstructable;
  Delimiter: ToolConstructable;
  Embed: ToolConstructable;
  ImageTool: ToolConstructable;
}

interface ImageUploadResult {
  success: 1;
  file: {
    url: string;
  };
}

async function loadEditorTools(): Promise<EditorToolModules> {
  const [
    headerModule,
    listModule,
    quoteModule,
    codeModule,
    delimiterModule,
    embedModule,
    imageModule,
  ] = await Promise.all([
    import('@editorjs/header'),
    import('@editorjs/list'),
    import('@editorjs/quote'),
    import('@editorjs/code'),
    import('@editorjs/delimiter'),
    import('@editorjs/embed'),
    import('@editorjs/image'),
  ]);

  return {
    Header: headerModule.default as unknown as ToolConstructable,
    List: listModule.default as unknown as ToolConstructable,
    Quote: quoteModule.default as unknown as ToolConstructable,
    Code: codeModule.default as unknown as ToolConstructable,
    Delimiter: delimiterModule.default as unknown as ToolConstructable,
    Embed: embedModule.default as unknown as ToolConstructable,
    ImageTool: imageModule.default as unknown as ToolConstructable,
  };
}

function createObjectUrlUploadResult(file: File): ImageUploadResult {
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
            class="border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            [disabled]="isLoading() || isSaving()"
            (click)="reset()"
          >
            Reset
          </button>
          <button
            type="button"
            class="border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
            [disabled]="isLoading() || isSaving()"
            (click)="save()"
          >
            {{ isSaving() ? 'Saving' : 'Save Draft' }}
          </button>
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
    </section>
  `,
})
export class EditorJsComponent implements AfterViewInit {
  @Input({required: true}) initialData!: OutputData;
  @Input() title = 'Post Editor';
  @Output() saved = new EventEmitter<EditorSavedDocument>();

  @ViewChild('editorHolder', {static: true}) private readonly editorHolder!: ElementRef<HTMLElement>;

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private editor: EditorJS | null = null;

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
        placeholder: 'Start writing...',
        tools: {
          header: {
            class: tools.Header,
            inlineToolbar: ['link'],
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
          code: tools.Code,
          delimiter: tools.Delimiter,
          embed: {
            class: tools.Embed,
            inlineToolbar: false,
          },
          image: {
            class: tools.ImageTool,
            config: {
              uploader: {
                uploadByFile: async (file: File) => createObjectUrlUploadResult(file),
                uploadByUrl: async (url: string): Promise<ImageUploadResult> => ({
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
}
