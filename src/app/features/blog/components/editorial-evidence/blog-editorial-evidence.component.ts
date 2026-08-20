import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {RouterLink} from '@angular/router';

import {BlogEvidenceBasis, BlogPost} from '../../models/blog-post.model';
import {
  BLOG_EVIDENCE_BASIS_DESCRIPTIONS,
  BLOG_EVIDENCE_BASIS_LABELS,
} from '../../utils/blog-editorial-metadata.util';
import {collectBlogReferenceUrls} from '../../utils/blog-reference-urls.util';

@Component({
  selector: 'app-blog-editorial-evidence',
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (post(); as currentPost) {
      <aside
        class="site-card overflow-hidden border-l-2 border-l-cyan-500/70 bg-cyan-50/45 dark:bg-cyan-400/[0.035]"
        aria-labelledby="article-evidence-heading"
      >
        <details class="article-evidence-details">
          <summary
            class="article-evidence-summary flex min-h-12 cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left outline-none transition-colors hover:bg-cyan-100/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600 dark:hover:bg-cyan-300/[0.06] dark:focus-visible:ring-cyan-300"
          >
            <span class="min-w-0 flex-1">
              <span class="site-meta hidden text-[0.65rem] text-cyan-800 dark:text-cyan-200 sm:block">Trust & transparency</span>
              <span
                id="article-evidence-heading"
                class="block text-sm font-semibold text-slate-950 dark:text-zinc-50 sm:mt-0.5"
                role="heading"
                aria-level="2"
              >
                Evidence & disclosures
              </span>
            </span>
            @if (currentPost.editorial?.evidenceBasis; as evidenceBasis) {
              <span
                class="hidden shrink-0 border border-cyan-700/25 bg-white/70 px-2 py-1 text-xs font-semibold text-cyan-900 dark:border-cyan-300/25 dark:bg-zinc-950/70 dark:text-cyan-100 sm:inline-flex">
                {{ evidenceBasisLabel(evidenceBasis) }}
              </span>
            } @else {
              <span
                class="hidden shrink-0 border border-amber-600/30 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-950 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100 sm:inline-flex">
                Not yet classified
              </span>
            }
            <span class="shrink-0 text-xs font-semibold text-cyan-800 dark:text-cyan-200">
              <span class="evidence-toggle-closed">Read details</span>
              <span class="evidence-toggle-open">Hide details</span>
            </span>
            <svg
              class="article-evidence-chevron h-4 w-4 shrink-0 text-cyan-700 transition-transform dark:text-cyan-300"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              aria-hidden="true"
            >
              <path d="m5 7.5 5 5 5-5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </summary>

          <div class="border-t border-cyan-800/10 px-4 pb-4 pt-3 dark:border-cyan-200/10">
            @if (currentPost.editorial?.evidenceBasis; as evidenceBasis) {
              <p class="text-sm leading-6 text-slate-700 dark:text-zinc-300">
                {{ evidenceBasisDescription(evidenceBasis) }}
              </p>
            } @else {
              <p class="text-sm leading-6 text-slate-700 dark:text-zinc-300">
                This article has not yet been classified under the current editorial standard. It may predate the
                policy;
                do not assume a product was owned, tested, supplied, or independently verified unless the article says
                so.
              </p>
            }

            @if (currentPost.editorial?.evidenceSummary; as evidenceSummary) {
              <p
                class="mt-2.5 border-l border-slate-300 pl-3 text-sm leading-6 text-slate-800 dark:border-zinc-700 dark:text-zinc-200">
                {{ evidenceSummary }}
              </p>
            }

            <dl class="mt-3 grid gap-2.5 text-sm sm:grid-cols-2">
              @if (currentPost.editorial?.sourceReviewedAt; as sourceReviewedAt) {
                <div>
                  <dt class="site-meta">Sources checked</dt>
                  <dd class="mt-1 text-slate-800 dark:text-zinc-200">
                    <time [attr.datetime]="sourceReviewedAt">{{ sourceReviewedAt | date: 'MMM d, y': 'UTC' }}</time>
                  </dd>
                </div>
              }
              @if (referenceCount() > 0) {
                <div>
                  <dt class="site-meta">Linked references</dt>
                  <dd class="mt-1 text-slate-800 dark:text-zinc-200">
                    {{ referenceCount() }} explicit source{{ referenceCount() === 1 ? '' : 's' }} in the article
                  </dd>
                </div>
              }
              @if (currentPost.editorial?.relationshipDisclosure; as disclosure) {
                <div class="sm:col-span-2">
                  <dt class="site-meta">Relationship disclosure</dt>
                  <dd class="mt-1 leading-6 text-slate-800 dark:text-zinc-200">{{ disclosure }}</dd>
                </div>
              }
              @if (currentPost.editorial?.aiAssistanceDisclosure; as disclosure) {
                <div class="sm:col-span-2">
                  <dt class="site-meta">AI assistance</dt>
                  <dd class="mt-1 leading-6 text-slate-800 dark:text-zinc-200">{{ disclosure }}</dd>
                </div>
              }
              @if (currentPost.editorial?.syntheticMediaDisclosure; as disclosure) {
                <div class="sm:col-span-2">
                  <dt class="site-meta">Synthetic media</dt>
                  <dd class="mt-1 leading-6 text-slate-800 dark:text-zinc-200">{{ disclosure }}</dd>
                </div>
              }
              @if (currentPost.editorial?.updateNote; as updateNote) {
                <div class="sm:col-span-2">
                  <dt class="site-meta">Latest substantive update</dt>
                  <dd class="mt-1 leading-6 text-slate-800 dark:text-zinc-200">{{ updateNote }}</dd>
                </div>
              }
            </dl>

            <a
              routerLink="/editorial-standards"
              class="mt-3 inline-flex text-sm font-semibold text-cyan-800 underline decoration-cyan-600/50 underline-offset-4 hover:text-cyan-950 dark:text-cyan-200 dark:hover:text-cyan-100"
            >
              How evidence labels and corrections work
            </a>
          </div>
        </details>
      </aside>
    }
  `,
  styles: `
    .article-evidence-summary {
      list-style: none;
    }

    .article-evidence-summary::-webkit-details-marker {
      display: none;
    }

    .evidence-toggle-open {
      display: none;
    }

    .article-evidence-details[open] .evidence-toggle-closed {
      display: none;
    }

    .article-evidence-details[open] .evidence-toggle-open {
      display: inline;
    }

    .article-evidence-details[open] .article-evidence-chevron {
      transform: rotate(180deg);
    }
  `,
})
export class BlogEditorialEvidenceComponent {
  readonly post = input.required<BlogPost>();

  protected readonly referenceCount = computed(() => (
    collectBlogReferenceUrls(this.post().blocks, this.post().slug).externalReferenceUrls.length
  ));

  protected evidenceBasisLabel(value: BlogEvidenceBasis): string {
    return BLOG_EVIDENCE_BASIS_LABELS[value];
  }

  protected evidenceBasisDescription(value: BlogEvidenceBasis): string {
    return BLOG_EVIDENCE_BASIS_DESCRIPTIONS[value];
  }
}
