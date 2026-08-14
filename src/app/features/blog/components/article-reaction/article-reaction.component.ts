import {ChangeDetectionStrategy, Component, Input, OnChanges, inject} from '@angular/core';

import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {BlogPostSummary} from '../../models/blog-post.model';
import {
  BlogArticleReaction,
  BlogArticleReactionService,
} from '../../services/blog-article-reaction.service';

interface ReactionChoice {
  value: BlogArticleReaction;
  label: string;
}

@Component({
  selector: 'app-article-reaction',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
  template: `
    <section class="border-y border-slate-200 py-6 dark:border-zinc-800" aria-labelledby="article-reaction-heading">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-8">
        <div>
          <h2 id="article-reaction-heading" class="text-lg font-semibold text-slate-950 dark:text-zinc-50">
            What did you think?
          </h2>
          <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-zinc-400">
            One tap helps shape what I cover next.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2" role="group" aria-label="Article feedback">
          @for (choice of choices; track choice.value) {
            <button
              type="button"
              class="min-h-11 border px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:focus-visible:outline-cyan-300"
              [class.border-cyan-600]="selectedReaction === choice.value"
              [class.bg-cyan-50]="selectedReaction === choice.value"
              [class.text-cyan-950]="selectedReaction === choice.value"
              [class.dark:border-cyan-300]="selectedReaction === choice.value"
              [class.dark:bg-cyan-950]="selectedReaction === choice.value"
              [class.dark:text-cyan-50]="selectedReaction === choice.value"
              [class.border-slate-300]="selectedReaction !== choice.value"
              [class.text-slate-700]="selectedReaction !== choice.value"
              [class.hover:border-cyan-600]="selectedReaction !== choice.value"
              [class.hover:text-cyan-800]="selectedReaction !== choice.value"
              [class.dark:border-zinc-700]="selectedReaction !== choice.value"
              [class.dark:text-zinc-300]="selectedReaction !== choice.value"
              [class.dark:hover:border-cyan-300]="selectedReaction !== choice.value"
              [class.dark:hover:text-cyan-100]="selectedReaction !== choice.value"
              [attr.aria-pressed]="selectedReaction === choice.value"
              [attr.data-reaction]="choice.value"
              (click)="selectReaction(choice.value)"
            >
              {{ choice.label }}
            </button>
          }
        </div>
      </div>

      @if (statusMessage) {
        <p class="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
          {{ statusMessage }}
        </p>
      }
    </section>
  `,
})
export class ArticleReactionComponent implements OnChanges {
  @Input({required: true}) post!: BlogPostSummary;
  @Input() signedIn = false;

  protected readonly choices: readonly ReactionChoice[] = [
    {value: 'useful', label: 'Useful'},
    {value: 'surprising', label: 'Surprising'},
    {value: 'more_like_this', label: 'More like this'},
    {value: 'not_for_me', label: 'Not for me'},
  ];
  protected selectedReaction: BlogArticleReaction | null = null;
  protected statusMessage = '';

  private readonly reactions = inject(BlogArticleReactionService);
  private readonly analytics = inject(SiteAnalyticsService);

  ngOnChanges(): void {
    this.selectedReaction = this.post?.slug
      ? this.reactions.getReaction(this.post.slug)
      : null;
    this.statusMessage = '';
  }

  protected selectReaction(reaction: BlogArticleReaction): void {
    if (!this.post?.slug || this.selectedReaction === reaction) {
      return;
    }

    const reactionUpdated = this.selectedReaction !== null;
    this.reactions.setReaction(this.post.slug, reaction);
    this.selectedReaction = reaction;
    this.statusMessage = reactionUpdated
      ? 'Preference updated — thanks.'
      : 'Thanks — this helps shape future stories.';
    this.analytics.trackContentReaction(this.post, reaction, reactionUpdated, this.signedIn);
  }
}
