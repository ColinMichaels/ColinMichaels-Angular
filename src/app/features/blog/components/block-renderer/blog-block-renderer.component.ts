import {
  Component,
  Input,
  OnChanges,
  SecurityContext,
  inject,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import {DomSanitizer, SafeHtml, SafeResourceUrl} from '@angular/platform-browser';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faDownload,
  faMagnifyingGlassPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import {BlogContentBlock} from '../../models/blog-post.model';
import {createBlogHeadingIdMap} from '../../utils/blog-reading.util';

interface RenderableBlogBlock {
  block: BlogContentBlock;
  safeEmbedUrl: SafeResourceUrl | null;
  externalUrl: string | null;
  headingId: string | null;
  textHtml: SafeHtml;
  captionHtml: SafeHtml;
  attributionHtml: SafeHtml;
  itemHtml: readonly SafeHtml[];
  imageAlt: string;
  galleryIndex: number | null;
}

interface RenderableBlogImage {
  url: string;
  alt: string;
  captionHtml: SafeHtml;
  captionText: string;
  downloadName: string;
}

@Component({
  selector: 'app-blog-block-renderer',
  imports: [FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="blog-content space-y-6 text-base leading-8 text-zinc-300">
      @for (row of renderedBlocks; track row.block.id) {
        @switch (row.block.type) {
          @case ('header') {
            @if (row.block.data.level === 3) {
              <h3
                [id]="row.headingId"
                class="group scroll-mt-24 pt-4 text-xl font-semibold text-zinc-50"
              >
                <a
                  [href]="row.headingId ? createAnchorHref(row.headingId) : null"
                  class="inline-flex items-baseline gap-2 hover:text-cyan-200"
                >
                  <span [innerHTML]="row.textHtml"></span>
                  @if (row.headingId) {
                    <span aria-hidden="true"
                          class="text-sm text-zinc-600 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">#</span>
                  }
                </a>
              </h3>
            } @else {
              <h2
                [id]="row.headingId"
                class="group scroll-mt-24 pt-4 text-2xl font-semibold text-zinc-50"
              >
                <a
                  [href]="row.headingId ? createAnchorHref(row.headingId) : null"
                  class="inline-flex items-baseline gap-2 hover:text-cyan-200"
                >
                  <span [innerHTML]="row.textHtml"></span>
                  @if (row.headingId) {
                    <span aria-hidden="true"
                          class="text-base text-zinc-600 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">#</span>
                  }
                </a>
              </h2>
            }
          }
          @case ('paragraph') {
            <p [innerHTML]="row.textHtml"></p>
          }
          @case ('quote') {
            <blockquote class="border-l-2 border-cyan-300 pl-5 text-zinc-200">
              <p [innerHTML]="row.textHtml"></p>
              @if (row.block.data.caption) {
                <cite class="mt-2 block text-sm not-italic text-zinc-500" [innerHTML]="row.captionHtml"></cite>
              }
            </blockquote>
          }
          @case ('typography') {
            @switch (row.block.data.variant) {
              @case ('eyebrow') {
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300"
                   [innerHTML]="row.textHtml"></p>
              }
              @case ('pullQuote') {
                <blockquote class="my-10 border-y border-amber-300/40 py-7 text-zinc-100">
                  <p class="text-2xl font-semibold leading-10 tracking-[-0.02em] sm:text-3xl"
                     [innerHTML]="row.textHtml"></p>
                  @if (row.block.data.attribution) {
                    <cite class="mt-4 block text-sm not-italic uppercase tracking-[0.22em] text-amber-200"
                          [innerHTML]="row.attributionHtml"></cite>
                  }
                </blockquote>
              }
              @case ('callout') {
                <aside class="border border-emerald-400/30 bg-emerald-950/30 p-5 text-emerald-50">
                  @if (row.block.data.attribution) {
                    <p class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300"
                       [innerHTML]="row.attributionHtml"></p>
                  }
                  <div class="leading-8" [innerHTML]="row.textHtml"></div>
                </aside>
              }
              @case ('aside') {
                <aside class="border-l border-zinc-600 pl-5 text-sm leading-7 text-zinc-400"
                       [innerHTML]="row.textHtml"></aside>
              }
              @case ('caption') {
                <p class="text-sm leading-6 text-zinc-500" [innerHTML]="row.textHtml"></p>
              }
              @default {
                <p class="text-xl leading-9 tracking-[-0.01em] text-zinc-100" [innerHTML]="row.textHtml"></p>
              }
            }
          }
          @case ('list') {
            @if (row.block.data.ordered) {
              <ol class="list-decimal space-y-2 pl-6">
                @for (item of row.itemHtml; track $index) {
                  <li [innerHTML]="item"></li>
                }
              </ol>
            } @else {
              <ul class="list-disc space-y-2 pl-6">
                @for (item of row.itemHtml; track $index) {
                  <li [innerHTML]="item"></li>
                }
              </ul>
            }
          }
          @case ('image') {
            @if (row.block.data.url) {
              <figure
                class="space-y-2"
                [class.rounded]="row.block.data.withBackground"
                [class.bg-zinc-900]="row.block.data.withBackground"
                [class.p-4]="row.block.data.withBackground"
              >
                <button
                  type="button"
                  class="group relative block cursor-zoom-in overflow-hidden rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                  [class.w-full]="row.block.data.stretched"
                  [class.mx-auto]="!row.block.data.stretched"
                  [class.max-w-full]="!row.block.data.stretched"
                  [class.w-fit]="!row.block.data.stretched"
                  [attr.aria-label]="'View image full screen: ' + row.imageAlt"
                  title="View image full screen"
                  (click)="openImageLightbox(row.galleryIndex)"
                >
                  <img
                    [src]="row.block.data.url"
                    [alt]="row.imageAlt"
                    [attr.width]="row.block.data.width || null"
                    [attr.height]="row.block.data.height || null"
                    class="rounded object-contain transition duration-200 group-hover:scale-[1.01] group-focus-visible:scale-[1.01]"
                    [class.w-full]="row.block.data.stretched"
                    [class.mx-auto]="!row.block.data.stretched"
                    [class.max-w-full]="!row.block.data.stretched"
                    [class.border]="row.block.data.withBorder"
                    [class.border-zinc-700]="row.block.data.withBorder"
                    loading="lazy"
                    decoding="async"
                  >
                  <span
                    aria-hidden="true"
                    class="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-sm text-zinc-50 opacity-0 shadow-lg shadow-black/30 transition group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <fa-icon [icon]="faMagnifyingGlassPlus"></fa-icon>
                  </span>
                </button>
                @if (row.block.data.caption) {
                  <figcaption class="text-sm text-zinc-500" [innerHTML]="row.captionHtml"></figcaption>
                }
              </figure>
            }
          }
          @case ('embed') {
            @if (row.safeEmbedUrl) {
              <figure class="space-y-2">
                <div class="aspect-video overflow-hidden rounded bg-black">
                  <iframe
                    [src]="row.safeEmbedUrl"
                    [title]="row.block.data.caption || fallbackAlt"
                    class="h-full w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                  ></iframe>
                </div>
                @if (row.block.data.caption) {
                  <figcaption class="text-sm text-zinc-500" [innerHTML]="row.captionHtml"></figcaption>
                }
              </figure>
            } @else if (row.externalUrl) {
              <p>
                <a [href]="row.externalUrl" target="_blank" rel="noopener noreferrer" class="blog-inline-link">
                  <span [innerHTML]="row.captionHtml || row.externalUrl"></span>
                </a>
              </p>
            }
          }
          @case ('code') {
            <pre class="overflow-x-auto rounded bg-black p-4 text-sm leading-6 text-cyan-100"><code>{{ row.block.data.code }}</code></pre>
          }
          @case ('delimiter') {
            <hr class="border-zinc-800">
          }
        }
      }
    </section>

    @if (activeImage; as image) {
      <div
        class="fixed inset-0 z-[100] bg-black/92 p-4 text-zinc-100 backdrop-blur-sm sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Blog image gallery"
      >
        <button
          type="button"
          class="absolute inset-0 h-full w-full cursor-default"
          aria-label="Close image gallery"
          title="Close image gallery"
          (click)="closeImageLightbox()"
          data-testid="blog-lightbox-backdrop"
        ></button>
        <div class="pointer-events-none relative z-10 grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-4">
          <header class="pointer-events-auto flex items-center justify-between gap-3">
            <p class="text-sm font-medium text-zinc-300" aria-live="polite">{{ activeImagePositionLabel }}</p>
            <div class="flex items-center gap-2">
              <a
                [href]="image.url"
                [attr.download]="image.downloadName"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-zinc-100 transition hover:border-cyan-200 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                [attr.aria-label]="'Download image: ' + image.alt"
                title="Download image"
                data-testid="blog-lightbox-download"
              >
                <fa-icon [icon]="faDownload"></fa-icon>
              </a>
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-zinc-100 transition hover:border-cyan-200 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                aria-label="Close image gallery"
                title="Close"
                (click)="closeImageLightbox()"
                data-testid="blog-lightbox-close"
              >
                <fa-icon [icon]="faXmark"></fa-icon>
              </button>
            </div>
          </header>

          <div class="relative grid min-h-0 place-items-center">
            @if (hasMultipleImages) {
              <button
                type="button"
                class="pointer-events-auto absolute left-0 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-zinc-100 transition hover:border-cyan-200 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:left-2"
                aria-label="View previous image"
                title="Previous image"
                (click)="showPreviousImage($event)"
                data-testid="blog-lightbox-previous"
              >
                <fa-icon [icon]="faChevronLeft"></fa-icon>
              </button>
              <button
                type="button"
                class="pointer-events-auto absolute right-0 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-zinc-100 transition hover:border-cyan-200 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:right-2"
                aria-label="View next image"
                title="Next image"
                (click)="showNextImage($event)"
                data-testid="blog-lightbox-next"
              >
                <fa-icon [icon]="faChevronRight"></fa-icon>
              </button>
            }
            <img
              [src]="image.url"
              [alt]="image.alt"
              class="pointer-events-auto max-h-full max-w-full rounded object-contain shadow-2xl shadow-black/50"
              decoding="async"
              data-testid="blog-lightbox-image"
            >
          </div>

          <footer class="pointer-events-auto mx-auto max-w-4xl text-center">
            @if (image.captionText) {
              <p class="text-sm leading-6 text-zinc-300" [innerHTML]="image.captionHtml"></p>
            } @else {
              <p class="sr-only">{{ image.alt }}</p>
            }
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    :host ::ng-deep .blog-inline-link {
      border-bottom: 1px solid rgba(34, 211, 238, 0.65);
      color: #67e8f9;
      font-size: 0.95em;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
    }

    :host ::ng-deep .blog-inline-link:hover,
    :host ::ng-deep .blog-inline-link:focus-visible {
      background: rgba(8, 145, 178, 0.18);
      border-color: #fde68a;
      color: #fde68a;
      outline: none;
    }
  `],
})
export class BlogBlockRendererComponent implements OnChanges {
  @Input() blocks: readonly BlogContentBlock[] = [];
  @Input() fallbackAlt = 'Blog content';
  @Input() anchorPath = '';

  protected renderedBlocks: readonly RenderableBlogBlock[] = [];
  protected imageGallery: readonly RenderableBlogImage[] = [];
  protected activeImageIndex: number | null = null;
  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faDownload = faDownload;
  protected readonly faMagnifyingGlassPlus = faMagnifyingGlassPlus;
  protected readonly faXmark = faXmark;

  private readonly sanitizer = inject(DomSanitizer);
  private readonly trustedEmbedHosts = new Set([
    'www.youtube.com',
    'youtube.com',
    'm.youtube.com',
    'youtu.be',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
  ]);

  ngOnChanges(): void {
    const headingIdMap = createBlogHeadingIdMap(this.blocks);
    const imageGallery: RenderableBlogImage[] = [];

    this.renderedBlocks = this.blocks.map(block => {
      const captionHtml = this.createInlineHtml(block.data.caption);
      const imageAlt = this.createImageAlt(block);
      let galleryIndex: number | null = null;

      if (block.type === 'image' && block.data.url) {
        galleryIndex = imageGallery.length;
        imageGallery.push({
          url: block.data.url,
          alt: imageAlt,
          captionHtml,
          captionText: this.createPlainText(block.data.caption),
          downloadName: this.createDownloadFileName(block),
        });
      }

      return {
        block,
        safeEmbedUrl: this.createSafeEmbedUrl(block),
        externalUrl: this.createExternalUrl(block),
        headingId: headingIdMap.get(block.id) ?? null,
        textHtml: this.createInlineHtml(block.data.text),
        captionHtml,
        attributionHtml: this.createInlineHtml(block.data.attribution),
        itemHtml: (block.data.items ?? []).map(item => this.createInlineHtml(item)),
        imageAlt,
        galleryIndex,
      };
    });
    this.imageGallery = imageGallery;

    if (this.activeImageIndex !== null && !this.imageGallery[this.activeImageIndex]) {
      this.closeImageLightbox();
    }
  }

  protected get activeImage(): RenderableBlogImage | null {
    return this.activeImageIndex === null ? null : this.imageGallery[this.activeImageIndex] ?? null;
  }

  protected get activeImagePositionLabel(): string {
    if (this.activeImageIndex === null || this.imageGallery.length === 0) {
      return '';
    }

    return `${this.activeImageIndex + 1} / ${this.imageGallery.length}`;
  }

  protected get hasMultipleImages(): boolean {
    return this.imageGallery.length > 1;
  }

  protected openImageLightbox(galleryIndex: number | null): void {
    if (galleryIndex === null || !this.imageGallery[galleryIndex]) {
      return;
    }

    this.activeImageIndex = galleryIndex;
  }

  protected closeImageLightbox(): void {
    this.activeImageIndex = null;
  }

  protected showPreviousImage(event?: Event): void {
    event?.stopPropagation();

    if (this.activeImageIndex === null || this.imageGallery.length < 2) {
      return;
    }

    this.activeImageIndex = (this.activeImageIndex - 1 + this.imageGallery.length) % this.imageGallery.length;
  }

  protected showNextImage(event?: Event): void {
    event?.stopPropagation();

    if (this.activeImageIndex === null || this.imageGallery.length < 2) {
      return;
    }

    this.activeImageIndex = (this.activeImageIndex + 1) % this.imageGallery.length;
  }

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    this.closeImageLightbox();
  }

  @HostListener('document:keydown.arrowleft', ['$event'])
  protected handleArrowLeftKey(event: Event): void {
    if (!this.activeImage || !this.hasMultipleImages) {
      return;
    }

    event.preventDefault();
    this.showPreviousImage();
  }

  @HostListener('document:keydown.arrowright', ['$event'])
  protected handleArrowRightKey(event: Event): void {
    if (!this.activeImage || !this.hasMultipleImages) {
      return;
    }

    event.preventDefault();
    this.showNextImage();
  }

  private createInlineHtml(value: string | undefined): SafeHtml {
    const sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, value ?? '') ?? '';

    if (!sanitizedHtml) {
      return '';
    }

    const template = document.createElement('template');
    template.innerHTML = sanitizedHtml;

    template.content.querySelectorAll('a[href]').forEach(anchor => {
      const href = anchor.getAttribute('href')?.trim() ?? '';

      anchor.classList.add('blog-inline-link');

      if (this.shouldOpenInNewTab(href)) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return this.sanitizer.bypassSecurityTrustHtml(template.innerHTML);
  }

  private createPlainText(value: string | undefined): string {
    const sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, value ?? '') ?? '';

    if (!sanitizedHtml) {
      return '';
    }

    const template = document.createElement('template');
    template.innerHTML = sanitizedHtml;

    return template.content.textContent?.trim() ?? '';
  }

  private createImageAlt(block: BlogContentBlock): string {
    return block.data.alt?.trim() || this.fallbackAlt.trim() || 'Blog content image';
  }

  private createDownloadFileName(block: BlogContentBlock): string {
    const sourceName = this.getFileNameFromUrl(block.data.url);

    if (sourceName) {
      return sourceName;
    }

    return `${this.sanitizeFileName(block.data.alt || this.fallbackAlt || block.id) || 'blog-image'}.jpg`;
  }

  private getFileNameFromUrl(value: string | undefined): string {
    if (!value) {
      return '';
    }

    try {
      const url = new URL(value, 'https://colinmichaels.local');
      const pathName = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '');

      return this.sanitizeFileName(pathName);
    } catch {
      return '';
    }
  }

  private sanitizeFileName(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/^[._-]+/, '')
      .slice(0, 120);
  }

  private createSafeEmbedUrl(block: BlogContentBlock): SafeResourceUrl | null {
    if (block.type !== 'embed') {
      return null;
    }

    const url = this.createTrustedEmbedUrl(block.data.embedUrl ?? block.data.url);

    if (!url || url.protocol !== 'https:' || !this.trustedEmbedHosts.has(url.hostname)) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(url.toString());
  }

  private createExternalUrl(block: BlogContentBlock): string | null {
    const url = this.parseHttpUrl(block.data.url ?? block.data.embedUrl);

    return url?.toString() ?? null;
  }

  protected createAnchorHref(headingId: string): string {
    const normalizedPath = this.anchorPath.trim().replace(/\/+$/, '');

    return normalizedPath ? `${normalizedPath}#${headingId}` : `#${headingId}`;
  }

  private parseHttpUrl(value: string | undefined): URL | null {
    if (!value) {
      return null;
    }

    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
    } catch {
      return null;
    }
  }

  private createTrustedEmbedUrl(value: string | undefined): URL | null {
    const url = this.parseHttpUrl(value);

    if (!url || !this.trustedEmbedHosts.has(url.hostname)) {
      return null;
    }

    if (this.isYouTubeHost(url.hostname)) {
      return this.createYouTubeEmbedUrl(url);
    }

    return url;
  }

  private createYouTubeEmbedUrl(url: URL): URL | null {
    const videoId = this.getYouTubeVideoId(url);

    return videoId ? new URL(`https://www.youtube.com/embed/${videoId}`) : null;
  }

  private getYouTubeVideoId(url: URL): string {
    if (url.hostname === 'youtu.be') {
      return url.pathname.split('/').filter(Boolean)[0] ?? '';
    }

    if (url.pathname === '/watch') {
      return url.searchParams.get('v') ?? '';
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    const embedIndex = pathParts.findIndex(part => ['embed', 'shorts', 'live'].includes(part));

    return embedIndex >= 0 ? pathParts[embedIndex + 1] ?? '' : '';
  }

  private isYouTubeHost(hostname: string): boolean {
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(hostname);
  }

  private shouldOpenInNewTab(href: string): boolean {
    return href.length > 0 && !href.startsWith('#');
  }
}
