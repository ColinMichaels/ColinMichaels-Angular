import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  Input,
  OnChanges,
  inject,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faCheck,
  faChevronLeft,
  faChevronRight,
  faCopy,
  faDownload,
  faMagnifyingGlassPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {marked} from 'marked';

import {CatCornerEasterEggComponent} from '../../../cat-corner/components/cat-corner-easter-egg.component';
import {
  BLOG_IMAGE_LAYOUTS,
  BlogBlockData,
  BlogChartPoint,
  BlogChartType,
  BlogContentBlock,
  BlogImageLayout,
  BlogStatItem,
} from '../../models/blog-post.model';
import {createBlogHeadingIdMap} from '../../utils/blog-reading.util';
import {htmlToPlainText} from '../../utils/blog-html.util';
import {
  getTrustedBlogAppEmbedUrl,
  HEAR_THE_HOOK_EMBED_URL,
  normalizeBlogAppEmbedHeight,
} from '../../utils/blog-embed.util';
import {getBlogSunoEmbedUrls, SUNO_EMBED_HEIGHT} from '../../utils/blog-suno-embed.util';
import {BlogRichTextComponent} from '../rich-text/blog-rich-text.component';
import {BlogPollComponent} from '../poll/blog-poll.component';

interface RenderableBlogBlock {
  block: BlogContentBlock;
  safeEmbedUrl: SafeResourceUrl | null;
  externalUrl: string | null;
  isAppEmbed: boolean;
  isSunoEmbed: boolean;
  appEmbedHeight: number;
  headingId: string | null;
  textHtml: string;
  captionHtml: string;
  attributionHtml: string;
  blockHtml: string;
  itemHtml: readonly string[];
  stats: readonly RenderableBlogStat[];
  chart: RenderableBlogChart | null;
  imageAlt: string;
  galleryIndex: number | null;
}

interface RenderableBlogStat {
  label: string;
  value: string;
  caption: string;
}

interface RenderableBlogChartPoint {
  label: string;
  value: number;
  note: string;
  displayValue: string;
  magnitudePercent: number;
  x: number;
  y: number;
}

interface RenderableBlogChart {
  type: BlogChartType;
  title: string;
  unit: string;
  caption: string;
  points: readonly RenderableBlogChartPoint[];
  polyline: string;
  ariaLabel: string;
}

interface RenderableBlogImage {
  url: string;
  alt: string;
  captionHtml: string;
  captionText: string;
  downloadName: string;
}

