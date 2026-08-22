import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {
  DestroyRef,
  Directive,
  HostBinding,
  HostListener,
  inject,
  Input,
  OnChanges,
  PLATFORM_ID,
  signal,
} from '@angular/core';

import {BlogGalleryImage} from '../models/blog-post.model';

const IMAGE_PREVIEW_OPEN_DELAY_MS = 120;
const IMAGE_PREVIEW_CLOSE_DELAY_MS = 60;

@Directive({
  selector: '[appPostImagePreview]',
  standalone: true,
  exportAs: 'postImagePreview',
})
export class PostImagePreviewDirective implements OnChanges {
  @Input({required: true, alias: 'appPostImagePreview'}) previewId = '';
  @Input({required: true}) postImagePreviewTitle = '';
  @Input() postImagePreviewImages: readonly BlogGalleryImage[] = [];

  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly previewActive = signal(false);
  private readonly previewIndex = signal(0);
  private readonly previewSettledUrls = signal<ReadonlySet<string>>(new Set<string>());
  private openTimer: number | undefined;
  private closeTimer: number | undefined;
  private pendingIndex = 0;

  readonly active = this.previewActive.asReadonly();
  readonly activeIndex = this.previewIndex.asReadonly();
  readonly settledUrls = this.previewSettledUrls.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearTimer('open');
      this.clearTimer('close');
    });
  }

  ngOnChanges(): void {
    if (!this.postImagePreviewImages.length) {
      this.deactivate();
      return;
    }

    if (this.previewIndex() >= this.postImagePreviewImages.length) {
      this.previewIndex.set(this.postImagePreviewImages.length - 1);
    }
  }

  @HostBinding('class.post-listing__media--scrubbing')
  get scrubbingClass(): boolean {
    return this.previewActive();
  }

  @HostBinding('attr.aria-describedby')
  get describedBy(): string | null {
    return this.previewActive() ? this.statusId() : null;
  }

  @HostListener('pointerenter', ['$event'])
  queueOpen(event: PointerEvent): void {
    if (!this.canUsePreview()) {
      return;
    }

    this.clearTimer('close');
    this.pendingIndex = this.indexFromPointer(event);

    if (this.previewActive()) {
      this.previewIndex.set(this.pendingIndex);
      return;
    }

    this.clearTimer('open');
    this.openTimer = this.document.defaultView?.setTimeout(() => {
      this.activate(this.pendingIndex);
    }, IMAGE_PREVIEW_OPEN_DELAY_MS);
  }

  @HostListener('pointermove', ['$event'])
  updateFromPointer(event: PointerEvent): void {
    const nextIndex = this.indexFromPointer(event);
    this.pendingIndex = nextIndex;

    if (this.previewActive()) {
      this.previewIndex.set(nextIndex);
    }
  }

  @HostListener('pointerleave')
  @HostListener('blur')
  queueClose(): void {
    this.clearTimer('open');
    this.clearTimer('close');
    this.closeTimer = this.document.defaultView?.setTimeout(() => {
      this.deactivate();
    }, IMAGE_PREVIEW_CLOSE_DELAY_MS);
  }

  @HostListener('focus')
  openFromFocus(): void {
    if (!this.canUsePreview()) {
      return;
    }

    this.clearTimer('open');
    this.clearTimer('close');
    this.activate(0);
  }

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.previewActive()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.deactivate();
      return;
    }

    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const imageCount = this.postImagePreviewImages.length;
    this.previewIndex.set((this.previewIndex() + direction + imageCount) % imageCount);
  }

  settle(url: string): void {
    const settledUrls = this.previewSettledUrls();

    if (!this.previewActive() || settledUrls.has(url)) {
      return;
    }

    this.previewSettledUrls.set(new Set([...settledUrls, url]));
  }

  statusId(): string {
    return `post-image-preview-status-${this.previewId}`;
  }

  buffering(): boolean {
    return this.previewActive()
      && this.previewSettledUrls().size < this.postImagePreviewImages.length;
  }

  status(): string {
    const image = this.postImagePreviewImages[this.previewIndex()];
    const imageDescription = image?.alt.trim() || `${this.postImagePreviewTitle} interior image`;

    return `Preview ${this.previewIndex() + 1} of ${this.postImagePreviewImages.length}: ${imageDescription}`;
  }

  private canUsePreview(): boolean {
    return this.isBrowser
      && this.postImagePreviewImages.length > 0
      && this.document.defaultView?.matchMedia('(hover: hover) and (pointer: fine)').matches === true;
  }

  private indexFromPointer(event: PointerEvent): number {
    const imageCount = this.postImagePreviewImages.length;

    if (!imageCount) {
      return 0;
    }

    const target = event.currentTarget;

    if (!(target instanceof HTMLElement)) {
      return this.previewIndex();
    }

    const bounds = target.getBoundingClientRect();

    if (bounds.width <= 0) {
      return this.previewIndex();
    }

    const pointerProgress = Math.min(0.999, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    return Math.floor(pointerProgress * imageCount);
  }

  private activate(imageIndex: number): void {
    const imageCount = this.postImagePreviewImages.length;

    if (!imageCount) {
      return;
    }

    this.previewIndex.set(Math.min(imageCount - 1, Math.max(0, imageIndex)));
    this.previewSettledUrls.set(new Set<string>());
    this.previewActive.set(true);
  }

  private deactivate(): void {
    this.previewActive.set(false);
    this.previewIndex.set(0);
    this.previewSettledUrls.set(new Set<string>());
  }

  private clearTimer(timer: 'open' | 'close'): void {
    const window = this.document.defaultView;
    const timerId = timer === 'open' ? this.openTimer : this.closeTimer;

    if (timerId !== undefined) {
      window?.clearTimeout(timerId);
    }

    if (timer === 'open') {
      this.openTimer = undefined;
    } else {
      this.closeTimer = undefined;
    }
  }
}
