import {Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';

import {AdminControlModuleComponent} from '../../../shared/admin-control-module.component';
import {
  BlogAssistantResult,
  BlogMetadataSuggestion,
  BlogStoredThumbnail,
  BlogThumbnailSuggestion,
} from '../../models/blog-ai-assistant.model';

@Component({
  selector: 'app-cms-assistant-panel',
  imports: [AdminControlModuleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-control-module
      title="AI Writing Assistant"
      [summary]="assistantSummary"
      description="Suggests titles, descriptions, categories, tags, and thumbnail prompts from the current draft."
    >
      <span adminControlModuleStatus class="border border-amber-500/50 px-2 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-amber-200">
        {{ sourceLabel }}
      </span>

      <div class="space-y-3">
      <button
        type="button"
        class="w-full border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
        [disabled]="isLoading"
        (click)="generateRequested.emit()"
      >
        {{ isLoading ? 'Generating Suggestions' : 'Suggest Metadata' }}
      </button>

      @if (error) {
        <p class="border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{{ error }}</p>
      }

      @if (message) {
        <p class="border border-emerald-500/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">{{ message }}</p>
      }

      @if (result) {
        <div class="space-y-4">
          @for (suggestion of result.suggestions; track suggestion.id) {
            <article class="space-y-3 border border-zinc-800 bg-zinc-900/70 p-4">
              <div class="space-y-2">
                <h3 class="text-base font-semibold text-zinc-50">{{ suggestion.title }}</h3>
                <p class="text-sm leading-6 text-zinc-400">{{ suggestion.description }}</p>
                <p class="text-xs text-zinc-500">{{ suggestion.rationale }}</p>
              </div>

              <div class="space-y-2 text-xs text-zinc-400">
                <p><span class="text-zinc-500">Categories:</span> {{ suggestion.categories.join(', ') }}</p>
                <p><span class="text-zinc-500">Tags:</span> {{ suggestion.tags.join(', ') }}</p>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="border border-cyan-500/70 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
                  (click)="applyAll.emit(suggestion)"
                >
                  Apply All
                </button>
                <button
                  type="button"
                  class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                  (click)="applyTitle.emit(suggestion)"
                >
                  Use Title
                </button>
                <button
                  type="button"
                  class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                  (click)="applyDescription.emit(suggestion)"
                >
                  Use Description
                </button>
                <button
                  type="button"
                  class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                  (click)="applyTaxonomy.emit(suggestion)"
                >
                  Use Taxonomy
                </button>
              </div>
            </article>
          }

          <section class="space-y-3 border border-dashed border-zinc-700 bg-black/30 p-4">
            <div>
              <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Thumbnail Generator Prep</h3>
              <p class="mt-2 text-xs leading-5 text-zinc-500">
                These prompts are ready for a future server-backed image generation endpoint.
              </p>
            </div>

            @for (thumbnail of result.thumbnailSuggestions; track thumbnail.id) {
              <article class="space-y-2 border-t border-zinc-800 pt-3">
                <p class="text-xs font-medium uppercase tracking-wide text-cyan-300">{{ thumbnail.style }}</p>
                <p class="text-sm leading-6 text-zinc-300">{{ thumbnail.prompt }}</p>
                <p class="text-xs text-zinc-500">Alt text: {{ thumbnail.altText }}</p>
                <button
                  type="button"
                  class="border border-cyan-500/70 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 aria-disabled:cursor-not-allowed aria-disabled:border-zinc-700 aria-disabled:text-zinc-600 aria-disabled:hover:bg-transparent aria-disabled:hover:text-zinc-600"
                  [attr.aria-disabled]="isThumbnailWriterUnavailable"
                  (click)="requestThumbnailGeneration(thumbnail)"
                >
                  {{ isThumbnailLoading === thumbnail.id ? 'Generating Image' : 'Generate & Store' }}
                </button>
              </article>
            }

            @if (thumbnailError) {
              <p class="border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{{ thumbnailError }}</p>
            }

            @if (lastGeneratedThumbnail) {
              <div class="space-y-2 border border-emerald-500/40 bg-emerald-950/20 p-3 text-xs text-emerald-100">
                <p class="font-medium">Stored thumbnail and applied it to the Cover Image. The Open Graph image remains independent.</p>
                <a [href]="lastGeneratedThumbnail.downloadUrl" target="_blank" rel="noopener noreferrer"
                   class="break-all text-cyan-200 hover:text-cyan-100">
                  {{ lastGeneratedThumbnail.storagePath }}
                </a>
              </div>
            }
          </section>
        </div>
      }
      </div>
    </app-admin-control-module>
  `,
})
export class CmsAssistantPanelComponent {
  @Input({required: true}) result!: BlogAssistantResult | null;
  @Input({required: true}) isLoading!: boolean;
  @Input({required: true}) message!: string;
  @Input({required: true}) error!: string;
  @Input({required: true}) sourceLabel!: string;
  @Input({required: true}) isThumbnailLoading!: string | null;
  @Input() isThumbnailWriterUnavailable = false;
  @Input({required: true}) thumbnailError!: string;
  @Input({required: true}) lastGeneratedThumbnail!: BlogStoredThumbnail | null;

  @Output() generateRequested = new EventEmitter<void>();
  @Output() applyAll = new EventEmitter<BlogMetadataSuggestion>();
  @Output() applyTitle = new EventEmitter<BlogMetadataSuggestion>();
  @Output() applyDescription = new EventEmitter<BlogMetadataSuggestion>();
  @Output() applyTaxonomy = new EventEmitter<BlogMetadataSuggestion>();
  @Output() generateThumbnail = new EventEmitter<BlogThumbnailSuggestion>();

  protected get assistantSummary(): string {
    if (this.isLoading) {
      return 'Generating suggestions';
    }

    const suggestionCount = this.result?.suggestions.length ?? 0;
    return suggestionCount > 0 ? `${suggestionCount} suggestions ready` : 'Optional metadata and thumbnail help';
  }

  protected requestThumbnailGeneration(thumbnail: BlogThumbnailSuggestion): void {
    if (this.isThumbnailWriterUnavailable) return;

    this.generateThumbnail.emit(thumbnail);
  }
}
