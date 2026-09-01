import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  ChangeDetectionStrategy,
  HostListener,
  ViewChild,
} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
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
  BLOG_IMAGE_SIZES,
  BlogBlockData,
  BlogContentBlock,
  BlogGalleryImage,
  BlogGalleryLayout,
  BlogImageLayout,
  BlogImageSize,
  BlogListItem,
  BlogListPresentation,
  BlogListStyle,
  BlogStatItem,
} from '../../models/blog-post.model';
import {
  BLOG_QUICK_SUMMARY_DESCRIPTION,
  BLOG_QUICK_SUMMARY_LABEL,
  createBlogHeadingIdMap,
  isBlogQuickSummaryHeading,
} from '../../utils/blog-reading.util';
import {htmlToPlainText} from '../../utils/blog-html.util';
import {normalizeBlogImageUrl} from '../../utils/blog-image-url.util';
import {
  getTrustedBlogAppEmbedUrl,
  HEAR_THE_HOOK_EMBED_URL,
  normalizeBlogAppEmbedHeight,
} from '../../utils/blog-embed.util';
import {getBlogSunoEmbedUrls, SUNO_EMBED_HEIGHT} from '../../utils/blog-suno-embed.util';
import {BlogChartComponent} from '../chart/blog-chart.component';
import {BlogGalleryComponent} from '../gallery/blog-gallery.component';
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
  quickSummaryTooltipId: string | null;
  textHtml: string;
  captionHtml: string;
  attributionHtml: string;
  blockHtml: string;
  itemHtml: readonly string[];
  hasStructuredList: boolean;
  listItems: readonly RenderableBlogListItem[];
  listStyle: BlogListStyle;
  listPresentation: BlogListPresentation;
  listStart: number;
  listCounterType: BlogListCounterType;
  stats: readonly RenderableBlogStat[];
  imageAlt: string;
  imageUrl: string;
  galleryIndex: number | null;
  galleryImages: readonly BlogGalleryImage[];
  galleryLayout: BlogGalleryLayout;
  galleryStartIndex: number | null;
  imageLoadFailed: boolean;
}

interface RenderableBlogListItem {
  contentHtml: string;
  checked: boolean;
  start: number;
  counterType: BlogListCounterType;
  items: readonly RenderableBlogListItem[];
}

type BlogListCounterType = 'numeric' | 'lower-roman' | 'upper-roman' | 'lower-alpha' | 'upper-alpha';

interface RenderableBlogStat {
  label: string;
  value: string;
  caption: string;
}

interface RenderableBlogImage {
  url: string;
  alt: string;
  captionHtml: string;
  captionText: string;
  downloadName: string;
  loadFailed: boolean;
}

interface LightboxBodyStyleState {
  overflow: string;
  overscrollBehavior: string;
  paddingRight: string;
}

