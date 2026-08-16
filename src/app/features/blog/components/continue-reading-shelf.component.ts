import {ChangeDetectionStrategy, Component, Input, inject} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {SiteAnalyticsService} from '../../../shared/analytics/site-analytics.service';
import {
  BlogArticleLibraryRecord,
  BlogArticleLibraryService,
} from '../services/blog-article-library.service';

@Component({
  selector: 'app-continue-reading-shelf',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    '[class.is-empty]': 'visibleRecords().length === 0',
  },
  template: `
    @if (visibleRecords().length > 0) {
      <section
        class="continue-reading-shelf"
        [class.continue-reading-shelf--home]="surface === 'home'"
        [class.continue-reading-shelf--home-editorial]="surface === 'homeEditorial'"
        [class.continue-reading-shelf--blog]="surface === 'blog'"
        aria-labelledby="continue-reading-heading"
        data-testid="continue-reading-shelf"
      >
        <div [class.site-section-inner]="surface === 'home'">
          <header class="continue-reading-shelf__header">
            <div>
              @if (surface !== 'homeEditorial') {
                <p class="eyebrow eyebrow-cyan">Your reading</p>
              }
              <h2 id="continue-reading-heading" class="mt-2 heading-section">Continue reading</h2>
            </div>
            <p class="continue-reading-shelf__intro">
              {{ surface === 'homeEditorial'
                ? 'Pick up where you left off on this device.'
                : 'Pick up from your last saved section. Reading progress stays on this device.' }}
            </p>
          </header>

          <div class="continue-reading-shelf__grid">
            @for (record of visibleRecords(); track record.post.slug) {
              <a
                class="continue-reading-card"
                [routerLink]="['/', pathNames.BLOG, record.post.slug]"
                [fragment]="resumeFragment(record)"
                [attr.aria-label]="resumeAriaLabel(record)"
                (click)="trackResume(record)"
              >
                <img
                  [src]="record.post.coverImage"
                  alt=""
                  class="continue-reading-card__image"
                  loading="lazy"
                  decoding="async"
                  width="320"
                  height="180"
                >
                <span class="continue-reading-card__body">
                  <span class="continue-reading-card__status">
                    <span>{{ record.progressPercent }}% read</span>
                    @if (record.lastHeadingText) {
                      <span class="continue-reading-card__section">Resume at {{ record.lastHeadingText }}</span>
                    }
                  </span>
                  <span class="continue-reading-card__title">{{ record.post.title }}</span>
                  <span class="continue-reading-card__action">
                    {{ surface === 'homeEditorial' ? 'Resume article' : 'Continue article' }}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14"></path>
                      <path d="m14 7 5 5-5 5"></path>
                    </svg>
                  </span>
                </span>
                <span
                  class="continue-reading-card__progress"
                  role="progressbar"
                  [attr.aria-label]="record.post.title + ' reading progress'"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  [attr.aria-valuenow]="record.progressPercent"
                >
                  <span [style.width.%]="record.progressPercent"></span>
                </span>
              </a>
            }
          </div>
        </div>
      </section>
    }
  `,
  styles: [`
    .continue-reading-shelf {
      border-block: 1px solid var(--site-border);
      margin-bottom: clamp(2rem, 4vw, 3rem);
      padding-block: clamp(1.5rem, 3vw, 2.25rem);
    }

    .continue-reading-shelf--home {
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--site-accent-soft) 58%, transparent), transparent 62%),
        var(--site-panel-soft);
      margin-bottom: 0;
    }

    .continue-reading-shelf--home-editorial {
      margin: 0;
      border: 1px solid var(--site-border);
      background: rgba(2, 8, 17, 0.42);
      padding: clamp(1.15rem, 2.5vw, 1.6rem);
    }

    .continue-reading-shelf--home-editorial .continue-reading-shelf__header {
      display: block;
      border-bottom: 1px solid var(--site-border);
      padding-bottom: 1.25rem;
    }

    .continue-reading-shelf--home-editorial .heading-section {
      margin-top: 0;
      font-family: var(--font-editorial, Georgia, 'Times New Roman', serif);
      font-size: clamp(1.75rem, 2.5vw, 2.2rem);
      font-weight: 500;
      letter-spacing: -0.025em;
    }

    .continue-reading-shelf--home-editorial .continue-reading-shelf__intro {
      margin-top: 0.55rem;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .continue-reading-shelf--home-editorial .continue-reading-shelf__grid {
      grid-template-columns: 1fr;
      margin-top: 1.25rem;
    }

    .continue-reading-shelf--home-editorial .continue-reading-card {
      grid-template-columns: minmax(14rem, 0.42fr) minmax(0, 1fr);
      grid-template-rows: minmax(11rem, auto);
      border-color: var(--site-border);
      background: transparent;
    }

    .continue-reading-shelf--home-editorial .continue-reading-card__image {
      object-fit: contain;
    }

    .continue-reading-shelf--home-editorial .continue-reading-card__title {
      font-family: var(--font-editorial, Georgia, 'Times New Roman', serif);
      font-size: 1.35rem;
      font-weight: 500;
    }

    .continue-reading-shelf--home-editorial .continue-reading-card__action {
      min-height: 2.75rem;
      justify-content: space-between;
      border: 1px solid var(--site-accent);
      background: var(--site-accent);
      padding: 0.6rem 0.8rem;
      color: #082f49;
    }

    .continue-reading-shelf--blog {
      margin: 0;
      border: 1px solid var(--site-border);
      background: color-mix(in srgb, var(--site-panel) 72%, var(--site-panel-soft));
      padding: 0.9rem;
    }

    .continue-reading-shelf--blog .continue-reading-shelf__header {
      display: block;
      border-bottom: 1px solid var(--site-border);
      padding-bottom: 0.75rem;
    }

    .continue-reading-shelf--blog .continue-reading-shelf__intro {
      margin-top: 0.4rem;
      font-size: 0.84rem;
      line-height: 1.45;
    }

    .continue-reading-shelf--blog .continue-reading-shelf__grid {
      gap: 0.65rem;
      margin-top: 0.8rem;
    }

    .continue-reading-shelf--blog .continue-reading-card {
      grid-template-columns: 4.75rem minmax(0, 1fr);
      min-height: 6rem;
    }

    .continue-reading-shelf--blog .continue-reading-card__image {
      align-self: stretch;
      aspect-ratio: 1;
      height: auto;
    }

    .continue-reading-shelf--blog .continue-reading-card__body {
      gap: 0.28rem;
      padding: 0.65rem 0.7rem 0.75rem;
    }

    .continue-reading-shelf--blog .continue-reading-card__status {
      font-size: 0.65rem;
    }

    .continue-reading-shelf--blog .continue-reading-card__title {
      font-size: 0.88rem;
      line-height: 1.3;
    }

    .continue-reading-shelf--blog .continue-reading-card__action {
      font-size: 0.72rem;
    }

    .continue-reading-shelf__header {
      align-items: end;
      display: grid;
      gap: 0.75rem 2rem;
    }

    .continue-reading-shelf__intro {
      color: var(--site-muted);
      font-size: 0.92rem;
      line-height: 1.65;
      margin: 0;
      max-width: 34rem;
    }

    .continue-reading-shelf__grid {
      display: grid;
      gap: 0.85rem;
      margin-top: 1.25rem;
    }

    .continue-reading-card {
      background: var(--site-panel);
      border: 1px solid var(--site-border);
      color: var(--site-text);
      display: grid;
      grid-template-columns: 6.5rem minmax(0, 1fr);
      min-height: 7.25rem;
      overflow: hidden;
      position: relative;
      text-decoration: none;
      transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    }

    .continue-reading-card:hover,
    .continue-reading-card:focus-visible {
      border-color: var(--site-accent);
      box-shadow: var(--site-shadow-surface-hover);
      transform: translateY(-2px);
    }

    .continue-reading-card:focus-visible {
      outline: 3px solid var(--site-accent);
      outline-offset: 3px;
    }

    .continue-reading-card__image {
      height: 100%;
      object-fit: cover;
      width: 100%;
    }

    .continue-reading-card__body {
      display: grid;
      gap: 0.45rem;
      grid-template-columns: minmax(0, 1fr);
      min-width: 0;
      padding: 0.85rem 0.95rem 1rem;
    }

    .continue-reading-card__status {
      color: var(--site-muted);
      display: flex;
      flex-wrap: wrap;
      font-size: 0.72rem;
      font-weight: 700;
      gap: 0.3rem 0.7rem;
      letter-spacing: 0.06em;
      min-width: 0;
      text-transform: uppercase;
    }

    .continue-reading-card__section {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .continue-reading-card__title {
      color: var(--site-heading);
      display: -webkit-box;
      font-family: var(--font-accent);
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.35;
      min-width: 0;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .continue-reading-card__action {
      align-items: center;
      align-self: end;
      color: var(--site-accent-strong);
      display: inline-flex;
      font-size: 0.78rem;
      font-weight: 700;
      gap: 0.35rem;
    }

    .continue-reading-card__action svg {
      fill: none;
      height: 1rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
      width: 1rem;
    }

    .continue-reading-card__progress {
      background: color-mix(in srgb, var(--site-border) 72%, transparent);
      bottom: 0;
      height: 0.22rem;
      left: 0;
      position: absolute;
      right: 0;
    }

    .continue-reading-card__progress > span {
      background: var(--site-accent);
      display: block;
      height: 100%;
    }

    :host-context(.reader-motion-reduce) .continue-reading-card {
      transition: none;
    }

    :host-context(.reader-motion-reduce) .continue-reading-card:hover,
    :host-context(.reader-motion-reduce) .continue-reading-card:focus-visible {
      transform: none;
    }

    :host-context(.reader-contrast-high) .continue-reading-shelf--home {
      background: var(--site-panel);
    }

    @media (min-width: 48rem) {
      .continue-reading-shelf__header {
        grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.75fr);
      }

      .continue-reading-shelf__intro {
        justify-self: end;
      }

      .continue-reading-shelf__grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .continue-reading-card {
        grid-template-columns: 1fr;
        grid-template-rows: 7.5rem minmax(0, 1fr);
      }
    }

    @media (max-width: 47.99rem) {
      .continue-reading-shelf--home-editorial .continue-reading-card {
        grid-template-columns: 1fr;
        grid-template-rows: auto minmax(0, 1fr);
      }

      .continue-reading-shelf--home-editorial .continue-reading-card__image {
        height: auto;
        aspect-ratio: 16 / 9;
      }
    }
  `],
})
export class ContinueReadingShelfComponent {
  private readonly library = inject(BlogArticleLibraryService);
  private readonly analytics = inject(SiteAnalyticsService);

  @Input() surface: 'home' | 'homeEditorial' | 'blog' = 'blog';
  @Input() maxRecords = 3;

  protected readonly pathNames = PATH_NAMES;

  protected visibleRecords(): readonly BlogArticleLibraryRecord[] {
    return this.library.inProgress().slice(0, Math.max(1, this.maxRecords));
  }

  protected resumeFragment(record: BlogArticleLibraryRecord): string | undefined {
    return record.lastHeadingId || undefined;
  }

  protected resumeAriaLabel(record: BlogArticleLibraryRecord): string {
    const section = record.lastHeadingText ? ` at ${record.lastHeadingText}` : '';
    return `Continue ${record.post.title}${section}, ${record.progressPercent}% read`;
  }

  protected trackResume(record: BlogArticleLibraryRecord): void {
    this.analytics.trackContinueReading(record.post, record.progressPercent, this.surface);
    this.analytics.trackContentSelection(record.post, 'continue_reading');
  }
}
