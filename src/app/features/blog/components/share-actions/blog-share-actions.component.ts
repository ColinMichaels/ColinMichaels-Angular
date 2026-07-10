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
  signal,
} from '@angular/core';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faFacebook, faLinkedin, faXTwitter} from '@fortawesome/free-brands-svg-icons';
import {faEnvelope, faLink} from '@fortawesome/free-solid-svg-icons';
import {BlogShareEvent, BlogShareProvider} from '../../services/blog-engagement.service';
import {createOpaqueShareId} from '../../services/share-attribution.service';

type BlogShareVariant = 'compact' | 'panel';

@Component({
  selector: 'app-blog-share-actions',
  imports: [
    FontAwesomeModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="containerClass" role="group" [attr.aria-label]="groupLabel">
      @if (variant === 'panel') {
        <span class="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">{{ label }}</span>
      }

      <div class="flex items-center gap-2">
        <a
          [href]="xShareUrl"
          target="_blank"
          rel="noopener noreferrer"
          [class]="iconClass"
          [attr.aria-label]="'Share ' + plainTitle + ' on X'"
          title="Share on X"
          (click)="trackShare('x')"
        >
          <fa-icon [icon]="faXTwitter"></fa-icon>
        </a>
        <a
          [href]="linkedInShareUrl"
          target="_blank"
          rel="noopener noreferrer"
          [class]="iconClass"
          [attr.aria-label]="'Share ' + plainTitle + ' on LinkedIn'"
          title="Share on LinkedIn"
          (click)="trackShare('linkedin')"
        >
          <fa-icon [icon]="faLinkedin"></fa-icon>
        </a>
        <a
          [href]="facebookShareUrl"
          target="_blank"
          rel="noopener noreferrer"
          [class]="iconClass"
          [attr.aria-label]="'Share ' + plainTitle + ' on Facebook'"
          title="Share on Facebook"
          (click)="trackShare('facebook')"
        >
          <fa-icon [icon]="faFacebook"></fa-icon>
        </a>
        <a
          [href]="emailShareUrl"
          target="_blank"
          rel="noopener noreferrer"
          [class]="iconClass"
          [attr.aria-label]="'Share ' + plainTitle + ' by email'"
          title="Share by email"
          (click)="trackShare('email')"
        >
          <fa-icon [icon]="faEnvelope"></fa-icon>
        </a>
        <button
          type="button"
          [class]="iconClass"
          [attr.aria-label]="copied() ? 'Copied ' + linkLabel + ' link' : 'Copy ' + linkLabel + ' link'"
          [title]="copied() ? 'Copied link' : 'Copy link'"
          (click)="copyShareUrl()"
        >
          <fa-icon [icon]="faLink"></fa-icon>
        </button>
      </div>
    </div>
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
  protected readonly faEnvelope = faEnvelope;
  protected readonly faFacebook = faFacebook;
  protected readonly faLink = faLink;
  protected readonly faLinkedin = faLinkedin;
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
    return this.variant === 'panel'
      ? 'flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-950/5 dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-black/20'
      : 'flex items-center gap-2';
  }

  protected get iconClass(): string {
    return this.variant === 'panel'
      ? 'inline-flex h-10 w-10 items-center justify-center rounded border border-slate-300 bg-slate-50 text-slate-700 transition hover:border-cyan-600 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:border-cyan-300 dark:hover:bg-transparent dark:hover:text-cyan-200 dark:focus:ring-cyan-300 dark:focus:ring-offset-zinc-950'
      : 'inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:border-cyan-600 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-cyan-300 dark:hover:bg-transparent dark:hover:text-cyan-200 dark:focus:ring-cyan-300 dark:focus:ring-offset-zinc-900';
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
