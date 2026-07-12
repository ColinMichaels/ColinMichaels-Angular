import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';

@Component({
  selector: 'app-blog-post-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!imageFailed) {
      <img
        class="blog-post-background-image"
        [src]="imageUrl"
        alt=""
        aria-hidden="true"
        data-site-preload-image
        decoding="async"
        fetchpriority="high"
        loading="eager"
        (error)="onImageError()"
      >
      <span class="blog-post-background-scrim" aria-hidden="true"></span>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 0;
      display: block;
      overflow: hidden;
      pointer-events: none;
      background: var(--site-bg);
    }

    .blog-post-background-image,
    .blog-post-background-scrim {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .blog-post-background-image {
      object-fit: cover;
      object-position: center;
    }

    .blog-post-background-scrim {
      background:
        linear-gradient(
          180deg,
          rgb(9 9 11 / 0.4) 0%,
          rgb(9 9 11 / 0.66) 48%,
          rgb(9 9 11 / 0.84) 100%
        );
    }

    :host-context(.reader-contrast-high) {
      display: none;
    }
  `,
})
export class BlogPostBackgroundComponent implements OnChanges {
  @Input({required: true}) imageUrl = '';
  @Output() imageLoadFailed = new EventEmitter<string>();

  protected imageFailed = false;

  ngOnChanges(): void {
    this.imageFailed = false;
  }

  protected onImageError(): void {
    this.imageFailed = true;
    this.imageLoadFailed.emit(this.imageUrl);
  }
}
