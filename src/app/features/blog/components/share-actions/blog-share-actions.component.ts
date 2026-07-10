import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  computed,
  signal,
} from '@angular/core';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faFacebook, faLinkedin, faXTwitter} from '@fortawesome/free-brands-svg-icons';
import {faEnvelope, faLink, faShareNodes} from '@fortawesome/free-solid-svg-icons';
import {BlogShareEvent, BlogShareProvider} from '../../services/blog-engagement.service';
import {createOpaqueShareId} from '../../services/share-attribution.service';

type BlogShareVariant = 'compact' | 'panel' | 'toolbar';

@Component({
  selector: 'app-blog-share-actions',
  imports: [
    FontAwesomeModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class]="containerClass"
      role="group"
      [attr.aria-label]="groupLabel"
      (pointerenter)="openShareFanOnPointerEnter($event)"
      (pointerleave)="closeShareFanOnPointerLeave($event)"
      (focusout)="closeShareFanOnFocusOut($event)"
      (keydown.escape)="closeShareFanFromKeyboard($event)"
    >
      @if (variant === 'panel') {
        <span class="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">{{ label }}</span>
      }

      @if (variant === 'toolbar') {
        <button
          type="button"
          data-share-trigger
          [class]="iconClass"
          [attr.aria-expanded]="shareFanVisible()"
          [attr.aria-label]="shareFanVisible() ? 'Close share options' : 'Open share options'"
          title="Share"
          (click)="toggleShareFan()"
        >
          <fa-icon [icon]="faShareNodes"></fa-icon>
        </button>
      }

      <div
        [class]="actionsClass"
        [class.share-fan__actions--open]="variant === 'toolbar' && shareFanVisible()"
        [attr.aria-hidden]="variant === 'toolbar' ? !shareFanVisible() : null"
      >
        <a
          data-share-provider="x"
          [href]="xShareUrl"
          target="_blank"
          rel="noopener noreferrer"
          [class]="iconClass"
          [attr.tabindex]="shareActionTabIndex"
          [attr.aria-label]="'Share ' + plainTitle + ' on X'"
          title="Share on X"
          (click)="trackShareAndClose('x')"
        >
          <fa-icon [icon]="faXTwitter"></fa-icon>
        </a>
        <a
          data-share-provider="linkedin"
          [href]="linkedInShareUrl"
          target="_blank"
          rel="noopener noreferrer"
          [class]="iconClass"
          [attr.tabindex]="shareActionTabIndex"
          [attr.aria-label]="'Share ' + plainTitle + ' on LinkedIn'"
          title="Share on LinkedIn"
          (click)="trackShareAndClose('linkedin')"
        >
          <fa-icon [icon]="faLinkedin"></fa-icon>
        </a>
        <a
          data-share-provider="facebook"
          [href]="facebookShareUrl"
          target="_blank"
          rel="noopener noreferrer"
          [class]="iconClass"
          [attr.tabindex]="shareActionTabIndex"
          [attr.aria-label]="'Share ' + plainTitle + ' on Facebook'"
          title="Share on Facebook"
          (click)="trackShareAndClose('facebook')"
        >
          <fa-icon [icon]="faFacebook"></fa-icon>
        </a>
        <a
          data-share-provider="email"
          [href]="emailShareUrl"
          target="_blank"
          rel="noopener noreferrer"
          [class]="iconClass"
          [attr.tabindex]="shareActionTabIndex"
          [attr.aria-label]="'Share ' + plainTitle + ' by email'"
          title="Share by email"
          (click)="trackShareAndClose('email')"
        >
          <fa-icon [icon]="faEnvelope"></fa-icon>
        </a>
        <button
          type="button"
          data-share-provider="copy"
          [class]="iconClass"
          [attr.tabindex]="shareActionTabIndex"
          [attr.aria-label]="copied() ? 'Copied ' + linkLabel + ' link' : 'Copy ' + linkLabel + ' link'"
          [title]="copied() ? 'Copied link' : 'Copy link'"
          (click)="copyShareUrl()"
        >
          <fa-icon [icon]="faLink"></fa-icon>
        </button>
      </div>
    </div>
  `,
  styles: `
    .share-fan__actions {
      opacity: 0;
      pointer-events: none;
      transform: translate3d(0.5rem, -50%, 0) scale(0.96);
      transform-origin: right center;
      visibility: hidden;
      transition:
        opacity 160ms ease-in-out,
        transform 180ms ease-in-out,
        visibility 0s linear 180ms;
    }

    .share-fan__actions--open {
      opacity: 1;
      pointer-events: auto;
      transform: translate3d(0, -50%, 0) scale(1);
      visibility: visible;
      transition-delay: 0s;
    }

    @media (prefers-reduced-motion: reduce) {
      .share-fan__actions,
      .share-fan__actions--open {
        transition: none;
      }
    }

    :host-context(.reader-motion-reduce) .share-fan__actions,
    :host-context(.reader-motion-reduce) .share-fan__actions--open {
      transition: none;
    }
  `,
})
export class BlogShareActionsComponent implements OnDestroy {
  @Input({required: true}) title = '';
  @Input({required: true}) path = '';
  @Input() excerpt = '';
  @Input() url = '';
  @Input() variant: BlogShareVariant = 'compact';
  @Input() label = 'Share';
  @Input() groupLabel = 'Share this post';
  @Input() linkLabel = 'post';
  @Input() trackingEnabled = false;
  @Output() shared = new EventEmitter<BlogShareEvent>();

  protected readonly copied = signal(false);
  protected readonly shareFanOpen = signal(false);
  private readonly shareFanHovered = signal(false);
  protected readonly shareFanVisible = computed(() => this.shareFanOpen() || this.shareFanHovered());
  protected readonly faEnvelope = faEnvelope;
  protected readonly faFacebook = faFacebook;
  protected readonly faLink = faLink;
  protected readonly faLinkedin = faLinkedin;
  protected readonly faShareNodes = faShareNodes;
  protected readonly faXTwitter = faXTwitter;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly shareIds = new Map<BlogShareProvider, string>();
  private copyResetHandle: ReturnType<typeof setTimeout> | undefined;

  ngOnDestroy(): void {
    if (this.copyResetHandle) {
      clearTimeout(this.copyResetHandle);
    }
  }

  protected get containerClass(): string {
    switch (this.variant) {
      case 'panel':
        return 'flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-950/5 dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-black/20';
      case 'toolbar':
        return 'relative flex items-center';
      default:
        return 'flex items-center gap-2';
    }
  }

  protected get actionsClass(): string {
    return this.variant === 'toolbar'
      ? 'share-fan__actions absolute right-[calc(100%+0.25rem)] top-1/2 z-50 flex items-center gap-1 rounded border border-slate-200 bg-white/95 p-1 shadow-lg shadow-slate-950/10 backdrop-blur-xl dark:border-zinc-700 dark:bg-neutral-950/95 dark:shadow-black/30'
      : 'flex items-center gap-2';
  }

  protected get shareActionTabIndex(): number | null {
    return this.variant === 'toolbar' && !this.shareFanVisible() ? -1 : null;
  }

  protected get iconClass(): string {
    switch (this.variant) {
      case 'panel':
        return 'inline-flex h-10 w-10 items-center justify-center rounded border border-slate-300 bg-slate-50 text-slate-700 transition hover:border-cyan-600 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:border-cyan-300 dark:hover:bg-transparent dark:hover:text-cyan-200 dark:focus:ring-cyan-300 dark:focus:ring-offset-zinc-950';
      case 'toolbar':
        return 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-xs text-slate-600 transition hover:border-cyan-600 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-white dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-cyan-300 dark:hover:bg-transparent dark:hover:text-cyan-200 dark:focus:ring-cyan-300 dark:focus:ring-offset-zinc-900';
      default:
        return 'inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:border-cyan-600 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-cyan-300 dark:hover:bg-transparent dark:hover:text-cyan-200 dark:focus:ring-cyan-300 dark:focus:ring-offset-zinc-900';
    }
  }

  protected get xShareUrl(): string {
    return `https://twitter.com/intent/tweet?url=${this.encodedShareUrl('x')}&text=${this.encodedTitle}`;
  }

  protected get linkedInShareUrl(): string {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${this.encodedShareUrl('linkedin')}`;
  }

  protected get facebookShareUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${this.encodedShareUrl('facebook')}`;
  }

  protected get emailShareUrl(): string {
    const body = this.plainExcerpt
      ? `${this.plainExcerpt}\n\n${this.createShareUrl('email')}`
      : this.createShareUrl('email');

    return `mailto:?subject=${this.encodedTitle}&body=${encodeURIComponent(body)}`;
  }

  protected copyShareUrl(): void {
    if (!isPlatformBrowser(this.platformId) || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(this.createShareUrl('copy'))
      .then(() => {
        this.copied.set(true);
        this.trackShare('copy');
        this.copyResetHandle = setTimeout(() => {
          this.copied.set(false);
        }, 1600);
      })
      .catch(() => {
        this.copied.set(false);
      });
  }

  protected openShareFanOnPointerEnter(event: PointerEvent): void {
    if (this.variant === 'toolbar' && event.pointerType === 'mouse') {
      this.shareFanHovered.set(true);
    }
  }

  protected toggleShareFan(): void {
    if (this.variant === 'toolbar') {
      this.shareFanOpen.update(open => !open);
    }
  }

  protected closeShareFanOnPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.shareFanHovered.set(false);
    }
  }

  protected closeShareFanOnFocusOut(event: FocusEvent): void {
    const group = event.currentTarget as HTMLElement;
    const nextTarget = event.relatedTarget as Node | null;

    if (!nextTarget || !group.contains(nextTarget)) {
      this.shareFanOpen.set(false);
    }
  }

  protected closeShareFanFromKeyboard(event: Event): void {
    if (this.variant !== 'toolbar') {
      return;
    }

    event.preventDefault();
    this.shareFanOpen.set(false);
    this.shareFanHovered.set(false);
    const group = event.currentTarget as HTMLElement;
    group.querySelector<HTMLButtonElement>('[data-share-trigger]')?.focus({preventScroll: true});
  }

  protected trackShareAndClose(provider: BlogShareProvider): void {
    this.trackShare(provider);

    if (this.variant === 'toolbar') {
      this.shareFanOpen.set(false);
      this.shareFanHovered.set(false);
    }
  }

  protected trackShare(provider: BlogShareProvider): void {
    this.shared.emit({
      provider,
      shareId: this.trackingEnabled ? this.getShareId(provider) : null,
      shareUrl: this.createShareUrl(provider),
    });
  }

  private encodedShareUrl(provider: BlogShareProvider): string {
    return encodeURIComponent(this.createShareUrl(provider));
  }

  private get encodedTitle(): string {
    return encodeURIComponent(this.plainTitle);
  }

  protected get plainTitle(): string {
    return this.toPlainText(this.title);
  }

  private get plainExcerpt(): string {
    return this.toPlainText(this.excerpt);
  }

  private get shareUrl(): string {
    const explicitUrl = this.url.trim();

    if (explicitUrl) {
      return explicitUrl;
    }

    const normalizedPath = this.path.replace(/^\/+/, '');

    return normalizedPath
      ? `${this.document.location.origin}/${normalizedPath}`
      : this.document.location.origin;
  }

  private createShareUrl(provider: BlogShareProvider): string {
    if (!this.trackingEnabled) {
      return this.shareUrl;
    }

    const separator = this.shareUrl.includes('?') ? '&' : '?';
    return `${this.shareUrl}${separator}share=${encodeURIComponent(this.getShareId(provider))}`;
  }

  private getShareId(provider: BlogShareProvider): string {
    const existing = this.shareIds.get(provider);
    if (existing) {
      return existing;
    }

    const shareId = createOpaqueShareId();
    this.shareIds.set(provider, shareId);
    return shareId;
  }

  private toPlainText(value: string): string {
    const element = this.document.createElement('div');
    element.innerHTML = value;

    return element.textContent?.trim() ?? value.trim();
  }
}
