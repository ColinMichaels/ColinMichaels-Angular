import {
  ChangeDetectionStrategy,
  Component,
  Input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import {BlogGalleryImage} from '../../models/blog-post.model';

/**
 * Shared, presentation-only layer for interaction-triggered post image swaps.
 * The parent owns activation and navigation so this can sit inside any linked
 * post thumbnail without changing its route or requesting images up front.
 */
@Component({
  selector: 'app-post-image-scrubber',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    @for (image of images; track image.url; let imageIndex = $index) {
      <img
        class="post-image-scrubber__frame"
        [class.post-image-scrubber__frame--active]="imageIndex === activeIndex"
        [class.post-image-scrubber__frame--settled]="settledUrls.has(image.url)"
        [src]="image.url"
        alt=""
        loading="eager"
        decoding="async"
        fetchpriority="low"
        (load)="imageSettled.emit(image.url)"
        (error)="imageSettled.emit(image.url)"
      >
    }

    @if (buffering) {
      <span class="post-image-scrubber__buffer" aria-hidden="true"></span>
    }
  `,
  styles: [`
    .post-image-scrubber-cover--active {
      filter: blur(0.14rem) brightness(0.72) saturate(0.74);
      transform: scale(1.04);
    }

    .post-image-scrubber-cover--buffering {
      animation: post-image-scrubber-cover-buffer 760ms ease-in-out infinite alternate;
      filter: blur(0.38rem) brightness(0.58) saturate(0.62);
      transform: scale(1.07);
    }

    .post-listing-region--image-preview .post-listing__media:hover .post-image-scrubber-cover--active,
    .post-listing-region--image-preview .post-listing__media:focus-visible .post-image-scrubber-cover--active {
      filter: blur(0.14rem) brightness(0.72) saturate(0.74);
      transform: scale(1.04);
    }

    .post-listing-region--image-preview .post-listing__media:hover .post-image-scrubber-cover--buffering,
    .post-listing-region--image-preview .post-listing__media:focus-visible .post-image-scrubber-cover--buffering {
      filter: blur(0.38rem) brightness(0.58) saturate(0.62);
      transform: scale(1.07);
    }

    .post-listing__media--scrubbing {
      z-index: 5;
      box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 0.42);
      scale: 1.12;
    }

    .post-listing--grid .post-listing__media--scrubbing,
    .post-listing--editorial .post-listing__media--scrubbing {
      scale: 1.08;
    }

    .post-listing-region--background-media
    .post-listing--fan .post-listing__media--scrubbing {
      scale: 1.08;
      transform-origin: center;
    }

    app-post-image-scrubber {
      position: absolute;
      z-index: 2;
      inset: 0;
      display: block;
      overflow: hidden;
      pointer-events: none;
    }

    .post-image-scrubber__frame {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      opacity: 0;
      filter: blur(0.28rem) brightness(0.78);
      transform: scale(1.045);
      transition: filter 200ms ease, opacity 180ms ease, transform 240ms ease;
    }

    .post-image-scrubber__frame--active.post-image-scrubber__frame--settled {
      opacity: 1;
      filter: none;
      transform: scale(1);
    }

    .post-image-scrubber__buffer {
      position: absolute;
      z-index: 3;
      top: 0;
      bottom: 0;
      left: -22%;
      width: 18%;
      background: linear-gradient(90deg, transparent, rgb(var(--post-accent-rgb) / 0.48), transparent);
      animation: post-image-scrubber-buffer-scan 840ms ease-in-out infinite;
    }

    @keyframes post-image-scrubber-cover-buffer {
      to {
        filter: blur(0.48rem) brightness(0.52) saturate(0.56);
      }
    }

    @keyframes post-image-scrubber-buffer-scan {
      to {
        transform: translateX(680%);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .post-image-scrubber-cover--buffering,
      .post-image-scrubber__buffer {
        animation: none;
      }

      .post-image-scrubber__frame {
        transition: none;
      }

      .post-listing__media--scrubbing {
        transition: none;
      }
    }
  `],
})
export class PostImageScrubberComponent {
  @Input({required: true}) images: readonly BlogGalleryImage[] = [];
  @Input({required: true}) activeIndex = 0;
  @Input({required: true}) settledUrls: ReadonlySet<string> = new Set<string>();
  @Input() buffering = false;

  readonly imageSettled = output<string>();
}
