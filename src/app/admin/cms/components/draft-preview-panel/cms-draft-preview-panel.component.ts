import {Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal} from '@angular/core';

import {BlogPost, BlogPostStatus} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';

@Component({
  selector: 'app-cms-draft-preview-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-3 border-t border-zinc-800 pt-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-zinc-50">Draft Preview</h2>
          <p class="mt-1 text-sm text-zinc-400">Temporary public link for reviewing unpublished draft content.</p>
        </div>
        <div class="flex items-center gap-2">
          @if (hasActivePreview) {
            <span class="border border-amber-500/60 px-2 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-amber-200">
              Active
            </span>
          }
          <button type="button" (click)="isOpen.set(!isOpen())" class="text-zinc-500 hover:text-zinc-300 transition-colors">
            <span class="block transition-transform duration-200" [class.rotate-180]="isOpen()">▾</span>
          </button>
        </div>
      </div>

      @if (isOpen()) {
      @if (status === 'draft') {
        @if (previewUrl) {
          <a
            [href]="previewUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="block break-all border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-cyan-200 hover:border-cyan-400"
          >
            {{ previewUrl }}
          </a>
          <p class="text-xs leading-5 text-zinc-500">Expires {{ previewExpiresAtLabel }}.</p>
        } @else {
          <p class="text-sm leading-6 text-zinc-500">No active preview link exists for this draft.</p>
        }

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="border border-cyan-400 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
            [disabled]="isInProgress || isSaving || isDeleting"
            (click)="generateRequested.emit()"
          >
            {{ hasActivePreview ? 'Refresh Link' : 'Create Link' }}
          </button>
          <button
            type="button"
            class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
            [disabled]="!previewUrl || isInProgress"
            (click)="copyLink()"
          >
            Copy Link
          </button>
          <button
            type="button"
            class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
            [disabled]="!previewUrl || isInProgress"
            (click)="revokeLink()"
          >
            Revoke
          </button>
          <a
            [href]="previewUrl || null"
            target="_blank"
            rel="noopener noreferrer"
            class="border border-zinc-700 px-3 py-2 text-center text-xs text-zinc-200 hover:bg-zinc-800 aria-disabled:cursor-not-allowed aria-disabled:text-zinc-600"
            [attr.aria-disabled]="previewUrl ? null : 'true'"
          >
            Open
          </a>
        </div>
      } @else {
        <p class="text-sm leading-6 text-zinc-500">Preview links are only available while the post status is draft.</p>
      }

      @if (message) {
        <p class="border border-emerald-500/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">{{ message }}</p>
      }
      @if (error) {
        <p class="border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{{ error }}</p>
      }
      }
    </section>
  `,
})
export class CmsDraftPreviewPanelComponent {
  @Input({required: true}) post!: BlogPost | null;
  @Input({required: true}) status!: BlogPostStatus;
  @Input() isSaving = false;
  @Input() isDeleting = false;

  @Output() generateRequested = new EventEmitter<void>();
  @Output() postChanged = new EventEmitter<BlogPost>();

  private readonly blogRepository = inject(BlogRepositoryService);

  protected readonly isOpen = signal(true);
  protected isInProgress = false;
  protected message = '';
  protected error = '';

  get previewUrl(): string {
    const preview = this.post?.preview;
    return preview && this.hasActivePreview ? this.blogRepository.createPreviewUrl(preview.token) : '';
  }

  get hasActivePreview(): boolean {
    const preview = this.post?.preview;

    if (!preview || this.post?.status !== 'draft') {
      return false;
    }

    const expiresAt = new Date(preview.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  get previewExpiresAtLabel(): string {
    const preview = this.post?.preview;

    if (!preview) {
      return 'not set';
    }

    const expiresAt = new Date(preview.expiresAt);
    return Number.isNaN(expiresAt.getTime()) ? 'not set' : expiresAt.toLocaleString();
  }

  public clearMessages(): void {
    this.message = '';
    this.error = '';
  }

  public onPreviewGenerated(post: BlogPost): void {
    this.isInProgress = false;
    this.message = `Created a temporary draft preview link.`;
    this.postChanged.emit(post);
  }

  public onPreviewError(msg: string): void {
    this.isInProgress = false;
    this.error = msg;
  }

  protected async revokeLink(): Promise<void> {
    this.message = '';
    this.error = '';

    if (!this.post?.preview) {
      this.message = 'There is no active preview link to revoke.';
      return;
    }

    this.isInProgress = true;

    try {
      const updatedPost = await this.blogRepository.revokePreviewForPost(this.post);
      this.message = 'Revoked the draft preview link.';
      this.postChanged.emit(updatedPost);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unable to revoke the preview link.';
    } finally {
      this.isInProgress = false;
    }
  }

  protected async copyLink(): Promise<void> {
    this.message = '';
    this.error = '';

    if (!this.previewUrl) {
      this.error = 'Create a preview link before copying it.';
      return;
    }

    if (!navigator.clipboard) {
      this.error = 'Clipboard access is unavailable in this browser.';
      return;
    }

    try {
      await navigator.clipboard.writeText(this.previewUrl);
      this.message = 'Copied the preview link.';
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unable to copy the preview link.';
    }
  }
}