@Component({
  selector: 'app-blog-block-renderer',
  imports: [FaIconComponent, CatCornerEasterEggComponent, BlogPollComponent, BlogRichTextComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="blog-content space-y-6 text-base leading-8 text-slate-700 dark:text-zinc-300">
      @for (row of renderedBlocks; track row.block.id) {
        @switch (row.block.type) {
          @case ('header') {
            @if (row.block.data.level === 3) {
              <h3
                [id]="row.headingId"
                class="blog-anchored-subheading clear-both group pt-4 text-xl font-semibold text-slate-950 dark:text-zinc-50"
              >
                <a
                  [href]="row.headingId ? createAnchorHref(row.headingId) : null"
                  class="inline-flex items-baseline gap-2 hover:text-cyan-800 dark:hover:text-cyan-200"
                >
                  <app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text>
                  @if (row.headingId) {
                    <span aria-hidden="true"
                          class="text-sm text-slate-400 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 dark:text-zinc-600">#</span>
                  }
                </a>
              </h3>
            } @else {
              <h2
                [id]="row.headingId"
                class="blog-section-heading clear-both group z-30 -mx-2 isolate border-b border-slate-200 bg-white px-2 py-2 text-xl font-semibold leading-tight text-slate-950 shadow-sm shadow-slate-950/5 dark:border-zinc-800 dark:bg-neutral-950 dark:text-zinc-50 dark:shadow-black/20 sm:pb-2 sm:pt-3 sm:text-2xl"
                [class.blog-sticky-section-heading]="row.headingId === activeHeadingId"
                [attr.data-sticky-active]="row.headingId === activeHeadingId ? '' : null"
                data-sticky-section-heading
              >
                <a
                  [href]="row.headingId ? createAnchorHref(row.headingId) : null"
                  class="inline-flex items-baseline gap-2 hover:text-cyan-800 dark:hover:text-cyan-200"
                >
                  <app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text>
                  @if (row.headingId) {
                    <span aria-hidden="true"
                          class="text-base text-slate-400 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 dark:text-zinc-600">#</span>
                  }
                </a>
              </h2>
            }
          }
          @case ('paragraph') {
            <p><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
          }
          @case ('quote') {
            <blockquote class="border-l-2 border-cyan-600 pl-5 text-slate-800 dark:border-cyan-300 dark:text-zinc-200">
              <p><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
              @if (row.block.data.caption) {
                <cite class="mt-2 block text-sm not-italic text-slate-500 dark:text-zinc-500"><app-blog-rich-text [html]="row.captionHtml"></app-blog-rich-text></cite>
              }
            </blockquote>
          }
          @case ('typography') {
            @switch (row.block.data.variant) {
              @case ('eyebrow') {
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
              }
              @case ('sectionIntro') {
                <p class="border-l border-sky-600/70 pl-5 text-lg leading-8 text-slate-800 dark:border-sky-300/60 dark:text-sky-50"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
              }
              @case ('pullQuote') {
                <blockquote class="my-10 border-y border-amber-500/50 py-7 text-slate-950 dark:border-amber-300/40 dark:text-zinc-100">
                  <p class="text-2xl font-semibold leading-10 sm:text-3xl"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
                  @if (row.block.data.attribution) {
                    <cite class="mt-4 block text-sm not-italic uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200"><app-blog-rich-text [html]="row.attributionHtml"></app-blog-rich-text></cite>
                  }
                </blockquote>
              }
              @case ('keyTakeaway') {
                <aside class="border border-teal-600/35 bg-teal-50 p-5 text-teal-950 dark:border-teal-300/35 dark:bg-teal-950/30 dark:text-teal-50">
                  @if (row.block.data.attribution) {
                    <p class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-200"><app-blog-rich-text [html]="row.attributionHtml"></app-blog-rich-text></p>
                  }
                  <div class="text-lg font-medium leading-8"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></div>
                </aside>
              }
              @case ('callout') {
                <aside class="border border-emerald-600/35 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-50">
                  @if (row.block.data.attribution) {
                    <p class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300"><app-blog-rich-text [html]="row.attributionHtml"></app-blog-rich-text></p>
                  }
                  <div class="leading-8"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></div>
                </aside>
              }
              @case ('warning') {
                <aside class="border border-rose-600/35 bg-rose-50 p-5 text-rose-950 dark:border-rose-300/35 dark:bg-rose-950/25 dark:text-rose-50">
                  @if (row.block.data.attribution) {
                    <p class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-rose-700 dark:text-rose-200"><app-blog-rich-text [html]="row.attributionHtml"></app-blog-rich-text></p>
                  }
                  <div class="leading-8"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></div>
                </aside>
              }
              @case ('aside') {
                <aside class="border-l border-slate-300 pl-5 text-sm leading-7 text-slate-600 dark:border-zinc-600 dark:text-zinc-400"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></aside>
              }
              @case ('caption') {
                <p class="text-sm leading-6 text-slate-500 dark:text-zinc-500"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
              }
              @default {
                <p class="text-xl leading-9 text-slate-900 dark:text-zinc-100"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
              }
            }
          }
          @case ('stats') {
            @if (row.stats.length > 0) {
              <section class="space-y-3" [attr.aria-label]="row.block.data.title || 'Statistics'">
                @if (row.block.data.title) {
                  <h3 class="text-lg font-semibold text-slate-950 dark:text-zinc-50">{{ row.block.data.title }}</h3>
                }
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  @for (stat of row.stats; track $index) {
                    <article class="border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 dark:border-zinc-800 dark:bg-zinc-950/60 dark:shadow-none">
                      <p class="text-2xl font-semibold leading-8 text-slate-950 dark:text-zinc-50">{{ stat.value }}</p>
                      <p
                        class="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">{{ stat.label }}</p>
                      @if (stat.caption) {
                        <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-zinc-500">{{ stat.caption }}</p>
                      }
                    </article>
                  }
                </div>
                @if (row.block.data.caption) {
                  <p class="text-sm leading-6 text-slate-500 dark:text-zinc-500"><app-blog-rich-text [html]="row.captionHtml"></app-blog-rich-text></p>
                }
              </section>
            }
          }
          @case ('chart') {
            @if (row.chart; as chart) {
              <section class="space-y-4" [attr.aria-label]="chart.ariaLabel">
                @if (chart.title) {
                  <h3 class="text-lg font-semibold text-slate-950 dark:text-zinc-50">{{ chart.title }}</h3>
                }
                @if (chart.type === 'line') {
                  <div class="overflow-x-auto rounded border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 dark:border-zinc-800 dark:bg-zinc-950/60 dark:shadow-none">
                    <svg
                      viewBox="0 0 100 64"
                      preserveAspectRatio="none"
                      class="h-56 min-w-[520px] w-full"
                      role="img"
                      [attr.aria-label]="chart.ariaLabel"
                    >
                      <line x1="8" y1="56" x2="96" y2="56" stroke="rgba(113,113,122,.65)" stroke-width=".6"></line>
                      <polyline
                        [attr.points]="chart.polyline"
                        fill="none"
                        stroke="#22d3ee"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></polyline>
                      @for (point of chart.points; track $index) {
                        <circle [attr.cx]="point.x" [attr.cy]="point.y" r="1.8" fill="#fef3c7" stroke="#18181b"
                                stroke-width=".8"></circle>
                      }
                    </svg>
                    <div class="mt-3 grid min-w-[520px] gap-2"
                         [style.grid-template-columns]="'repeat(' + chart.points.length + ', minmax(0, 1fr))'">
                      @for (point of chart.points; track $index) {
                        <div class="text-xs leading-5">
                          <p class="font-semibold text-slate-900 dark:text-zinc-100">{{ point.displayValue }}</p>
                          <p class="text-slate-500 dark:text-zinc-500">{{ point.label }}</p>
                          @if (point.note) {
                            <p class="text-slate-400 dark:text-zinc-600">{{ point.note }}</p>
                          }
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="space-y-4 rounded border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 dark:border-zinc-800 dark:bg-zinc-950/60 dark:shadow-none">
                    @for (point of chart.points; track $index) {
                      <div class="space-y-2">
                        <div class="flex items-baseline justify-between gap-3">
                          <p class="text-sm font-medium text-slate-700 dark:text-zinc-200">{{ point.label }}</p>
                          <p class="text-sm font-semibold text-slate-950 dark:text-zinc-50">{{ point.displayValue }}</p>
                        </div>
                        <div class="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800" aria-hidden="true">
                          <span
                            class="block h-full rounded-full bg-cyan-600 dark:bg-cyan-300"
                            [style.width.%]="point.magnitudePercent"
                          ></span>
                        </div>
                        @if (point.note) {
                          <p class="text-xs leading-5 text-slate-500 dark:text-zinc-500">{{ point.note }}</p>
                        }
                      </div>
                    }
                  </div>
                }
                @if (chart.caption) {
                  <p class="text-sm leading-6 text-slate-500 dark:text-zinc-500"><app-blog-rich-text [html]="row.captionHtml"></app-blog-rich-text></p>
                }
              </section>
            }
          }
          @case ('poll') {
            <app-blog-poll
              [block]="row.block"
              [postId]="postId"
              [postSlug]="postSlug"
              [compact]="displayMode === 'rail'"
            ></app-blog-poll>
          }
          @case ('html') {
            @if (row.block.data.html) {
              @if (row.block.data.title) {
                <h3 class="text-lg font-semibold text-slate-950 dark:text-zinc-50">{{ row.block.data.title }}</h3>
              }
              <section class="blog-custom-html"><app-blog-rich-text [html]="row.blockHtml" mode="block"></app-blog-rich-text></section>
            }
          }
          @case ('markdown') {
            @if (row.block.data.markdown) {
              <section class="blog-custom-html blog-markdown"><app-blog-rich-text [html]="row.blockHtml" mode="markdown"></app-blog-rich-text></section>
            }
          }
          @case ('list') {
            @if (row.block.data.ordered) {
              <ol class="blog-list blog-list-ordered">
                @for (item of row.itemHtml; track $index) {
                  <li class="blog-list-item blog-list-item-ordered"><app-blog-rich-text [html]="item"></app-blog-rich-text></li>
                }
              </ol>
            } @else {
              <ul class="blog-list blog-list-unordered">
                @for (item of row.itemHtml; track $index) {
                  <li class="blog-list-item blog-list-item-unordered"><app-blog-rich-text [html]="item"></app-blog-rich-text></li>
                }
              </ul>
            }
          }
          @case ('image') {
            @if (row.block.data.url) {
              <figure
                [class]="imageFigureClass(row)"
              >
                <button
                  type="button"
                  [class]="imageButtonClass(row)"
                  [attr.aria-label]="'View image full screen: ' + row.imageAlt"
                  title="View image full screen"
                  (click)="openImageLightbox(row.galleryIndex)"
                >
                  <img
                    [src]="row.block.data.url"
                    [alt]="row.imageAlt"
                    [attr.width]="row.block.data.width || null"
                    [attr.height]="row.block.data.height || null"
                    [class]="imageClass(row)"
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
                  <figcaption [class]="imageCaptionClass(row)"><app-blog-rich-text [html]="row.captionHtml"></app-blog-rich-text></figcaption>
                }
              </figure>
            }
          }
          @case ('embed') {
            @if (row.safeEmbedUrl) {
              @if (row.isAppEmbed) {
                <figure class="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-lg shadow-slate-950/10 dark:border-zinc-800 dark:shadow-black/30">
                  <iframe
                    [src]="row.safeEmbedUrl"
                    [title]="row.block.data.caption || fallbackAlt"
                    [style.height.px]="row.appEmbedHeight"
                    [attr.data-app-embed-id]="row.block.id"
                    class="block w-full bg-slate-950"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; clipboard-read 'none'; clipboard-write 'none'; fullscreen 'none'"
                    referrerpolicy="strict-origin-when-cross-origin"
                  ></iframe>
                  <div class="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
                    @if (row.block.data.caption) {
                      <figcaption class="text-sm text-zinc-400"><app-blog-rich-text [html]="row.captionHtml"></app-blog-rich-text></figcaption>
                    }
                    <a
                      [href]="row.externalUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300 hover:text-cyan-100"
                    >Open interactive app</a>
                  </div>
                </figure>
              } @else if (row.isSunoEmbed) {
                <figure class="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-lg shadow-slate-950/10 dark:border-zinc-800 dark:shadow-black/30">
                  <iframe
                    [src]="row.safeEmbedUrl"
                    [title]="row.block.data.caption || 'Suno song player'"
                    [style.height.px]="sunoEmbedHeight"
                    class="block w-full bg-slate-950"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowfullscreen
                    referrerpolicy="no-referrer-when-downgrade"
                  ></iframe>
                  <div class="flex min-h-11 flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2">
                    @if (row.block.data.caption) {
                      <figcaption class="text-sm text-zinc-400"><app-blog-rich-text [html]="row.captionHtml"></app-blog-rich-text></figcaption>
                    }
                    <a
                      [href]="row.externalUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                    >Listen on Suno</a>
                  </div>
                </figure>
              } @else {
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
                    <figcaption class="text-sm text-zinc-500"><app-blog-rich-text [html]="row.captionHtml"></app-blog-rich-text></figcaption>
                  }
                </figure>
              }
            } @else if (row.externalUrl) {
              <p>
                <a [href]="row.externalUrl" target="_blank" rel="noopener noreferrer" class="blog-inline-link">
                  <app-blog-rich-text [html]="row.captionHtml || row.externalUrl"></app-blog-rich-text>
                </a>
              </p>
            }
          }
          @case ('code') {
            <figure class="overflow-hidden rounded border border-slate-200 bg-slate-950 text-zinc-100 shadow-sm dark:border-zinc-800">
              <figcaption class="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-4 py-2">
                <span class="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  {{ formatCodeLanguageLabel(row.block.data.language) }}
                </span>
                <button
                  type="button"
                  class="inline-flex shrink-0 items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-cyan-200 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="!row.block.data.code"
                  [attr.aria-label]="getCodeCopyLabel(row.block)"
                  (click)="copyCodeBlock(row.block)"
                  data-testid="blog-code-copy"
                >
                  <fa-icon [icon]="isCodeBlockCopied(row.block.id) ? faCheck : faCopy"></fa-icon>
                  <span aria-live="polite">{{ isCodeBlockCopied(row.block.id) ? 'Copied' : 'Copy' }}</span>
                </button>
              </figcaption>
              <pre class="m-0 max-w-full overflow-x-hidden whitespace-pre-wrap break-words p-4 text-sm leading-6 text-cyan-100"><code class="break-words [overflow-wrap:anywhere]" [attr.data-language]="row.block.data.language || null">{{ row.block.data.code }}</code></pre>
            </figure>
          }
          @case ('delimiter') {
            <hr class="border-slate-200 dark:border-zinc-800">
          }
          @case ('catCornerUnlock') {
            <div class="clear-both py-2" data-testid="cat-corner-unlock-block">
              <app-cat-corner-easter-egg></app-cat-corner-easter-egg>
            </div>
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
              class="pointer-events-auto h-auto max-h-[calc(100vh-8rem)] w-auto max-w-full rounded object-contain shadow-2xl shadow-black/50"
              decoding="async"
              data-testid="blog-lightbox-image"
            >
          </div>

          <footer class="pointer-events-auto mx-auto max-w-4xl text-center">
            @if (image.captionText) {
              <p class="text-sm leading-6 text-zinc-300"><app-blog-rich-text [html]="image.captionHtml"></app-blog-rich-text></p>
            } @else {
              <p class="sr-only">{{ image.alt }}</p>
            }
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .blog-anchored-subheading,
    .blog-section-heading {
      scroll-margin-top: calc(var(--blog-sticky-stack-height) + env(safe-area-inset-top));
    }

    .blog-section-heading.blog-sticky-section-heading {
      font-size: clamp(.95rem, calc(1rem * var(--reader-font-scale)), 1.35rem) !important;
      line-height: 1.3 !important;
      padding-bottom: .375rem;
      padding-top: .375rem;
      position: sticky;
      top: calc(var(--blog-sticky-stack-height) + env(safe-area-inset-top));
    }

    @media (min-width: 640px) {
      .blog-section-heading.blog-sticky-section-heading {
        font-size: clamp(1rem, calc(1.125rem * var(--reader-font-scale)), 1.5rem) !important;
      }
    }

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

    :host-context(.light) ::ng-deep .blog-inline-link {
      border-color: rgba(8, 145, 178, 0.6);
      color: #0e7490;
    }

    :host-context(.light) ::ng-deep .blog-inline-link:hover,
    :host-context(.light) ::ng-deep .blog-inline-link:focus-visible {
      background: rgba(8, 145, 178, 0.1);
      border-color: #0f172a;
      color: #0f172a;
    }

    .blog-list {
      --blog-list-bullet-color: #fbbf24;
      --blog-list-bullet-ring: rgba(251, 191, 36, 0.22);
      --blog-list-number-bg: rgba(8, 145, 178, 0.22);
      --blog-list-number-border: rgba(103, 232, 249, 0.38);
      --blog-list-number-color: #67e8f9;
      display: grid;
      gap: .85rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    :host-context(.light) .blog-list {
      --blog-list-bullet-color: #0891b2;
      --blog-list-bullet-ring: rgba(8, 145, 178, 0.14);
      --blog-list-number-bg: rgba(8, 145, 178, 0.12);
      --blog-list-number-border: rgba(8, 145, 178, 0.28);
      --blog-list-number-color: #0e7490;
    }

    .blog-list-ordered {
      counter-reset: blog-list-item;
    }

    .blog-list-item {
      line-height: 1.85;
      padding-left: 3rem;
      position: relative;
    }

    .blog-list-item-ordered {
      counter-increment: blog-list-item;
    }

    .blog-list-item-ordered::before {
      align-items: center;
      background: var(--blog-list-number-bg);
      border: 1px solid var(--blog-list-number-border);
      border-radius: 999px;
      color: var(--blog-list-number-color);
      content: counter(blog-list-item);
      display: inline-flex;
      font-size: 1.05rem;
      font-weight: 800;
      height: 2rem;
      justify-content: center;
      left: 0;
      line-height: 1;
      min-width: 2rem;
      padding: 0 .45rem;
      position: absolute;
      top: .15rem;
    }

    .blog-list-item-unordered::before {
      background: var(--blog-list-bullet-color);
      border-radius: 999px;
      box-shadow: 0 0 0 .3rem var(--blog-list-bullet-ring);
      content: '';
      height: .72rem;
      left: .65rem;
      position: absolute;
      top: .82rem;
      width: .72rem;
    }

    @media (min-width: 640px) {
      .blog-list-item {
        padding-left: 3.35rem;
      }
    }

    :host ::ng-deep .blog-custom-html {
      color: #d4d4d8;
      line-height: 1.75;
      overflow-x: auto;
    }

    :host-context(.light) ::ng-deep .blog-custom-html {
      color: #334155;
    }

    :host ::ng-deep .blog-custom-html :where(h2, h3, h4, h5, h6) {
      color: #fafafa;
      font-weight: 700;
      line-height: 1.25;
      margin: 1.5rem 0 .75rem;
    }

    :host-context(.light) ::ng-deep .blog-custom-html :where(h2, h3, h4, h5, h6) {
      color: #0f172a;
    }

    :host ::ng-deep .blog-custom-html :where(p, ul, ol, table, figure, blockquote, pre) {
      margin: 1rem 0;
    }

    :host ::ng-deep .blog-custom-html :where(ul, ol) {
      padding-left: 2.25rem;
    }

    :host ::ng-deep .blog-custom-html ul {
      list-style: disc;
    }

    :host ::ng-deep .blog-custom-html ol {
      list-style: decimal;
    }

    :host ::ng-deep .blog-custom-html :where(li) {
      margin: .45rem 0;
      padding-left: .35rem;
    }

    :host ::ng-deep .blog-custom-html ol li::marker {
      color: #67e8f9;
      font-size: 1.18em;
      font-weight: 800;
    }

    :host ::ng-deep .blog-custom-html ul li::marker {
      color: #fbbf24;
      font-size: 1.25em;
    }

    :host-context(.light) ::ng-deep .blog-custom-html ol li::marker,
    :host-context(.light) ::ng-deep .blog-custom-html ul li::marker {
      color: #0e7490;
    }

    :host ::ng-deep .blog-custom-html :where(img, svg) {
      display: block;
      height: auto;
      max-width: 100%;
    }

    :host ::ng-deep .blog-custom-html table {
      border-collapse: collapse;
      min-width: 100%;
    }

    :host ::ng-deep .blog-custom-html :where(th, td) {
      border: 1px solid #3f3f46;
      padding: .65rem .75rem;
      text-align: left;
      vertical-align: top;
    }

    :host-context(.light) ::ng-deep .blog-custom-html :where(th, td) {
      border-color: #cbd5e1;
    }

    :host ::ng-deep .blog-custom-html th {
      background: #18181b;
      color: #fafafa;
      font-weight: 700;
    }

    :host-context(.light) ::ng-deep .blog-custom-html th {
      background: #f1f5f9;
      color: #0f172a;
    }

    :host ::ng-deep .blog-custom-html blockquote {
      border-left: 2px solid #22d3ee;
      color: #e4e4e7;
      padding-left: 1rem;
    }

    :host-context(.light) ::ng-deep .blog-custom-html blockquote {
      border-left-color: #0891b2;
      color: #1e293b;
    }

    :host ::ng-deep .blog-custom-html pre {
      background: #000;
      color: #cffafe;
      overflow-x: auto;
      padding: 1rem;
    }
  `],
})
export class BlogBlockRendererComponent implements OnChanges, OnDestroy {
  @Input() blocks: readonly BlogContentBlock[] = [];
  @Input() fallbackAlt = 'Blog content';
  @Input() postId = '';
  @Input() postSlug = '';
  @Input() displayMode: 'article' | 'rail' = 'article';
  @Input() anchorPath = '';
  @Input() activeHeadingId: string | null = null;

  protected renderedBlocks: readonly RenderableBlogBlock[] = [];
  protected imageGallery: readonly RenderableBlogImage[] = [];
  protected activeImageIndex: number | null = null;
  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faCheck = faCheck;
  protected readonly faCopy = faCopy;
  protected readonly faDownload = faDownload;
  protected readonly faMagnifyingGlassPlus = faMagnifyingGlassPlus;
  protected readonly faXmark = faXmark;
  protected readonly sunoEmbedHeight = SUNO_EMBED_HEIGHT;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly imageLayoutSet = new Set<string>(BLOG_IMAGE_LAYOUTS);
  private readonly copiedCodeBlockIds = new Set<string>();
  private readonly codeCopyTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly copyFeedbackDurationMs = 2000;
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
      const captionHtml = block.data.caption ?? '';
      const imageAlt = this.createImageAlt(block);
      const sunoUrls = getBlogSunoEmbedUrls(block.data.embedUrl ?? block.data.url);
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
        isAppEmbed: getTrustedBlogAppEmbedUrl(block.data.embedUrl ?? block.data.url) !== null,
        isSunoEmbed: sunoUrls !== null,
        appEmbedHeight: normalizeBlogAppEmbedHeight(block.data.height),
        headingId: headingIdMap.get(block.id) ?? null,
        textHtml: block.data.text ?? '',
        captionHtml,
        attributionHtml: block.data.attribution ?? '',
        blockHtml: block.type === 'markdown'
          ? marked.parse(block.data.markdown ?? '', {async: false})
          : block.data.html ?? '',
        itemHtml: block.data.items ?? [],
        stats: this.createStats(block.data.stats),
        chart: this.createChart(block),
        imageAlt,
        galleryIndex,
      };
    });
    this.imageGallery = imageGallery;

    if (this.activeImageIndex !== null && !this.imageGallery[this.activeImageIndex]) {
      this.closeImageLightbox();
    }
  }

  ngOnDestroy(): void {
    for (const timer of this.codeCopyTimers.values()) {
      clearTimeout(timer);
    }

    this.codeCopyTimers.clear();
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

  protected formatCodeLanguageLabel(language: string | undefined): string {
    const normalizedLanguage = language?.trim();

    return normalizedLanguage ? normalizedLanguage.toUpperCase() : 'Code';
  }

  protected isCodeBlockCopied(blockId: string): boolean {
    return this.copiedCodeBlockIds.has(blockId);
  }

  protected getCodeCopyLabel(block: BlogContentBlock): string {
    const state = this.isCodeBlockCopied(block.id) ? 'Copied' : 'Copy';
    const language = block.data.language?.trim();

    return language ? `${state} ${language.toLowerCase()} code block` : `${state} code block`;
  }

  protected async copyCodeBlock(block: BlogContentBlock): Promise<void> {
    const code = block.data.code ?? '';

    if (!code) {
      return;
    }

    try {
      await this.writeClipboardText(code);
      this.markCodeBlockCopied(block.id);
    } catch {
      return;
    }
  }

  protected openImageLightbox(galleryIndex: number | null): void {
    if (galleryIndex === null || !this.imageGallery[galleryIndex]) {
      return;
    }

    this.activeImageIndex = galleryIndex;
  }

  protected imageFigureClass(row: RenderableBlogBlock): string {
    const layout = this.getImageLayout(row.block.data);
    const frameClass = row.block.data.withBackground ? ' rounded bg-slate-100 p-4 dark:bg-zinc-900' : '';

    switch (layout) {
      case 'inlineStart':
        return `blog-image-reveal space-y-2 sm:float-left sm:clear-left sm:mb-4 sm:mr-6 sm:mt-1 sm:w-72${frameClass}`;
      case 'inlineEnd':
        return `blog-image-reveal space-y-2 sm:float-right sm:clear-right sm:mb-4 sm:ml-6 sm:mt-1 sm:w-72${frameClass}`;
      case 'contained':
        return `blog-image-reveal clear-both space-y-2${frameClass}`;
      case 'fullWidth':
        return `blog-image-reveal clear-both space-y-2${frameClass}`;
    }
  }

  protected imageButtonClass(row: RenderableBlogBlock): string {
    const layout = this.getImageLayout(row.block.data);
    const baseClass = 'group relative block cursor-zoom-in overflow-hidden rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300';

    switch (layout) {
      case 'inlineStart':
      case 'inlineEnd':
      case 'fullWidth':
        return `${baseClass} w-full`;
      case 'contained':
        return `${baseClass} mx-auto w-fit max-w-full`;
    }
  }

  protected imageClass(row: RenderableBlogBlock): string {
    const layout = this.getImageLayout(row.block.data);
    const borderClass = row.block.data.withBorder ? ' border border-slate-300 dark:border-zinc-700' : '';
    const layoutClass = layout === 'contained' ? ' mx-auto max-w-full' : ' w-full';

    return `h-auto max-h-[72vh] rounded object-contain transition duration-200 group-hover:scale-[1.01] group-focus-visible:scale-[1.01]${layoutClass}${borderClass}`;
  }

  protected imageCaptionClass(row: RenderableBlogBlock): string {
    const layout = this.getImageLayout(row.block.data);
    const widthClass = layout === 'contained' ? ' mx-auto max-w-full' : '';

    return `text-sm leading-6 text-slate-500 dark:text-zinc-500${widthClass}`;
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

  @HostListener('window:message', ['$event'])
  protected handleAppEmbedMessage(event: MessageEvent<unknown>): void {
    const trustedOrigin = new URL(HEAR_THE_HOOK_EMBED_URL).origin;

    if (event.origin !== trustedOrigin || !this.isAppEmbedResizeMessage(event.data)) {
      return;
    }

    const frame = Array.from(this.host.nativeElement.querySelectorAll<HTMLIFrameElement>('iframe[data-app-embed-id]'))
      .find(candidate => candidate.contentWindow === event.source);
    const blockId = frame?.dataset['appEmbedId'];
    const row = this.renderedBlocks.find(candidate => candidate.block.id === blockId && candidate.isAppEmbed);
    const rowUrl = getTrustedBlogAppEmbedUrl(row?.externalUrl ?? undefined);

    if (!row || rowUrl?.origin !== trustedOrigin) {
      return;
    }

    row.appEmbedHeight = normalizeBlogAppEmbedHeight(event.data.height);
    this.cdr.markForCheck();
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

  private createStats(stats: readonly BlogStatItem[] | undefined): readonly RenderableBlogStat[] {
    return (stats ?? [])
      .map(item => ({
        label: item.label.trim(),
        value: item.value.trim(),
        caption: item.caption?.trim() ?? '',
      }))
      .filter(item => item.label.length > 0 || item.value.length > 0);
  }

  private createChart(block: BlogContentBlock): RenderableBlogChart | null {
    if (block.type !== 'chart') {
      return null;
    }

    const points = this.createChartPoints(block.data.chartPoints, block.data.unit);

    if (points.length === 0) {
      return null;
    }

    const title = block.data.title?.trim() ?? '';
    const caption = this.createPlainText(block.data.caption);
    const type = block.data.chartType ?? 'bar';
    const polyline = points.map(point => `${point.x},${point.y}`).join(' ');

    return {
      type,
      title,
      unit: block.data.unit?.trim() ?? '',
      caption,
      points,
      polyline,
      ariaLabel: this.createChartAriaLabel(title, type, points),
    };
  }

  private createChartPoints(
    chartPoints: readonly BlogChartPoint[] | undefined,
    unit: string | undefined
  ): readonly RenderableBlogChartPoint[] {
    const points = (chartPoints ?? []).filter(point => Number.isFinite(point.value));

    if (points.length === 0) {
      return [];
    }

    const values = points.map(point => point.value);
    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    const maxMagnitude = Math.max(...values.map(value => Math.abs(value)), 1);
    const xStep = points.length > 1 ? 88 / (points.length - 1) : 0;

    return points.map((point, index) => ({
      label: point.label.trim() || `Point ${index + 1}`,
      value: point.value,
      note: point.note?.trim() ?? '',
      displayValue: this.formatChartValue(point.value, unit),
      magnitudePercent: this.clampPercent(Math.abs(point.value) / maxMagnitude * 100),
      x: points.length > 1 ? 8 + xStep * index : 52,
      y: 56 - ((point.value - minValue) / valueRange * 48),
    }));
  }

  private formatChartValue(value: number, unit: string | undefined): string {
    const formattedValue = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
    }).format(value);
    const normalizedUnit = unit?.trim();

    return normalizedUnit ? `${formattedValue} ${normalizedUnit}` : formattedValue;
  }

  private createChartAriaLabel(
    title: string,
    type: BlogChartType,
    points: readonly RenderableBlogChartPoint[]
  ): string {
    const chartTitle = title || `${type === 'line' ? 'Line' : 'Bar'} chart`;
    const pointSummary = points
      .map(point => `${point.label}: ${point.displayValue}`)
      .join(', ');

    return `${chartTitle}. ${pointSummary}`;
  }

  private clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private createPlainText(value: string | undefined): string {
    return htmlToPlainText(this.host.nativeElement.ownerDocument, value);
  }

  private createImageAlt(block: BlogContentBlock): string {
    return block.data.alt?.trim() || this.fallbackAlt.trim() || 'Blog content image';
  }

  private getImageLayout(data: BlogBlockData): BlogImageLayout {
    if (data.imageLayout && this.imageLayoutSet.has(data.imageLayout)) {
      return data.imageLayout;
    }

    return data.stretched ? 'fullWidth' : 'contained';
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

  private async writeClipboardText(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        this.writeClipboardTextWithFallback(value);
        return;
      }
    }

    this.writeClipboardTextWithFallback(value);
  }

  private writeClipboardTextWithFallback(value: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.readOnly = true;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.append(textarea);
    textarea.select();

    try {
      const didCopy = document.execCommand('copy');

      if (!didCopy) {
        throw new Error('Copy command was not accepted.');
      }
    } finally {
      textarea.remove();
    }
  }

  private markCodeBlockCopied(blockId: string): void {
    const existingTimer = this.codeCopyTimers.get(blockId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.copiedCodeBlockIds.add(blockId);
    this.cdr.markForCheck();

    const timer = setTimeout(() => {
      this.copiedCodeBlockIds.delete(blockId);
      this.codeCopyTimers.delete(blockId);
      this.cdr.markForCheck();
    }, this.copyFeedbackDurationMs);

    this.codeCopyTimers.set(blockId, timer);
  }

  private createSafeEmbedUrl(block: BlogContentBlock): SafeResourceUrl | null {
    if (block.type !== 'embed') {
      return null;
    }

    const value = block.data.embedUrl ?? block.data.url;
    const appUrl = getTrustedBlogAppEmbedUrl(value);
    const sunoUrl = getBlogSunoEmbedUrls(value)?.embedUrl ?? null;
    const url = appUrl ?? sunoUrl ?? this.createTrustedEmbedUrl(value);

    if (
      !url
      || url.protocol !== 'https:'
      || (!appUrl && !sunoUrl && !this.trustedEmbedHosts.has(url.hostname))
    ) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(url.toString());
  }

  private createExternalUrl(block: BlogContentBlock): string | null {
    const value = block.data.url ?? block.data.embedUrl;
    const sunoUrl = getBlogSunoEmbedUrls(value)?.songUrl;
    const url = sunoUrl ?? this.parseHttpUrl(value);

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

  private isAppEmbedResizeMessage(value: unknown): value is {type: 'hear-the-hook:resize'; height: number} {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const message = value as Record<string, unknown>;

    return message['type'] === 'hear-the-hook:resize'
      && typeof message['height'] === 'number'
      && Number.isFinite(message['height']);
  }

}
