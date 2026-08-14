import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';

import {BlogGalleryImage, BlogGalleryLayout} from '../../models/blog-post.model';
import {BlogRichTextComponent} from '../rich-text/blog-rich-text.component';

@Component({
  selector: 'app-blog-gallery',
  imports: [BlogRichTextComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="blog-gallery"
      [attr.data-gallery-layout]="layout"
      [attr.aria-label]="galleryLabel"
    >
      @if (title) {
        <h3 class="blog-gallery-title">
          <app-blog-rich-text [html]="title"></app-blog-rich-text>
        </h3>
      }

      @if (layout === 'slideshow') {
        <div
          class="blog-gallery-slideshow"
          role="region"
          aria-roledescription="carousel"
          [attr.aria-label]="galleryLabel + ' slideshow'"
          tabindex="0"
          (keydown)="handleKeydown($event)"
        >
          @if (currentImage; as image) {
            <figure class="blog-gallery-slide">
              @if (hasImageFailed(slideshowIndex)) {
                <div class="blog-gallery-unavailable" role="status" data-testid="blog-gallery-unavailable">
                  <strong>Image unavailable</strong>
                  <span>{{ imageAlt(image) }}</span>
                </div>
              } @else {
                <button
                  type="button"
                  class="blog-gallery-image-button"
                  [attr.aria-label]="openImageLabel(image, slideshowIndex)"
                  (click)="openImage(slideshowIndex)"
                  data-testid="blog-gallery-image-button"
                >
                  <img
                    [src]="image.url"
                    [alt]="imageAlt(image)"
                    [attr.width]="positiveDimension(image.width)"
                    [attr.height]="positiveDimension(image.height)"
                    class="blog-gallery-image blog-gallery-slide-image"
                    loading="lazy"
                    decoding="async"
                    (error)="handleImageError(slideshowIndex)"
                  >
                  <span class="blog-gallery-zoom" aria-hidden="true">View</span>
                </button>
              }
              @if (image.caption) {
                <figcaption class="blog-gallery-image-caption">
                  <app-blog-rich-text [html]="image.caption"></app-blog-rich-text>
                </figcaption>
              }
            </figure>
          }

          <div class="blog-gallery-slideshow-controls">
            <button
              type="button"
              class="blog-gallery-nav-button"
              [disabled]="images.length < 2"
              aria-label="View previous gallery image"
              (click)="showPrevious($event)"
              data-testid="blog-gallery-previous"
            >&#8592;
            </button>
            <p class="blog-gallery-position" aria-live="polite" data-testid="blog-gallery-position">
              Image {{ slideshowIndex + 1 }} of {{ images.length }}
            </p>
            <button
              type="button"
              class="blog-gallery-nav-button"
              [disabled]="images.length < 2"
              aria-label="View next gallery image"
              (click)="showNext($event)"
              data-testid="blog-gallery-next"
            >&#8594;
            </button>
          </div>
        </div>
      } @else {
        <div
          class="blog-gallery-collection"
          [class.blog-gallery-grid]="layout === 'grid'"
          [class.blog-gallery-mosaic]="layout === 'mosaic'"
          role="list"
        >
          @for (image of images; track $index) {
            <figure
              class="blog-gallery-tile"
              [class.blog-gallery-mosaic-lead]="layout === 'mosaic' && $index === 0"
              role="listitem"
            >
              @if (hasImageFailed($index)) {
                <div class="blog-gallery-unavailable" role="status" data-testid="blog-gallery-unavailable">
                  <strong>Image unavailable</strong>
                  <span>{{ imageAlt(image) }}</span>
                </div>
              } @else {
                <button
                  type="button"
                  class="blog-gallery-image-button"
                  [attr.aria-label]="openImageLabel(image, $index)"
                  (click)="openImage($index)"
                  data-testid="blog-gallery-image-button"
                >
                  <img
                    [src]="image.url"
                    [alt]="imageAlt(image)"
                    [attr.width]="positiveDimension(image.width)"
                    [attr.height]="positiveDimension(image.height)"
                    class="blog-gallery-image blog-gallery-tile-image"
                    loading="lazy"
                    decoding="async"
                    (error)="handleImageError($index)"
                  >
                  <span class="blog-gallery-zoom" aria-hidden="true">View</span>
                </button>
              }
              @if (image.caption) {
                <figcaption class="blog-gallery-image-caption">
                  <app-blog-rich-text [html]="image.caption"></app-blog-rich-text>
                </figcaption>
              }
            </figure>
          }
        </div>
      }

      @if (caption) {
        <p class="blog-gallery-caption">
          <app-blog-rich-text [html]="caption"></app-blog-rich-text>
        </p>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      clear: both;
      max-inline-size: 100%;
    }

    .blog-gallery {
      display: grid;
      gap: 1rem;
      max-inline-size: 100%;
      padding-block: .5rem;
    }

    .blog-gallery-title {
      color: inherit;
      font-family: var(--font-heading);
      font-size: clamp(1.15rem, 1rem + .6vi, 1.5rem);
      font-weight: 650;
      line-height: 1.3;
      margin: 0;
    }

    .blog-gallery-collection {
      display: grid;
      gap: clamp(.65rem, 1.5vi, 1rem);
      min-inline-size: 0;
    }

    .blog-gallery-grid {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    }

    .blog-gallery-mosaic {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .blog-gallery-tile,
    .blog-gallery-slide {
      display: grid;
      gap: .5rem;
      min-inline-size: 0;
      margin: 0;
    }

    .blog-gallery-image-button {
      position: relative;
      display: block;
      overflow: hidden;
      inline-size: 100%;
      min-block-size: 8rem;
      padding: 0;
      border: 1px solid var(--site-border);
      border-radius: .65rem;
      background: var(--site-panel);
      cursor: zoom-in;
    }

    .blog-gallery-image-button:focus-visible,
    .blog-gallery-nav-button:focus-visible {
      outline: 2px solid #22d3ee;
      outline-offset: 4px;
    }

    .blog-gallery-image {
      display: block;
      inline-size: 100%;
      max-inline-size: 100%;
    }

    .blog-gallery-tile-image {
      block-size: clamp(11rem, 25vi, 18rem);
      object-fit: cover;
      transition: transform 180ms ease;
    }

    .blog-gallery-image-button:hover .blog-gallery-tile-image,
    .blog-gallery-image-button:focus-visible .blog-gallery-tile-image {
      transform: scale(1.015);
    }

    .blog-gallery-slideshow {
      display: grid;
      gap: .75rem;
    }

    .blog-gallery-slideshow:focus-visible {
      outline: 2px solid #22d3ee;
      outline-offset: 4px;
    }

    .blog-gallery-slide-image {
      block-size: auto;
      max-block-size: min(68vh, 42rem);
      object-fit: contain;
    }

    .blog-gallery-slideshow-controls {
      display: grid;
      grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
      align-items: center;
      gap: .75rem;
      max-inline-size: 22rem;
      inline-size: 100%;
      margin-inline: auto;
    }

    .blog-gallery-nav-button {
      display: inline-grid;
      place-items: center;
      min-block-size: 2.75rem;
      min-inline-size: 2.75rem;
      border: 1px solid var(--site-border);
      border-radius: 999px;
      background: var(--site-panel);
      color: var(--site-heading);
      font-size: 1.1rem;
      cursor: pointer;
    }

    .blog-gallery-nav-button:disabled {
      cursor: not-allowed;
      opacity: .45;
    }

    .blog-gallery-position {
      margin: 0;
      color: var(--site-muted);
      font-size: .8rem;
      font-weight: 700;
      letter-spacing: .08em;
      text-align: center;
      text-transform: uppercase;
    }

    .blog-gallery-zoom {
      position: absolute;
      inset-block-start: .75rem;
      inset-inline-end: .75rem;
      padding: .35rem .55rem;
      border: 1px solid rgb(255 255 255 / .2);
      border-radius: 999px;
      background: rgb(0 0 0 / .72);
      color: #fafafa;
      font-size: .7rem;
      font-weight: 700;
      letter-spacing: .08em;
      opacity: 0;
      text-transform: uppercase;
      transition: opacity 180ms ease;
    }

    .blog-gallery-image-button:hover .blog-gallery-zoom,
    .blog-gallery-image-button:focus-visible .blog-gallery-zoom {
      opacity: 1;
    }

    .blog-gallery-image-caption,
    .blog-gallery-caption {
      overflow-wrap: anywhere;
      color: inherit;
      font-size: .875rem;
      line-height: 1.55;
      opacity: .82;
    }

    .blog-gallery-image-caption,
    .blog-gallery-caption {
      margin: 0;
    }

    .blog-gallery-caption {
      padding-block-start: .25rem;
      border-block-start: 1px solid var(--site-border);
    }

    .blog-gallery-unavailable {
      display: grid;
      place-content: center;
      gap: .35rem;
      min-block-size: 10rem;
      padding: 1.25rem;
      border: 1px dashed currentColor;
      border-radius: .65rem;
      background: var(--site-panel);
      color: inherit;
      text-align: center;
    }

    @media (min-width: 800px) {
      .blog-gallery-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .blog-gallery-mosaic {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .blog-gallery-mosaic-lead {
        grid-column: span 2;
        grid-row: span 2;
      }

      .blog-gallery-mosaic-lead .blog-gallery-tile-image {
        block-size: 100%;
        min-block-size: clamp(23rem, 50vi, 37rem);
      }
    }

    @media (max-width: 520px) {
      .blog-gallery-grid,
      .blog-gallery-mosaic {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    :host-context(.reader-font-150) .blog-gallery-grid,
    :host-context(.reader-font-150) .blog-gallery-mosaic,
    :host-context(.reader-font-175) .blog-gallery-grid,
    :host-context(.reader-font-175) .blog-gallery-mosaic,
    :host-context(.reader-font-200) .blog-gallery-grid,
    :host-context(.reader-font-200) .blog-gallery-mosaic {
      grid-template-columns: minmax(0, 1fr);
    }

    :host-context(.reader-motion-reduce) .blog-gallery-image,
    :host-context(.reader-motion-reduce) .blog-gallery-zoom {
      transition: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .blog-gallery-image,
      .blog-gallery-zoom {
        transition: none;
      }
    }
  `],
})
export class BlogGalleryComponent implements OnChanges {
  @Input() images: readonly BlogGalleryImage[] = [];
  @Input() layout: BlogGalleryLayout = 'grid';
  @Input() title = '';
  @Input() caption = '';
  @Input() fallbackAlt = 'Blog gallery image';
  @Input() lightboxStartIndex = 0;

  @Output() readonly imageOpen = new EventEmitter<number>();

  protected slideshowIndex = 0;
  protected readonly failedImageIndexes = new Set<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images']) {
      this.slideshowIndex = Math.min(this.slideshowIndex, Math.max(0, this.images.length - 1));
      this.failedImageIndexes.clear();
    }
  }

  protected get currentImage(): BlogGalleryImage | null {
    return this.images[this.slideshowIndex] ?? null;
  }

  protected get galleryLabel(): string {
    return this.title.trim() || `Image gallery with ${this.images.length} images`;
  }

  protected imageAlt(image: BlogGalleryImage): string {
    return image.alt.trim() || this.fallbackAlt.trim() || 'Blog gallery image';
  }

  protected openImageLabel(image: BlogGalleryImage, index: number): string {
    return `View image ${index + 1} of ${this.images.length} full screen: ${this.imageAlt(image)}`;
  }

  protected positiveDimension(value: number | undefined): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }

  protected hasImageFailed(index: number): boolean {
    return this.failedImageIndexes.has(index);
  }

  protected handleImageError(index: number): void {
    this.failedImageIndexes.add(index);
  }

  protected openImage(index: number): void {
    if (!this.images[index] || this.hasImageFailed(index)) {
      return;
    }

    this.imageOpen.emit(this.lightboxStartIndex + index);
  }

  protected showPrevious(event?: Event): void {
    event?.preventDefault();

    if (this.images.length < 2) {
      return;
    }

    this.slideshowIndex = (this.slideshowIndex - 1 + this.images.length) % this.images.length;
  }

  protected showNext(event?: Event): void {
    event?.preventDefault();

    if (this.images.length < 2) {
      return;
    }

    this.slideshowIndex = (this.slideshowIndex + 1) % this.images.length;
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (this.layout !== 'slideshow') {
      return;
    }

    if (event.key === 'ArrowLeft') {
      this.showPrevious(event);
    } else if (event.key === 'ArrowRight') {
      this.showNext(event);
    }
  }
}
