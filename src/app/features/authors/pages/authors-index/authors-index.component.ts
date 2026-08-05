import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {
  AUTHORS_INDEX_SEO_METADATA,
  SITE_NAME,
  SITE_URL,
} from '../../../../shared/seo/seo.metadata';
import {SeoService} from '../../../../shared/seo/seo.service';
import {AuthorRepositoryService} from '../../services/author-repository.service';

@Component({
  selector: 'app-authors-index',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="authors-index-page">
      <section class="authors-index-shell">
        <nav class="authors-index-breadcrumb" aria-label="Authors navigation">
          <a routerLink="/">Home</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Authors</span>
        </nav>

        <header class="authors-index-hero">
          <div>
            <h1>Authors</h1>
            <p>Meet the writers behind the articles, projects, and personal stories published here.</p>
            <a [routerLink]="['/', pathNames.WRITE_FOR_US]" class="btn-primary authors-index-hero__action">
              Become an author
            </a>
          </div>
          @if (!isLoading() || authors().length > 0) {
            <p class="authors-index-count" aria-live="polite">{{ authorCountLabel() }}</p>
          }
        </header>

        @if (isLoading() && authors().length === 0) {
          <section class="authors-index-state" role="status" aria-live="polite">
            <span class="authors-index-state__mark" aria-hidden="true"></span>
            <h2>Loading authors</h2>
            <p>The contributor directory is on its way.</p>
          </section>
        } @else if (authors().length > 0) {
          <nav class="authors-directory" aria-label="Published authors" [attr.aria-busy]="isLoading()">
            <ul>
              @for (author of authors(); track author.id) {
                <li>
                  <a [routerLink]="['/', pathNames.AUTHORS, author.slug]" class="author-directory-card">
                    <span class="author-directory-card__portrait">
                      @if (author.avatarUrl) {
                        <img
                          [src]="author.avatarUrl"
                          [alt]="author.imageAlt"
                          width="320"
                          height="320"
                          loading="lazy"
                        >
                      } @else {
                        <span aria-hidden="true">{{ authorInitials(author.name) }}</span>
                      }
                    </span>

                    <span class="author-directory-card__content">
                      <span class="author-directory-card__identity">
                        <strong>{{ author.name }}</strong>
                        @if (author.location) {
                          <span>{{ author.location }}</span>
                        }
                      </span>
                      <span class="author-directory-card__title">{{ author.title }}</span>
                      <span class="author-directory-card__bio">{{ author.shortBio }}</span>
                      <span class="author-directory-card__action">
                        View author profile
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M5 12h14"></path>
                          <path d="m14 6 6 6-6 6"></path>
                        </svg>
                      </span>
                    </span>
                  </a>
                </li>
              }
            </ul>
          </nav>
        } @else {
          <section class="authors-index-state" [attr.role]="loadError() ? 'alert' : 'status'">
            <span class="authors-index-state__mark" aria-hidden="true"></span>
            <h2>No published authors yet</h2>
            <p>{{ loadError() || 'Published author profiles will appear here.' }}</p>
            <a [routerLink]="['/', pathNames.BLOG]">Browse the blog</a>
          </section>
        }
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .authors-index-page {
      min-height: 70vh;
      padding: clamp(2rem, 5vw, 4.5rem) 1rem clamp(4rem, 8vw, 7rem);
      background:
        radial-gradient(circle at 85% 8%, rgb(var(--site-accent-rgb) / 0.09), transparent 24rem),
        var(--site-bg);
      color: var(--site-text);
    }

    .authors-index-shell {
      width: min(100%, 72rem);
      margin-inline: auto;
    }

    .authors-index-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.88rem;
    }

    .authors-index-breadcrumb a {
      color: var(--site-text);
      font-weight: 650;
      text-decoration: none;
    }

    .authors-index-breadcrumb a:hover,
    .authors-index-breadcrumb a:focus-visible {
      color: var(--site-accent-strong);
    }

    .authors-index-hero {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      justify-content: space-between;
      gap: 1.5rem 3rem;
      padding-block: clamp(2.5rem, 7vw, 5.5rem);
      border-bottom: 1px solid var(--site-border);
    }

    .authors-index-hero h1 {
      margin: 0;
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-size: clamp(3rem, 8vw, 6.5rem);
      font-weight: 720;
      letter-spacing: -0.055em;
      line-height: 0.9;
    }

    .authors-index-hero__action {
      margin-top: 1.5rem;
    }

    .authors-index-hero div > p {
      max-width: 42rem;
      margin: 1.5rem 0 0;
      color: var(--site-muted);
      font-size: clamp(1rem, 2vw, 1.2rem);
      line-height: 1.7;
    }

    .authors-index-count {
      margin: 0;
      padding-bottom: 0.25rem;
      color: var(--site-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.78rem;
      font-weight: 750;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .authors-directory {
      padding-top: clamp(2rem, 5vw, 4rem);
    }

    .authors-directory ul {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .author-directory-card {
      display: grid;
      grid-template-columns: 8rem minmax(0, 1fr);
      min-height: 100%;
      overflow: hidden;
      border: 1px solid var(--site-border);
      background: color-mix(in srgb, var(--site-panel) 88%, transparent);
      color: var(--site-text);
      text-decoration: none;
      transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
    }

    .author-directory-card:hover,
    .author-directory-card:focus-visible {
      border-color: var(--site-accent);
      box-shadow: 0 1.25rem 3rem rgb(var(--site-accent-rgb) / 0.1);
      transform: translateY(-0.18rem);
    }

    .author-directory-card:focus-visible {
      outline: 2px solid var(--site-accent-strong);
      outline-offset: 0.2rem;
    }

    .author-directory-card__portrait {
      display: grid;
      min-height: 100%;
      place-items: center;
      overflow: hidden;
      background: var(--site-accent-soft);
      color: var(--site-accent-strong);
      font-family: var(--font-heading);
      font-size: 2rem;
      font-weight: 750;
    }

    .author-directory-card__portrait img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .author-directory-card__content {
      display: flex;
      min-width: 0;
      flex-direction: column;
      padding: 1.25rem;
    }

    .author-directory-card__identity {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.25rem 1rem;
    }

    .author-directory-card__identity strong {
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-size: 1.45rem;
      line-height: 1.15;
    }

    .author-directory-card__identity > span {
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.72rem;
      font-weight: 650;
    }

    .author-directory-card__title {
      margin-top: 0.55rem;
      color: var(--site-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.82rem;
      font-weight: 700;
      line-height: 1.45;
    }

    .author-directory-card__bio {
      display: -webkit-box;
      margin-top: 0.85rem;
      overflow: hidden;
      color: var(--site-muted);
      font-size: 0.9rem;
      line-height: 1.65;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
    }

    .author-directory-card__action {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: auto;
      padding-top: 1rem;
      color: var(--site-heading);
      font-family: var(--font-accent);
      font-size: 0.78rem;
      font-weight: 750;
    }

    .author-directory-card__action svg {
      width: 1rem;
      height: 1rem;
      fill: none;
      stroke: var(--site-accent-strong);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
      transition: transform 180ms ease;
    }

    .author-directory-card:hover .author-directory-card__action svg,
    .author-directory-card:focus-visible .author-directory-card__action svg {
      transform: translateX(0.18rem);
    }

    .authors-index-state {
      margin-top: clamp(2rem, 5vw, 4rem);
      padding: 2rem;
      border: 1px solid var(--site-border);
      background: var(--site-panel-soft);
    }

    .authors-index-state__mark {
      display: block;
      width: 3rem;
      height: 0.25rem;
      background: var(--site-accent);
    }

    .authors-index-state h2 {
      margin: 1rem 0 0;
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-size: 1.5rem;
    }

    .authors-index-state p {
      margin: 0.7rem 0 0;
      color: var(--site-muted);
    }

    .authors-index-state a {
      display: inline-block;
      margin-top: 1rem;
      color: var(--site-accent-strong);
      font-weight: 700;
    }

    @media (max-width: 56rem) {
      .authors-directory ul {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 34rem) {
      .authors-index-page {
        padding-inline: 0.75rem;
      }

      .author-directory-card {
        grid-template-columns: 6.5rem minmax(0, 1fr);
      }

      .author-directory-card__content {
        padding: 1rem;
      }

      .author-directory-card__identity {
        display: block;
      }

      .author-directory-card__identity > span {
        display: block;
        margin-top: 0.25rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .author-directory-card,
      .author-directory-card__action svg {
        transition: none;
      }

      .author-directory-card:hover,
      .author-directory-card:focus-visible {
        transform: none;
      }
    }
  `],
})
export class AuthorsIndexComponent {
  private readonly authorRepository = inject(AuthorRepositoryService);
  private readonly seo = inject(SeoService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly authors = toSignal(this.authorRepository.getPublishedAuthors$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.authorRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.authorRepository.error$, {initialValue: null});
  protected readonly authorCountLabel = computed(() => (
    `${this.authors().length} published ${this.authors().length === 1 ? 'author' : 'authors'}`
  ));

  constructor() {
    effect(() => {
      const authors = this.authors();

      this.seo.apply({
        ...AUTHORS_INDEX_SEO_METADATA,
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `Authors at ${SITE_NAME}`,
          description: AUTHORS_INDEX_SEO_METADATA.description,
          url: `${SITE_URL}/authors`,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: authors.length,
            itemListElement: authors.map((author, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: author.name,
              url: `${SITE_URL}/authors/${author.slug}`,
            })),
          },
        },
      });
    });
  }

  protected authorInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }
}
