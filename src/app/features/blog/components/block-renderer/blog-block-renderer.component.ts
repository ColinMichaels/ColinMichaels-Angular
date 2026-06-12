import {Component, Input, OnChanges, inject, ChangeDetectionStrategy} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

import {BlogContentBlock} from '../../models/blog-post.model';
import {createBlogHeadingIdMap} from '../../utils/blog-reading.util';

interface RenderableBlogBlock {
  block: BlogContentBlock;
  safeEmbedUrl: SafeResourceUrl | null;
  externalUrl: string | null;
  headingId: string | null;
}

@Component({
  selector: 'app-blog-block-renderer',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="space-y-6 text-base leading-8 text-zinc-300">
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
                  <span [innerHTML]="row.block.data.text"></span>
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
                  <span [innerHTML]="row.block.data.text"></span>
                  @if (row.headingId) {
                    <span aria-hidden="true"
                          class="text-base text-zinc-600 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">#</span>
                  }
                </a>
              </h2>
            }
          }
          @case ('paragraph') {
            <p [innerHTML]="row.block.data.text"></p>
          }
          @case ('quote') {
            <blockquote class="border-l-2 border-cyan-300 pl-5 text-zinc-200">
              <p [innerHTML]="row.block.data.text"></p>
              @if (row.block.data.caption) {
                <cite class="mt-2 block text-sm not-italic text-zinc-500" [innerHTML]="row.block.data.caption"></cite>
              }
            </blockquote>
          }
          @case ('typography') {
            @switch (row.block.data.variant) {
              @case ('eyebrow') {
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300" [innerHTML]="row.block.data.text"></p>
              }
              @case ('pullQuote') {
                <blockquote class="my-10 border-y border-amber-300/40 py-7 text-zinc-100">
                  <p class="text-2xl font-semibold leading-10 tracking-[-0.02em] sm:text-3xl" [innerHTML]="row.block.data.text"></p>
                  @if (row.block.data.attribution) {
                    <cite class="mt-4 block text-sm not-italic uppercase tracking-[0.22em] text-amber-200" [innerHTML]="row.block.data.attribution"></cite>
                  }
                </blockquote>
              }
              @case ('callout') {
                <aside class="border border-emerald-400/30 bg-emerald-950/30 p-5 text-emerald-50">
                  @if (row.block.data.attribution) {
                    <p class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300" [innerHTML]="row.block.data.attribution"></p>
                  }
                  <div class="leading-8" [innerHTML]="row.block.data.text"></div>
                </aside>
              }
              @case ('aside') {
                <aside class="border-l border-zinc-600 pl-5 text-sm leading-7 text-zinc-400" [innerHTML]="row.block.data.text"></aside>
              }
              @case ('caption') {
                <p class="text-sm leading-6 text-zinc-500" [innerHTML]="row.block.data.text"></p>
              }
              @default {
                <p class="text-xl leading-9 tracking-[-0.01em] text-zinc-100" [innerHTML]="row.block.data.text"></p>
              }
            }
          }
          @case ('list') {
            @if (row.block.data.ordered) {
              <ol class="list-decimal space-y-2 pl-6">
                @for (item of row.block.data.items ?? []; track item) {
                  <li [innerHTML]="item"></li>
                }
              </ol>
            } @else {
              <ul class="list-disc space-y-2 pl-6">
                @for (item of row.block.data.items ?? []; track item) {
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
                <img
                  [src]="row.block.data.url"
                  [alt]="row.block.data.alt || fallbackAlt"
                  [attr.width]="row.block.data.width || null"
                  [attr.height]="row.block.data.height || null"
                  class="rounded object-contain"
                  [class.w-full]="row.block.data.stretched"
                  [class.mx-auto]="!row.block.data.stretched"
                  [class.max-w-full]="!row.block.data.stretched"
                  [class.border]="row.block.data.withBorder"
                  [class.border-zinc-700]="row.block.data.withBorder"
                  loading="lazy"
                  decoding="async"
                >
                @if (row.block.data.caption) {
                  <figcaption class="text-sm text-zinc-500" [innerHTML]="row.block.data.caption"></figcaption>
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
                  <figcaption class="text-sm text-zinc-500" [innerHTML]="row.block.data.caption"></figcaption>
                }
              </figure>
            } @else if (row.externalUrl) {
              <p>
                <a [href]="row.externalUrl" target="_blank" rel="noreferrer" class="text-cyan-300 hover:text-cyan-200">
                  <span [innerHTML]="row.block.data.caption || row.externalUrl"></span>
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
  `,
})
export class BlogBlockRendererComponent implements OnChanges {
  @Input() blocks: readonly BlogContentBlock[] = [];
  @Input() fallbackAlt = 'Blog content';
  @Input() anchorPath = '';

  protected renderedBlocks: readonly RenderableBlogBlock[] = [];

  private readonly sanitizer = inject(DomSanitizer);
  private readonly trustedEmbedHosts = new Set([
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
  ]);

  ngOnChanges(): void {
    const headingIdMap = createBlogHeadingIdMap(this.blocks);

    this.renderedBlocks = this.blocks.map(block => ({
      block,
      safeEmbedUrl: this.createSafeEmbedUrl(block),
      externalUrl: this.createExternalUrl(block),
      headingId: headingIdMap.get(block.id) ?? null,
    }));
  }

  private createSafeEmbedUrl(block: BlogContentBlock): SafeResourceUrl | null {
    if (block.type !== 'embed') {
      return null;
    }

    const url = this.parseHttpUrl(block.data.embedUrl ?? block.data.url);

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
}
