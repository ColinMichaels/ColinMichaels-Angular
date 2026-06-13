import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {Component, Input, OnDestroy, inject, ChangeDetectionStrategy, PLATFORM_ID} from '@angular/core';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faFacebook, faLinkedin, faXTwitter} from '@fortawesome/free-brands-svg-icons';
import {faEnvelope, faLink} from '@fortawesome/free-solid-svg-icons';

type BlogShareVariant = 'compact' | 'panel';

@Component({
  selector: 'app-blog-share-actions',
  imports: [
    FontAwesomeModule,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div [class]="containerClass" role="group" aria-label="Share this post">
      @if (variant === 'panel') {
        <span class="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">Share</span>
      }

      <div class="flex items-center gap-2">
        <a
          [href]="xShareUrl"
          target="_blank"
          rel="noopener noreferrer"
          [class]="iconClass"
          [attr.aria-label]="'Share ' + plainTitle + ' on X'"
          title="Share on X"
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
        >
          <fa-icon [icon]="faEnvelope"></fa-icon>
        </a>
        <button
          type="button"
          [class]="iconClass"
          [attr.aria-label]="copied ? 'Copied post link' : 'Copy post link'"
          [title]="copied ? 'Copied link' : 'Copy link'"
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

  protected copied = false;
  protected readonly faEnvelope = faEnvelope;
  protected readonly faFacebook = faFacebook;
  protected readonly faLink = faLink;
  protected readonly faLinkedin = faLinkedin;
  protected readonly faXTwitter = faXTwitter;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private copyResetHandle: ReturnType<typeof setTimeout> | undefined;

  ngOnDestroy(): void {
    if (this.copyResetHandle) {
      clearTimeout(this.copyResetHandle);
    }
  }

  protected get containerClass(): string {
    return this.variant === 'panel'
      ? 'flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900/70 px-4 py-3'
      : 'flex items-center gap-2';
  }

  protected get iconClass(): string {
    return this.variant === 'panel'
      ? 'inline-flex h-10 w-10 items-center justify-center rounded border border-zinc-700 text-zinc-300 transition hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-zinc-950'
      : 'inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 text-zinc-400 transition hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-zinc-900';
  }

  protected get xShareUrl(): string {
    return `https://twitter.com/intent/tweet?url=${this.encodedShareUrl}&text=${this.encodedTitle}`;
  }

  protected get linkedInShareUrl(): string {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${this.encodedShareUrl}`;
  }

  protected get facebookShareUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${this.encodedShareUrl}`;
  }

  protected get emailShareUrl(): string {
    const body = this.plainExcerpt
      ? `${this.plainExcerpt}\n\n${this.shareUrl}`
      : this.shareUrl;

    return `mailto:?subject=${this.encodedTitle}&body=${encodeURIComponent(body)}`;
  }

  protected copyShareUrl(): void {
    if (!isPlatformBrowser(this.platformId) || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(this.shareUrl)
      .then(() => {
        this.copied = true;
        this.copyResetHandle = setTimeout(() => {
          this.copied = false;
        }, 1600);
      })
      .catch(() => {
        this.copied = false;
      });
  }

  private get encodedShareUrl(): string {
    return encodeURIComponent(this.shareUrl);
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

  private toPlainText(value: string): string {
    const element = this.document.createElement('div');
    element.innerHTML = value;

    return element.textContent?.trim() ?? value.trim();
  }
}