@Component({
  selector: 'app-blog-block-renderer',
  imports: [
    NgTemplateOutlet,
    FaIconComponent,
    CatCornerEasterEggComponent,
    BlogChartComponent,
    BlogGalleryComponent,
    BlogPollComponent,
    BlogRichTextComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template
      #recursiveList
      let-items
      let-style="style"
      let-depth="depth"
      let-presentation="presentation"
      let-start="start"
      let-counterType="counterType"
    >
      @if (style === 'ordered') {
        <ol
          class="blog-list blog-list-ordered"
          [class.blog-list-nested]="depth > 0"
          [class.blog-list-steps]="depth === 0 && presentation === 'steps'"
          [class.blog-list-counter-lower-roman]="counterType === 'lower-roman'"
          [class.blog-list-counter-upper-roman]="counterType === 'upper-roman'"
          [class.blog-list-counter-lower-alpha]="counterType === 'lower-alpha'"
          [class.blog-list-counter-upper-alpha]="counterType === 'upper-alpha'"
          [attr.data-list-depth]="depth"
          [attr.data-list-presentation]="depth === 0 ? presentation : null"
          [attr.start]="start !== 1 ? start : null"
          [attr.type]="listCounterTypeAttribute(counterType)"
          [attr.aria-label]="depth === 0 && presentation === 'steps' ? 'Steps' : null"
          [style.--blog-list-counter-start]="start - 1"
          role="list"
        >
          @for (item of items; track $index) {
            <li
              class="blog-list-item blog-list-item-ordered"
              [class.blog-list-item-steps]="depth === 0 && presentation === 'steps'"
            >
              <app-blog-rich-text [html]="item.contentHtml"></app-blog-rich-text>
              @if (item.items.length > 0) {
                <ng-container
                  [ngTemplateOutlet]="recursiveList"
                  [ngTemplateOutletContext]="{
                    $implicit: item.items,
                    style: style,
                    depth: depth + 1,
                    presentation: 'standard',
                    start: item.start,
                    counterType: item.counterType
                  }"
                ></ng-container>
              }
            </li>
          }
        </ol>
      } @else if (style === 'checklist') {
        <ul
          class="blog-list blog-list-checklist"
          [class.blog-list-nested]="depth > 0"
          [attr.data-list-depth]="depth"
          [attr.data-list-presentation]="depth === 0 ? 'standard' : null"
          [attr.aria-label]="depth === 0 ? 'Checklist' : null"
          role="list"
        >
          @for (item of items; track $index) {
            <li class="blog-list-item blog-list-item-checklist">
              <span class="blog-list-checkline">
                <input
                  type="checkbox"
                  class="blog-list-checkbox"
                  [checked]="item.checked"
                  [attr.aria-label]="item.checked ? 'Completed checklist item' : 'Incomplete checklist item'"
                  disabled
                >
                <app-blog-rich-text [html]="item.contentHtml"></app-blog-rich-text>
              </span>
              @if (item.items.length > 0) {
                <ng-container
                  [ngTemplateOutlet]="recursiveList"
                  [ngTemplateOutletContext]="{
                    $implicit: item.items,
                    style: style,
                    depth: depth + 1,
                    presentation: 'standard',
                    start: item.start,
                    counterType: item.counterType
                  }"
                ></ng-container>
              }
            </li>
          }
        </ul>
      } @else {
        <ul
          class="blog-list blog-list-unordered"
          [class.blog-list-nested]="depth > 0"
          [attr.data-list-depth]="depth"
          [attr.data-list-presentation]="depth === 0 ? 'standard' : null"
          role="list"
        >
          @for (item of items; track $index) {
            <li class="blog-list-item blog-list-item-unordered">
              <app-blog-rich-text [html]="item.contentHtml"></app-blog-rich-text>
              @if (item.items.length > 0) {
                <ng-container
                  [ngTemplateOutlet]="recursiveList"
                  [ngTemplateOutletContext]="{
                    $implicit: item.items,
                    style: style,
                    depth: depth + 1,
                    presentation: 'standard',
                    start: item.start,
                    counterType: item.counterType
                  }"
                ></ng-container>
              }
            </li>
          }
        </ul>
      }
    </ng-template>

    <section
      class="blog-content space-y-6 text-base leading-8 text-slate-700 dark:text-zinc-300"
      [attr.inert]="activeImage ? '' : null"
      [attr.aria-hidden]="activeImage ? 'true' : null"
    >
      @for (row of renderedBlocks; track row.block.id) {
        @switch (row.block.type) {
          @case ('header') {
            @if (row.block.data.level === 3) {
              <h3
                [id]="row.headingId"
                class="blog-article-heading blog-anchored-subheading relative clear-both group"
              >
                <a
                  [href]="row.headingId ? createAnchorHref(row.headingId) : null"
                  class="blog-heading-anchor hover:text-cyan-800 dark:hover:text-cyan-200"
                  [attr.aria-describedby]="row.quickSummaryTooltipId"
                >
                  <app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text>
                  @if (row.headingId) {
                    <span aria-hidden="true" class="blog-heading-hash">#</span>
                  }
                </a>
                @if (row.quickSummaryTooltipId) {
                  <span
                    [id]="row.quickSummaryTooltipId"
                    class="blog-quick-summary-tooltip"
                    role="tooltip"
                  >{{ quickSummaryDescription }}</span>
                }
              </h3>
            } @else {
              <h2
                [id]="row.headingId"
                class="blog-article-heading blog-section-heading relative clear-both group z-30 isolate"
                [class.blog-sticky-section-heading]="row.headingId === activeHeadingId"
                [attr.data-sticky-active]="row.headingId === activeHeadingId ? '' : null"
                data-sticky-section-heading
              >
                <a
                  [href]="row.headingId ? createAnchorHref(row.headingId) : null"
                  class="blog-heading-anchor hover:text-cyan-800 dark:hover:text-cyan-200"
                  [attr.aria-describedby]="row.quickSummaryTooltipId"
                >
                  <app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text>
                  @if (row.headingId) {
                    <span aria-hidden="true" class="blog-heading-hash">#</span>
                  }
                </a>
                @if (row.quickSummaryTooltipId) {
                  <span
                    [id]="row.quickSummaryTooltipId"
                    class="blog-quick-summary-tooltip"
                    role="tooltip"
                  >{{ quickSummaryDescription }}</span>
                }
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
                <p class="blog-type-eyebrow font-semibold uppercase text-cyan-700 dark:text-cyan-300"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
              }
              @case ('sectionIntro') {
                <p class="blog-type-section-intro border-l border-sky-600/70 pl-5 text-slate-800 dark:border-sky-300/60 dark:text-sky-50"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
              }
              @case ('pullQuote') {
                <blockquote class="blog-type-pull-quote my-10 border-y border-amber-500/50 py-7 text-slate-950 dark:border-amber-300/40 dark:text-zinc-100">
                  <p class="blog-type-pull-quote-copy font-semibold"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
                  @if (row.block.data.attribution) {
                    <cite class="blog-type-attribution mt-4 block not-italic uppercase text-amber-700 dark:text-amber-200"><app-blog-rich-text [html]="row.attributionHtml"></app-blog-rich-text></cite>
                  }
                </blockquote>
              }
              @case ('keyTakeaway') {
                <aside class="border border-teal-600/35 bg-teal-50 p-5 text-teal-950 dark:border-teal-300/35 dark:bg-teal-950/30 dark:text-teal-50">
                  @if (row.block.data.attribution) {
                    <p class="blog-type-attribution mb-2 font-semibold uppercase text-teal-700 dark:text-teal-200"><app-blog-rich-text [html]="row.attributionHtml"></app-blog-rich-text></p>
                  }
                  <div class="blog-type-key-takeaway font-medium"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></div>
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
                <aside class="blog-type-aside border-l border-slate-300 pl-5 text-slate-600 dark:border-zinc-600 dark:text-zinc-400"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></aside>
              }
              @case ('caption') {
                <p class="blog-type-caption text-slate-500 dark:text-zinc-500"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
              }
              @default {
                <p class="blog-type-lead text-slate-900 dark:text-zinc-100"><app-blog-rich-text [html]="row.textHtml"></app-blog-rich-text></p>
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
            <app-blog-chart [block]="row.block"></app-blog-chart>
          }
          @case ('poll') {
            <app-blog-poll
              [block]="row.block"
              [postId]="postId"
              [postSlug]="postSlug"
              [compact]="displayMode === 'rail'"
              [readOnly]="previewMode"
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
            @if (row.hasStructuredList) {
              <ng-container
                [ngTemplateOutlet]="recursiveList"
                [ngTemplateOutletContext]="{
                  $implicit: row.listItems,
                  style: row.listStyle,
                  depth: 0,
                  presentation: row.listPresentation,
                  start: row.listStart,
                  counterType: row.listCounterType
                }"
              ></ng-container>
            } @else if (row.block.data.ordered) {
              <ol
                class="blog-list blog-list-ordered"
                [class.blog-list-steps]="row.listPresentation === 'steps'"
                [attr.data-list-presentation]="row.listPresentation"
                [attr.aria-label]="row.listPresentation === 'steps' ? 'Steps' : null"
                [style.--blog-list-counter-start]="0"
                role="list"
              >
                @for (item of row.itemHtml; track $index) {
                  <li
                    class="blog-list-item blog-list-item-ordered"
                    [class.blog-list-item-steps]="row.listPresentation === 'steps'"
                  ><app-blog-rich-text [html]="item"></app-blog-rich-text></li>
                }
              </ol>
            } @else {
              <ul class="blog-list blog-list-unordered" data-list-presentation="standard" role="list">
                @for (item of row.itemHtml; track $index) {
                  <li class="blog-list-item blog-list-item-unordered"><app-blog-rich-text [html]="item"></app-blog-rich-text></li>
                }
              </ul>
            }
          }
          @case ('image') {
            @if (row.imageUrl) {
              <figure
                [class]="imageFigureClass(row)"
                [attr.data-image-layout]="imageLayout(row)"
                [attr.data-image-size]="imageSize(row) || 'automatic'"
              >
                @if (row.imageLoadFailed) {
                  <div
                    class="blog-image-unavailable"
                    role="status"
                    data-testid="blog-image-unavailable"
                  >
                    <span class="font-semibold">Image unavailable</span>
                    <span>{{ row.imageAlt }}</span>
                  </div>
                } @else {
                  <button
                    type="button"
                    [class]="imageButtonClass(row)"
                    [attr.aria-label]="'View image full screen: ' + row.imageAlt"
                    title="View image full screen"
                    (click)="openImageLightbox(row.galleryIndex)"
                  >
                    <img
                      [src]="row.imageUrl"
                      [alt]="row.imageAlt"
                      [attr.width]="positiveImageDimension(row.block.data.width)"
                      [attr.height]="positiveImageDimension(row.block.data.height)"
                      [class]="imageClass(row)"
                      loading="lazy"
                      decoding="async"
                      (error)="handleImageLoadError(row)"
                    >
                    <span
                      aria-hidden="true"
                      class="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-sm text-zinc-50 opacity-0 shadow-lg shadow-black/30 transition group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <fa-icon [icon]="faMagnifyingGlassPlus"></fa-icon>
                    </span>
                  </button>
                }
                @if (row.block.data.caption) {
                  <figcaption [class]="imageCaptionClass()"><app-blog-rich-text [html]="row.captionHtml"></app-blog-rich-text></figcaption>
                }
              </figure>
            }
          }
          @case ('gallery') {
            @if (row.galleryImages.length > 0) {
              <app-blog-gallery
                [images]="row.galleryImages"
                [layout]="row.galleryLayout"
                [title]="row.block.data.title || ''"
                [caption]="row.block.data.caption || ''"
                [fallbackAlt]="fallbackAlt"
                [lightboxStartIndex]="row.galleryStartIndex || 0"
                (imageOpen)="openImageLightbox($event, row.galleryStartIndex, row.galleryImages.length)"
              ></app-blog-gallery>
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
        #lightboxDialog
        class="fixed inset-0 z-[100] bg-black/92 p-4 text-zinc-100 backdrop-blur-sm sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="blog-lightbox-title"
        [attr.aria-describedby]="image.captionText ? 'blog-lightbox-caption' : null"
        tabindex="-1"
        data-testid="blog-lightbox-dialog"
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
            <p id="blog-lightbox-title" class="text-sm font-medium text-zinc-300" aria-live="polite">
              Image {{ activeImagePositionLabel }}
            </p>
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
            @if (image.loadFailed) {
              <div class="blog-lightbox-unavailable" role="status" data-testid="blog-lightbox-unavailable">
                <span class="font-semibold">Image unavailable</span>
                <span>{{ image.alt }}</span>
              </div>
            } @else {
              <img
                [src]="image.url"
                [alt]="image.alt"
                class="pointer-events-auto h-auto max-h-[calc(100vh-8rem)] w-auto max-w-full rounded object-contain shadow-2xl shadow-black/50"
                decoding="async"
                (error)="handleLightboxImageLoadError(image)"
                data-testid="blog-lightbox-image"
              >
            }
          </div>

          <footer class="pointer-events-auto mx-auto max-w-4xl text-center">
            @if (image.captionText) {
              <p id="blog-lightbox-caption" class="text-sm leading-6 text-zinc-300"><app-blog-rich-text [html]="image.captionHtml"></app-blog-rich-text></p>
            } @else {
              <p class="sr-only">{{ image.alt }}</p>
            }
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .blog-image-figure {
      --blog-image-target-width: 100%;
      box-sizing: border-box;
      max-inline-size: 100%;
      overflow-wrap: anywhere;
    }

    .blog-image-size-small {
      --blog-image-target-width: clamp(12rem, 30vi, 24rem);
    }

    .blog-image-size-medium {
      --blog-image-target-width: clamp(18rem, 48vi, 36rem);
    }

    .blog-image-size-large {
      --blog-image-target-width: clamp(24rem, 72vi, 52rem);
    }

    .blog-image-size-wide {
      --blog-image-target-width: 100%;
    }

    .blog-image-layout-fullWidth,
    .blog-image-layout-contained:not(.blog-image-size-automatic),
    .blog-image-layout-inlineStart,
    .blog-image-layout-inlineEnd {
      inline-size: min(100%, var(--blog-image-target-width));
    }

    .blog-image-layout-fullWidth,
    .blog-image-size-wide {
      inline-size: 100%;
    }

    .blog-image-layout-contained {
      margin-inline: auto;
    }

    .blog-image-layout-contained.blog-image-size-automatic {
      inline-size: fit-content;
    }

    .blog-image-layout-inlineStart.blog-image-size-automatic,
    .blog-image-layout-inlineEnd.blog-image-size-automatic {
      --blog-image-target-width: clamp(16rem, 32vi, 20rem);
    }

    .blog-image-button {
      inline-size: 100%;
      max-inline-size: 100%;
    }

    .blog-image-layout-contained.blog-image-size-automatic .blog-image-button {
      inline-size: fit-content;
    }

    .blog-image-media {
      display: block;
      block-size: auto;
      inline-size: 100%;
      max-block-size: 72vh;
      max-inline-size: 100%;
      object-fit: contain;
    }

    .blog-image-layout-contained.blog-image-size-automatic .blog-image-media {
      inline-size: auto;
    }

    .blog-image-caption {
      box-sizing: border-box;
      inline-size: 100%;
      max-inline-size: 100%;
    }

    .blog-image-unavailable,
    .blog-lightbox-unavailable {
      display: grid;
      gap: .35rem;
      place-content: center;
      min-block-size: clamp(10rem, 28vi, 18rem);
      inline-size: 100%;
      border: 1px dashed currentColor;
      border-radius: .5rem;
      padding: 1.25rem;
      text-align: center;
    }

    .blog-image-unavailable {
      background: var(--site-panel);
      color: var(--site-muted);
    }

    .blog-lightbox-unavailable {
      max-inline-size: 42rem;
      color: #d4d4d8;
    }

    @media (min-width: 800px) {
      .blog-image-layout-inlineStart:not(.blog-image-size-large, .blog-image-size-wide) {
        float: left;
        float: inline-start;
        clear: inline-start;
        margin-block: .25rem 1rem;
        margin-inline: 0 1.5rem;
      }

      .blog-image-layout-inlineEnd:not(.blog-image-size-large, .blog-image-size-wide) {
        float: right;
        float: inline-end;
        clear: inline-end;
        margin-block: .25rem 1rem;
        margin-inline: 1.5rem 0;
      }
    }

    @media (max-width: 799px) {
      .blog-image-layout-inlineStart,
      .blog-image-layout-inlineEnd {
        clear: both;
        margin-inline: auto;
      }
    }

    :host-context(.reader-font-150) .blog-image-layout-inlineStart,
    :host-context(.reader-font-150) .blog-image-layout-inlineEnd,
    :host-context(.reader-font-175) .blog-image-layout-inlineStart,
    :host-context(.reader-font-175) .blog-image-layout-inlineEnd,
    :host-context(.reader-font-200) .blog-image-layout-inlineStart,
    :host-context(.reader-font-200) .blog-image-layout-inlineEnd {
      float: none;
      clear: both;
      margin-inline: auto;
    }

    .blog-anchored-subheading,
    .blog-section-heading {
      scroll-margin-top: calc(var(--blog-sticky-stack-height) + env(safe-area-inset-top));
    }

    .blog-article-heading {
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-weight: 650;
      letter-spacing: var(--blog-heading-letter-spacing);
      text-wrap: balance;
    }

    .blog-section-heading {
      padding-block: var(--blog-h2-padding-block);
      border-top: 1px solid var(--blog-heading-rule);
      background: var(--site-bg);
      font-size: var(--blog-h2-size) !important;
      line-height: var(--blog-h2-line-height) !important;
    }

    .blog-section-heading::before {
      position: absolute;
      top: -1px;
      left: 0;
      width: min(5rem, 24%);
      height: 2px;
      background: var(--site-accent);
      content: '';
    }

    .blog-anchored-subheading {
      padding-top: var(--blog-h3-padding-top);
      font-family: var(--font-subheading);
      font-size: var(--blog-h3-size) !important;
      line-height: var(--blog-h3-line-height) !important;
    }

    .blog-heading-anchor {
      color: inherit;
      display: inline-block;
      text-decoration: none;
    }

    .blog-section-heading .blog-heading-anchor {
      max-width: var(--blog-heading-measure);
    }

    .blog-anchored-subheading .blog-heading-anchor {
      max-width: var(--blog-subheading-measure);
    }

    .blog-heading-hash {
      margin-left: .4em;
      color: var(--site-subtle);
      font-size: .62em;
      opacity: 0;
      transition: opacity 140ms ease;
    }

    .blog-article-heading:hover .blog-heading-hash,
    .blog-article-heading:focus-within .blog-heading-hash {
      opacity: 1;
    }

    .blog-quick-summary-tooltip {
      position: absolute;
      bottom: calc(100% + .65rem);
      left: 0;
      z-index: 60;
      visibility: hidden;
      width: max-content;
      max-width: min(20rem, calc(100vw - 2rem));
      padding: .55rem .7rem;
      border: 1px solid var(--site-border);
      background: var(--site-heading);
      color: var(--site-panel);
      font-family: var(--font-body);
      font-size: .78rem;
      font-weight: 500;
      line-height: 1.45;
      opacity: 0;
      pointer-events: none;
      transform: translateY(.3rem);
      transition: opacity 140ms ease, transform 140ms ease, visibility 140ms ease;
      white-space: normal;
    }

    .blog-quick-summary-tooltip::after {
      position: absolute;
      top: 100%;
      left: 1rem;
      width: .65rem;
      height: .65rem;
      border-right: 1px solid var(--site-border);
      border-bottom: 1px solid var(--site-border);
      background: var(--site-heading);
      content: '';
      transform: translateY(-50%) rotate(45deg);
    }

    .blog-heading-anchor:hover + .blog-quick-summary-tooltip,
    .blog-heading-anchor:focus-visible + .blog-quick-summary-tooltip {
      visibility: visible;
      opacity: 1;
      transform: translateY(0);
    }

    @media (prefers-reduced-motion: reduce) {
      .blog-heading-hash,
      .blog-quick-summary-tooltip {
        transition: none;
      }
    }

    .blog-section-heading.blog-sticky-section-heading {
      position: sticky;
      top: calc(var(--blog-sticky-stack-height) + env(safe-area-inset-top));
      box-shadow: 0 .5rem 1rem color-mix(in srgb, var(--site-bg) 82%, transparent);
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
      --blog-list-step-bg: rgba(8, 145, 178, 0.08);
      --blog-list-step-border: rgba(103, 232, 249, 0.22);
      --blog-list-marker-size: clamp(2rem, calc(1.8rem * var(--reader-font-scale, 1)), 2.75rem);
      --blog-list-item-indent: clamp(3rem, calc(2.6rem * var(--reader-font-scale, 1)), 4.15rem);
      display: grid;
      gap: clamp(.7rem, calc(.72rem * var(--reader-font-scale, 1)), 1.25rem);
      list-style: none;
      margin: 0;
      min-width: 0;
      padding: 0;
    }

    :host-context(.light) .blog-list {
      --blog-list-bullet-color: #0891b2;
      --blog-list-bullet-ring: rgba(8, 145, 178, 0.14);
      --blog-list-number-bg: rgba(8, 145, 178, 0.12);
      --blog-list-number-border: rgba(8, 145, 178, 0.28);
      --blog-list-number-color: #0e7490;
      --blog-list-step-bg: rgba(8, 145, 178, 0.055);
      --blog-list-step-border: rgba(8, 145, 178, 0.2);
    }

    .blog-list-ordered {
      counter-reset: blog-list-item var(--blog-list-counter-start, 0);
    }

    .blog-list-item {
      line-height: 1.85;
      min-width: 0;
      overflow-wrap: anywhere;
      padding-inline-start: var(--blog-list-item-indent);
      position: relative;
      word-break: normal;
    }

    .blog-list-item-ordered {
      counter-increment: blog-list-item;
    }

    .blog-list-ordered > .blog-list-item-ordered::before {
      align-items: center;
      background: var(--blog-list-number-bg);
      border: 1px solid var(--blog-list-number-border);
      border-radius: 999px;
      color: var(--blog-list-number-color);
      content: counter(blog-list-item);
      display: inline-flex;
      font-size: clamp(.95rem, calc(.92rem * var(--reader-font-scale, 1)), 1.35rem);
      font-variant-numeric: tabular-nums;
      font-weight: 800;
      height: var(--blog-list-marker-size);
      justify-content: center;
      inset-inline-start: 0;
      line-height: 1;
      min-width: var(--blog-list-marker-size);
      padding: 0 .45rem;
      position: absolute;
      top: .15rem;
    }

    .blog-list-counter-lower-roman > .blog-list-item-ordered::before {
      content: counter(blog-list-item, lower-roman);
    }

    .blog-list-counter-upper-roman > .blog-list-item-ordered::before {
      content: counter(blog-list-item, upper-roman);
    }

    .blog-list-counter-lower-alpha > .blog-list-item-ordered::before {
      content: counter(blog-list-item, lower-alpha);
    }

    .blog-list-counter-upper-alpha > .blog-list-item-ordered::before {
      content: counter(blog-list-item, upper-alpha);
    }

    .blog-list-unordered > .blog-list-item-unordered::before {
      background: var(--blog-list-bullet-color);
      border-radius: 999px;
      box-shadow: 0 0 0 .3rem var(--blog-list-bullet-ring);
      content: '';
      height: .72rem;
      inset-inline-start: clamp(.55rem, calc(.5rem * var(--reader-font-scale, 1)), .9rem);
      position: absolute;
      top: calc((var(--reader-line-height, 1.75) * 1em - .72rem) / 2);
      width: .72rem;
    }

    .blog-list-nested {
      margin-top: clamp(.6rem, calc(.62rem * var(--reader-font-scale, 1)), 1rem);
      padding-inline-start: clamp(.5rem, 3vw, 1.15rem);
    }

    .blog-list-steps {
      gap: clamp(.85rem, calc(.8rem * var(--reader-font-scale, 1)), 1.35rem);
    }

    .blog-list-steps > .blog-list-item-steps {
      background: var(--blog-list-step-bg);
      border: 1px solid var(--blog-list-step-border);
      border-radius: clamp(.85rem, calc(.72rem * var(--reader-font-scale, 1)), 1.25rem);
      padding-block: clamp(.8rem, calc(.7rem * var(--reader-font-scale, 1)), 1.15rem);
      padding-inline-end: clamp(.85rem, calc(.75rem * var(--reader-font-scale, 1)), 1.25rem);
      padding-inline-start: calc(var(--blog-list-marker-size) + clamp(1rem, 3vw, 1.35rem));
    }

    .blog-list-steps > .blog-list-item-steps::before {
      inset-inline-start: clamp(.7rem, 2.5vw, 1rem);
      top: clamp(.8rem, calc(.7rem * var(--reader-font-scale, 1)), 1.15rem);
    }

    .blog-list-item-checklist {
      padding-inline-start: 0;
    }

    .blog-list-checkline {
      align-items: start;
      display: grid;
      gap: clamp(.65rem, calc(.62rem * var(--reader-font-scale, 1)), 1rem);
      grid-template-columns: auto minmax(0, 1fr);
      min-width: 0;
    }

    .blog-list-checkbox {
      accent-color: #0891b2;
      height: clamp(1.15rem, calc(1.05rem * var(--reader-font-scale, 1)), 1.75rem);
      margin: .42rem 0 0;
      opacity: 1;
      width: clamp(1.15rem, calc(1.05rem * var(--reader-font-scale, 1)), 1.75rem);
    }

    :host-context(.dark) .blog-list-checkbox {
      accent-color: #67e8f9;
    }

    @media (max-width: 639px) {
      .blog-list-nested {
        padding-inline-start: .55rem;
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
  @Input() previewMode = false;
  @Input() anchorPath = '';
  @Input() activeHeadingId: string | null = null;

  @ViewChild('lightboxDialog') private lightboxDialog?: ElementRef<HTMLElement>;

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
  protected readonly quickSummaryDescription = BLOG_QUICK_SUMMARY_DESCRIPTION;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly imageLayoutSet = new Set<string>(BLOG_IMAGE_LAYOUTS);
  private readonly imageSizeSet = new Set<string>(BLOG_IMAGE_SIZES);
  private readonly copiedCodeBlockIds = new Set<string>();
  private readonly codeCopyTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly copyFeedbackDurationMs = 2000;
  private readonly inertAttributeStates = new Map<HTMLElement, string | null>();
  private lightboxBodyStyleState: LightboxBodyStyleState | null = null;
  private lightboxFocusTimer: ReturnType<typeof setTimeout> | undefined;
  private lightboxReturnFocus: HTMLElement | null = null;
  private activeImageScope: { start: number; end: number } | null = null;
  private readonly trustedEmbedHosts = new Set([
    'www.youtube.com',
    'youtube.com',
    'm.youtube.com',
    'youtu.be',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
  ]);

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['blocks'] && !changes['fallbackAlt']) {
      return;
    }

    const publicBlocks = this.blocks.filter(block => block.type !== 'unsupported');
    const headingIdMap = createBlogHeadingIdMap(publicBlocks);
    const imageGallery: RenderableBlogImage[] = [];

    this.renderedBlocks = publicBlocks.map(block => {
      const captionHtml = block.data.caption ?? '';
      const imageAlt = this.createImageAlt(block);
      const sunoUrls = getBlogSunoEmbedUrls(block.data.embedUrl ?? block.data.url);
      const headingId = headingIdMap.get(block.id) ?? null;
      const isQuickSummary = block.type === 'header'
        && isBlogQuickSummaryHeading(this.createPlainText(block.data.text));
      const listStyle = this.createListStyle(block.data);
      let galleryIndex: number | null = null;
      let galleryStartIndex: number | null = null;
      const imageUrl = block.type === 'image' && block.data.url
        ? normalizeBlogImageUrl(block.data.url)
        : '';
      const galleryImages = block.type === 'gallery'
        ? (block.data.galleryImages ?? [])
          .map(image => ({...image, url: normalizeBlogImageUrl(image.url)}))
          .filter(image => image.url.length > 0)
        : [];

      if (imageUrl) {
        galleryIndex = imageGallery.length;
        imageGallery.push({
          url: imageUrl,
          alt: imageAlt,
          captionHtml,
          captionText: this.createPlainText(block.data.caption),
          downloadName: this.createDownloadFileName(imageUrl, imageAlt, block.id),
          loadFailed: false,
        });
      }

      if (galleryImages.length > 0) {
        galleryStartIndex = imageGallery.length;

        galleryImages.forEach((image, index) => {
          const alt = image.alt.trim() || this.fallbackAlt.trim() || `Blog gallery image ${index + 1}`;
          imageGallery.push({
            url: image.url,
            alt,
            captionHtml: image.caption ?? '',
            captionText: this.createPlainText(image.caption),
            downloadName: this.createDownloadFileName(image.url, alt, `${block.id}-${index + 1}`),
            loadFailed: false,
          });
        });
      }

      return {
        block,
        safeEmbedUrl: this.createSafeEmbedUrl(block),
        externalUrl: this.createExternalUrl(block),
        isAppEmbed: getTrustedBlogAppEmbedUrl(block.data.embedUrl ?? block.data.url) !== null,
        isSunoEmbed: sunoUrls !== null,
        appEmbedHeight: normalizeBlogAppEmbedHeight(block.data.height),
        headingId,
        quickSummaryTooltipId: isQuickSummary && headingId ? `${headingId}-description` : null,
        textHtml: isQuickSummary ? BLOG_QUICK_SUMMARY_LABEL : block.data.text ?? '',
        captionHtml,
        attributionHtml: block.data.attribution ?? '',
        blockHtml: block.type === 'markdown'
          ? marked.parse(block.data.markdown ?? '', {async: false})
          : block.data.html ?? '',
        itemHtml: block.data.items ?? [],
        hasStructuredList: block.data.listItems !== undefined,
        listItems: this.createListItems(block.data.listItems),
        listStyle,
        listPresentation: this.createListPresentation(block.data, listStyle),
        listStart: this.createListStart(block.data.listMeta?.['start']),
        listCounterType: this.createListCounterType(block.data.listMeta?.['counterType']),
        stats: this.createStats(block.data.stats),
        imageAlt,
        imageUrl,
        galleryIndex,
        galleryImages,
        galleryLayout: block.data.galleryLayout ?? 'grid',
        galleryStartIndex,
        imageLoadFailed: false,
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

    if (this.lightboxFocusTimer) {
      clearTimeout(this.lightboxFocusTimer);
    }

    this.restorePageAfterLightbox();
  }

  protected get activeImage(): RenderableBlogImage | null {
    return this.activeImageIndex === null ? null : this.imageGallery[this.activeImageIndex] ?? null;
  }

  private createListItems(items: readonly BlogListItem[] | undefined): readonly RenderableBlogListItem[] {
    return (items ?? []).map(item => ({
      contentHtml: item.content,
      checked: item.meta['checked'] === true,
      start: this.createListStart(item.meta['start']),
      counterType: this.createListCounterType(item.meta['counterType']),
      items: this.createListItems(item.items),
    }));
  }

  private createListStyle(data: BlogBlockData): BlogListStyle {
    if (data.listStyle === 'ordered' || data.listStyle === 'checklist') {
      return data.listStyle;
    }

    if (data.listStyle === 'unordered') {
      return 'unordered';
    }

    return data.ordered ? 'ordered' : 'unordered';
  }

  private createListPresentation(data: BlogBlockData, style: BlogListStyle): BlogListPresentation {
    return style === 'ordered' && data.listPresentation === 'steps' ? 'steps' : 'standard';
  }

  private createListStart(value: unknown): number {
    return typeof value === 'number' && Number.isSafeInteger(value) ? value : 1;
  }

  private createListCounterType(value: unknown): BlogListCounterType {
    return value === 'lower-roman'
      || value === 'upper-roman'
      || value === 'lower-alpha'
      || value === 'upper-alpha'
      ? value
      : 'numeric';
  }

  protected listCounterTypeAttribute(counterType: BlogListCounterType): string | null {
    switch (counterType) {
      case 'lower-roman':
        return 'i';
      case 'upper-roman':
        return 'I';
      case 'lower-alpha':
        return 'a';
      case 'upper-alpha':
        return 'A';
      default:
        return null;
    }
  }

  protected get activeImagePositionLabel(): string {
    if (this.activeImageIndex === null || this.imageGallery.length === 0) {
      return '';
    }

    const start = this.activeImageScope?.start ?? 0;
    const end = this.activeImageScope?.end ?? this.imageGallery.length;
    return `${this.activeImageIndex - start + 1} / ${end - start}`;
  }

  protected get hasMultipleImages(): boolean {
    const start = this.activeImageScope?.start ?? 0;
    const end = this.activeImageScope?.end ?? this.imageGallery.length;
    return end - start > 1;
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

  protected openImageLightbox(
    galleryIndex: number | null,
    scopeStart: number | null = null,
    scopeLength?: number
  ): void {
    if (galleryIndex === null || !this.imageGallery[galleryIndex]) {
      return;
    }

    const document = this.host.nativeElement.ownerDocument;
    this.lightboxReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.activeImageScope = scopeStart !== null && scopeLength && scopeLength > 0
      ? {start: scopeStart, end: Math.min(this.imageGallery.length, scopeStart + scopeLength)}
      : null;
    this.activeImageIndex = galleryIndex;
    this.preparePageForLightbox();
    this.scheduleLightboxFocus();
  }

  protected imageLayout(row: RenderableBlogBlock): BlogImageLayout {
    return this.getImageLayout(row.block.data);
  }

  protected imageSize(row: RenderableBlogBlock): BlogImageSize | undefined {
    return this.getImageSize(row.block.data);
  }

  protected imageFigureClass(row: RenderableBlogBlock): string {
    const layout = this.getImageLayout(row.block.data);
    const size = this.getImageSize(row.block.data) ?? 'automatic';
    const frameClass = row.block.data.withBackground ? ' rounded bg-slate-100 p-4 dark:bg-zinc-900' : '';

    return `blog-image-reveal blog-image-figure blog-image-layout-${layout} blog-image-size-${size} space-y-2${frameClass}`;
  }

  protected imageButtonClass(row: RenderableBlogBlock): string {
    const layout = this.getImageLayout(row.block.data);
    const baseClass = 'blog-image-button group relative block cursor-zoom-in overflow-hidden rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300';

    return layout === 'contained' ? `${baseClass} mx-auto` : baseClass;
  }

  protected imageClass(row: RenderableBlogBlock): string {
    const borderClass = row.block.data.withBorder ? ' border border-slate-300 dark:border-zinc-700' : '';

    return `blog-image-media rounded transition duration-200 group-hover:scale-[1.01] group-focus-visible:scale-[1.01]${borderClass}`;
  }

  protected imageCaptionClass(): string {
    return 'blog-image-caption text-sm leading-6 text-slate-500 dark:text-zinc-500';
  }

  protected closeImageLightbox(): void {
    if (this.activeImageIndex === null) {
      return;
    }

    this.activeImageIndex = null;
    this.activeImageScope = null;
    this.restorePageAfterLightbox();
    this.cdr.markForCheck();

    if (this.lightboxFocusTimer) {
      clearTimeout(this.lightboxFocusTimer);
    }

    const returnFocus = this.lightboxReturnFocus;
    this.lightboxReturnFocus = null;
    this.lightboxFocusTimer = setTimeout(() => {
      if (returnFocus?.isConnected) {
        returnFocus.focus();
      }
      this.lightboxFocusTimer = undefined;
    });
  }

  protected positiveImageDimension(value: number | undefined): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }

  protected handleImageLoadError(row: RenderableBlogBlock): void {
    row.imageLoadFailed = true;

    if (row.galleryIndex !== null && this.imageGallery[row.galleryIndex]) {
      this.imageGallery[row.galleryIndex].loadFailed = true;
    }

    this.cdr.markForCheck();
  }

  protected handleLightboxImageLoadError(image: RenderableBlogImage): void {
    image.loadFailed = true;
    this.cdr.markForCheck();
  }

  protected showPreviousImage(event?: Event): void {
    event?.stopPropagation();

    if (this.activeImageIndex === null || this.imageGallery.length < 2) {
      return;
    }

    const start = this.activeImageScope?.start ?? 0;
    const end = this.activeImageScope?.end ?? this.imageGallery.length;
    this.activeImageIndex = this.activeImageIndex <= start ? end - 1 : this.activeImageIndex - 1;
  }

  protected showNextImage(event?: Event): void {
    event?.stopPropagation();

    if (this.activeImageIndex === null || this.imageGallery.length < 2) {
      return;
    }

    const start = this.activeImageScope?.start ?? 0;
    const end = this.activeImageScope?.end ?? this.imageGallery.length;
    this.activeImageIndex = this.activeImageIndex >= end - 1 ? start : this.activeImageIndex + 1;
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected handleEscapeKey(event: Event): void {
    if (!(event instanceof KeyboardEvent) || !this.activeImage) {
      return;
    }

    event.preventDefault();
    this.closeImageLightbox();
  }

  @HostListener('document:keydown.tab', ['$event'])
  protected handleLightboxTabKey(event: Event): void {
    if (!(event instanceof KeyboardEvent) || !this.activeImage) {
      return;
    }

    const dialog = this.lightboxDialog?.nativeElement;

    if (!dialog) {
      return;
    }

    const focusableElements = this.getLightboxFocusableElements(dialog);

    if (focusableElements.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const document = this.host.nativeElement.ownerDocument;
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
      event.preventDefault();
      first.focus();
    }
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

  private getImageSize(data: BlogBlockData): BlogImageSize | undefined {
    return data.imageSize && this.imageSizeSet.has(data.imageSize) ? data.imageSize : undefined;
  }

  private scheduleLightboxFocus(): void {
    if (this.lightboxFocusTimer) {
      clearTimeout(this.lightboxFocusTimer);
    }

    this.lightboxFocusTimer = setTimeout(() => {
      const dialog = this.lightboxDialog?.nativeElement;
      const closeButton = dialog?.querySelector<HTMLButtonElement>('[data-testid="blog-lightbox-close"]');
      (closeButton ?? dialog)?.focus();
      this.lightboxFocusTimer = undefined;
    });
  }

  private preparePageForLightbox(): void {
    const document = this.host.nativeElement.ownerDocument;
    let branch = this.host.nativeElement;

    while (branch.parentElement) {
      const parent = branch.parentElement;

      for (const sibling of Array.from(parent.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === branch || this.inertAttributeStates.has(sibling)) {
          continue;
        }

        this.inertAttributeStates.set(sibling, sibling.getAttribute('inert'));
        sibling.setAttribute('inert', '');
      }

      branch = parent;

      if (branch === document.body) {
        break;
      }
    }

    const body = document.body;
    const window = document.defaultView;
    this.lightboxBodyStyleState = {
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      paddingRight: body.style.paddingRight,
    };

    const documentWidth = document.documentElement.clientWidth;
    const scrollbarWidth = window && documentWidth > 0 ? Math.max(0, window.innerWidth - documentWidth) : 0;

    if (scrollbarWidth > 0 && window) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'contain';
  }

  private restorePageAfterLightbox(): void {
    for (const [element, previousValue] of this.inertAttributeStates) {
      if (previousValue === null) {
        element.removeAttribute('inert');
      } else {
        element.setAttribute('inert', previousValue);
      }
    }

    this.inertAttributeStates.clear();

    if (this.lightboxBodyStyleState) {
      const body = this.host.nativeElement.ownerDocument.body;
      body.style.overflow = this.lightboxBodyStyleState.overflow;
      body.style.overscrollBehavior = this.lightboxBodyStyleState.overscrollBehavior;
      body.style.paddingRight = this.lightboxBodyStyleState.paddingRight;
      this.lightboxBodyStyleState = null;
    }
  }

  private getLightboxFocusableElements(dialog: HTMLElement): readonly HTMLElement[] {
    return Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => element.getAttribute('aria-hidden') !== 'true');
  }

  private createDownloadFileName(url: string | undefined, alt: string, fallbackId: string): string {
    const sourceName = this.getFileNameFromUrl(url);

    if (sourceName) {
      return sourceName;
    }

    return `${this.sanitizeFileName(alt || this.fallbackAlt || fallbackId) || 'blog-image'}.jpg`;
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
