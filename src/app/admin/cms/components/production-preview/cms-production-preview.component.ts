import {ChangeDetectionStrategy, Component, Input, signal} from '@angular/core';

import {BlogBlockRendererComponent} from '../../../../features/blog/components/block-renderer/blog-block-renderer.component';
import {BlogContentBlock} from '../../../../features/blog/models/blog-post.model';

export type CmsProductionPreviewTheme = 'light' | 'dark';
export type CmsProductionPreviewViewport = 'mobile' | 'tablet' | 'desktop';
export type CmsProductionPreviewReaderScale = 100 | 150 | 200;

interface CmsProductionPreviewViewportOption {
  id: CmsProductionPreviewViewport;
  label: string;
  width: number;
}

const CMS_PRODUCTION_PREVIEW_VIEWPORTS: readonly CmsProductionPreviewViewportOption[] = [
  {id: 'mobile', label: 'Mobile', width: 390},
  {id: 'tablet', label: 'Tablet', width: 768},
  {id: 'desktop', label: 'Desktop', width: 1280},
];

const CMS_PRODUCTION_PREVIEW_READER_SCALES: readonly CmsProductionPreviewReaderScale[] = [100, 150, 200];

@Component({
  selector: 'app-cms-production-preview',
  imports: [BlogBlockRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="overflow-hidden border border-zinc-700 bg-zinc-950"
      aria-label="Production preview"
      data-testid="cms-production-preview"
    >
      <header class="space-y-3 border-b border-zinc-800 bg-zinc-900/80 p-3 sm:p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Local unsaved document</p>
            <h3 class="mt-1 text-base font-semibold text-zinc-50">Production renderer</h3>
            <p class="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">
              Uses the public article renderer and sanitizer. Canvas widths are review aids; final responsive approval still uses real browser viewports.
            </p>
          </div>
          <span class="border border-emerald-500/40 bg-emerald-950/20 px-2.5 py-1.5 text-[11px] font-medium text-emerald-200">
            No save required
          </span>
        </div>

        <div class="flex flex-wrap gap-3" aria-label="Production preview settings">
          <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Preview theme">
            <span class="mr-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Theme</span>
            @for (option of themes; track option) {
              <button
                type="button"
                class="min-h-9 border px-2.5 text-xs font-medium"
                [class.border-cyan-300]="theme() === option"
                [class.bg-cyan-400]="theme() === option"
                [class.text-zinc-950]="theme() === option"
                [class.border-zinc-700]="theme() !== option"
                [class.text-zinc-300]="theme() !== option"
                [attr.aria-pressed]="theme() === option"
                (click)="theme.set(option)"
              >
                {{ option === 'light' ? 'Light' : 'Dark' }}
              </button>
            }
          </div>

          <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Preview viewport">
            <span class="mr-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Viewport</span>
            @for (option of viewports; track option.id) {
              <button
                type="button"
                class="min-h-9 border px-2.5 text-xs font-medium"
                [class.border-cyan-300]="viewport() === option.id"
                [class.bg-cyan-400]="viewport() === option.id"
                [class.text-zinc-950]="viewport() === option.id"
                [class.border-zinc-700]="viewport() !== option.id"
                [class.text-zinc-300]="viewport() !== option.id"
                [attr.aria-pressed]="viewport() === option.id"
                (click)="viewport.set(option.id)"
              >
                {{ option.label }}
              </button>
            }
          </div>

          <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Preview reader text scale">
            <span class="mr-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Reader text</span>
            @for (option of readerScales; track option) {
              <button
                type="button"
                class="min-h-9 border px-2.5 text-xs font-medium tabular-nums"
                [class.border-cyan-300]="readerScale() === option"
                [class.bg-cyan-400]="readerScale() === option"
                [class.text-zinc-950]="readerScale() === option"
                [class.border-zinc-700]="readerScale() !== option"
                [class.text-zinc-300]="readerScale() !== option"
                [attr.aria-pressed]="readerScale() === option"
                (click)="readerScale.set(option)"
              >
                {{ option }}%
              </button>
            }
          </div>

          <button
            type="button"
            class="min-h-9 border px-2.5 text-xs font-medium"
            [class.border-cyan-300]="reduceMotion()"
            [class.bg-cyan-400]="reduceMotion()"
            [class.text-zinc-950]="reduceMotion()"
            [class.border-zinc-700]="!reduceMotion()"
            [class.text-zinc-300]="!reduceMotion()"
            [attr.aria-pressed]="reduceMotion()"
            (click)="reduceMotion.set(!reduceMotion())"
          >
            Reduce motion
          </button>
        </div>

        <p class="text-[11px] text-zinc-600" aria-live="polite">
          {{ activeViewport.label }} canvas · {{ activeViewport.width }}px · {{ theme() }} theme · {{ readerScale() }}% reader text{{ reduceMotion() ? ' · reduced motion' : '' }}
        </p>
      </header>

      @if (unsupportedBlockCount > 0) {
        <p class="border-b border-amber-500/40 bg-amber-950/25 px-4 py-3 text-xs leading-5 text-amber-100" role="status">
          {{ unsupportedBlockCount }} compatibility-protected block{{ unsupportedBlockCount === 1 ? '' : 's' }} omitted, matching the public renderer. Preserved source remains available in WYSIWYG or JSON mode.
        </p>
      }

      <div class="overflow-x-auto bg-black/40 p-3 sm:p-5" data-testid="cms-production-preview-canvas">
        <div
          class="cms-production-preview-frame mx-auto min-h-[640px] shadow-2xl shadow-black/35"
          [class.light]="theme() === 'light'"
          [class.dark]="theme() === 'dark'"
          [class.reader-font-100]="readerScale() === 100"
          [class.reader-font-150]="readerScale() === 150"
          [class.reader-font-200]="readerScale() === 200"
          [class.reader-motion-reduce]="reduceMotion()"
          [style.width.px]="activeViewport.width"
          [attr.data-preview-theme]="theme()"
          [attr.data-preview-viewport]="viewport()"
          [attr.data-preview-reader-scale]="readerScale()"
          [attr.data-preview-reduced-motion]="reduceMotion()"
          data-testid="cms-production-preview-frame"
        >
          <div class="public-reader-scope site-theme-scope min-h-[640px] bg-white text-slate-700 dark:bg-neutral-950 dark:text-zinc-300">
            <article class="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
              <header class="mb-8 space-y-4 border-b border-slate-200 pb-6 dark:border-zinc-800">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">Production Preview</p>
                <h1 class="blog-article-title font-semibold text-slate-950 dark:text-zinc-50">{{ title || 'Untitled Post' }}</h1>
                @if (coverImage) {
                  <img
                    [src]="coverImage"
                    [alt]="(title || 'Untitled Post') + ' cover image'"
                    class="blog-media-frame aspect-[16/9] max-h-[70vh] w-full object-contain"
                    width="1200"
                    height="675"
                    decoding="async"
                  >
                }
                @if (excerpt) {
                  <p class="blog-post-dek text-lg leading-8 text-slate-600 dark:text-zinc-400">{{ excerpt }}</p>
                }
              </header>

              <app-blog-block-renderer
                [blocks]="blocks"
                [fallbackAlt]="title || 'Blog content'"
                [postId]="postId"
                [postSlug]="postSlug"
                [previewMode]="true"
              ></app-blog-block-renderer>
            </article>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CmsProductionPreviewComponent {
  @Input() blocks: readonly BlogContentBlock[] = [];
  @Input() title = '';
  @Input() excerpt = '';
  @Input() coverImage = '';
  @Input() postId = '';
  @Input() postSlug = '';

  protected readonly themes: readonly CmsProductionPreviewTheme[] = ['light', 'dark'];
  protected readonly viewports = CMS_PRODUCTION_PREVIEW_VIEWPORTS;
  protected readonly readerScales = CMS_PRODUCTION_PREVIEW_READER_SCALES;
  protected readonly theme = signal<CmsProductionPreviewTheme>('light');
  protected readonly viewport = signal<CmsProductionPreviewViewport>('desktop');
  protected readonly readerScale = signal<CmsProductionPreviewReaderScale>(100);
  protected readonly reduceMotion = signal(false);

  protected get activeViewport(): CmsProductionPreviewViewportOption {
    return this.viewports.find(option => option.id === this.viewport()) ?? this.viewports[2];
  }

  protected get unsupportedBlockCount(): number {
    return this.blocks.filter(block => block.type === 'unsupported').length;
  }
}
