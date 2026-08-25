import {DatePipe, DecimalPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faGithub, faInstagram, faLinkedin, faXTwitter, faYoutube} from '@fortawesome/free-brands-svg-icons';
import {
  faBookOpen,
  faCalendarDays,
  faClock,
  faFileLines,
  faFolderOpen,
  faLink,
  faLocationDot,
  faPenNib,
  faQuoteLeft,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogPostListingComponent} from '../../../blog/components/post-listing/blog-post-listing.component';
import {BlogRepositoryService} from '../../../blog/services/blog-repository.service';
import {SeoService} from '../../../../shared/seo/seo.service';
import {HOMEPAGE_OG_IMAGE, SITE_NAME, SITE_URL, createSiteTitle} from '../../../../shared/seo/seo.metadata';
import {
  clampPaginationPage,
  DEFAULT_PAGINATION_PAGE_SIZE,
  getPaginationPageCount,
  paginateItems,
  parsePaginationPage,
} from '../../../../shared/pagination/pagination.util';
import {SitePaginationComponent} from '../../../../shared/pagination/site-pagination.component';
import {
  BLOG_ARCHIVE_VIEW_OPTIONS,
  parseBlogArchiveView,
  resolveBlogArchiveListingLayout,
} from '../../../blog/utils/blog-archive-view.util';
import {AuthorStats} from '../../models/author.model';
import {AuthorRepositoryService} from '../../services/author-repository.service';

@Component({
  selector: 'app-author-page',
  imports: [DatePipe, DecimalPipe, FontAwesomeModule, RouterLink, BlogPostListingComponent, SitePaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page author-resume-page">
      <section class="site-layout site-layout-wide">
        @if (author(); as profile) {
          <nav class="blog-breadcrumb author-breadcrumb" aria-label="Author navigation">
            <a routerLink="/" class="font-medium">Home</a>
            <span aria-hidden="true">/</span>
            <a [routerLink]="['/', pathNames.AUTHORS]" class="font-medium">Authors</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{{ profile.name }}</span>
          </nav>

          <header class="author-hero">
            <aside class="author-contact-rail" aria-label="Author portrait and contact links">
              @if (profile.avatarUrl) {
                <div class="author-portrait-frame">
                  <img [src]="profile.avatarUrl" [alt]="profile.imageAlt" class="author-portrait">
                </div>
              }

              @if (profile.location) {
                <p class="author-location">
                  <fa-icon [icon]="faLocationDot" aria-hidden="true"></fa-icon>
                  <span>{{ profile.location }}</span>
                </p>
              }

              @if (profile.externalProfiles.length) {
                <div class="author-social-links" aria-label="Social profiles">
                  @for (externalProfile of profile.externalProfiles; track externalProfile.url) {
                    <a
                      [href]="externalProfile.url"
                      target="_blank"
                      rel="noopener noreferrer me"
                      class="author-social-link"
                      [class.author-social-link--linkedin]="profilePlatform(externalProfile.label, externalProfile.url) === 'linkedin'"
                    >
                      <fa-icon [icon]="profileIcon(externalProfile.label, externalProfile.url)" aria-hidden="true"></fa-icon>
                      <span>{{ externalProfile.label }}</span>
                      <span class="author-social-link__arrow" aria-hidden="true">↗</span>
                    </a>
                  }
                </div>
              }
            </aside>

            <div class="author-introduction">
              <div class="author-name-block">
                <h1>{{ profile.name }}</h1>
                <span class="author-accent-rule" aria-hidden="true"></span>
              </div>
              <p class="author-title">{{ profile.title }}</p>
              <p class="author-summary">{{ profile.shortBio }}</p>

              <div class="author-quick-facts" aria-label="Author details">
                @if (profile.location) {
                  <span><fa-icon [icon]="faLocationDot" aria-hidden="true"></fa-icon>{{ profile.location }}</span>
                }
                <span><fa-icon [icon]="faPenNib" aria-hidden="true"></fa-icon>Writer &amp; maker</span>
                <a [routerLink]="['/', pathNames.EDITORIAL_STANDARDS]">
                  <fa-icon [icon]="faBookOpen" aria-hidden="true"></fa-icon>Editorial standards
                </a>
              </div>

              @if (stats(); as authorStats) {
                <dl class="author-stats" aria-label="Author publishing statistics">
                  <div>
                    <dt><fa-icon [icon]="faFileLines" aria-hidden="true"></fa-icon>Articles</dt>
                    <dd>{{ authorStats.publishedPosts | number }}</dd>
                  </div>
                  <div>
                    <dt><fa-icon [icon]="faBookOpen" aria-hidden="true"></fa-icon>Words</dt>
                    <dd>{{ authorStats.totalWords | number }}</dd>
                  </div>
                  <div>
                    <dt><fa-icon [icon]="faClock" aria-hidden="true"></fa-icon>Reading time</dt>
                    <dd>{{ authorStats.totalReadingMinutes | number }} min</dd>
                  </div>
                  <div>
                    <dt><fa-icon [icon]="faFolderOpen" aria-hidden="true"></fa-icon>Categories</dt>
                    <dd>{{ authorStats.categoryCount | number }}</dd>
                  </div>
                  <div>
                    <dt><fa-icon [icon]="faCalendarDays" aria-hidden="true"></fa-icon>Latest</dt>
                    <dd>{{ authorStats.latestPublishedAt ? (authorStats.latestPublishedAt | date: 'MMM d, y':'UTC') : '—' }}</dd>
                  </div>
                </dl>
              }
            </div>
          </header>

          @if (bioParagraphs().length) {
            <section class="author-resume-section author-resume-section--bio" aria-labelledby="author-biography-heading">
              <div class="author-section-label">
                <span class="author-section-icon author-section-icon--coral" aria-hidden="true">
                  <fa-icon [icon]="faUser"></fa-icon>
                </span>
                <p>Biography</p>
              </div>
              <div class="author-biography">
                <h2 id="author-biography-heading">A little more about {{ profile.name }}</h2>
                @for (paragraph of bioParagraphs(); track paragraph; let first = $first) {
                  <p [class.author-biography__lead]="first">{{ paragraph }}</p>
                }
              </div>
            </section>
          }

          <section class="author-resume-section author-writing-section" aria-labelledby="author-writing-heading">
            <div class="author-section-label">
              <span class="author-section-icon author-section-icon--cyan" aria-hidden="true">
                <fa-icon [icon]="faQuoteLeft"></fa-icon>
              </span>
              <p>Writing</p>
            </div>
            <div class="author-writing-content">
              <div class="author-section-heading">
                <h2 id="author-writing-heading">Articles by {{ profile.name }}</h2>
                <p>Ideas, project notes, and lessons from the work.</p>
              </div>

              <app-site-pagination
                [totalItems]="posts().length"
                [routeCommands]="['/authors', profile.slug]"
                fragment="author-writing-heading"
                itemLabel="articles"
                [showSummary]="false"
                [showPageNavigation]="false"
                [viewOptions]="archiveViewOptions"
                [activeView]="archiveView()"
                defaultView="list"
                [viewAriaLabel]="'Article view options for ' + profile.name"
              ></app-site-pagination>

              <app-blog-post-listing
                [posts]="paginatedPosts()"
                [layout]="listingLayout()"
                [showTags]="false"
                [showReadLink]="true"
                [excerptLineClamp]="2"
                emptyTitle="No published articles yet"
                emptyMessage="Published writing from this author will appear here."
                [regionLabel]="'Articles by ' + profile.name"
              ></app-blog-post-listing>

              <app-site-pagination
                [currentPage]="currentPage()"
                [totalItems]="posts().length"
                [pageSize]="postsPageSize"
                [routeCommands]="['/authors', profile.slug]"
                fragment="author-writing-heading"
                itemLabel="articles"
                itemLabelSingular="article"
                ariaLabel="Articles pagination"
                [showViewOptions]="false"
              ></app-site-pagination>
            </div>
          </section>
        } @else {
          <section class="blog-section-rule blog-page-header">
            <p class="site-meta">Author unavailable</p>
            <h1 class="blog-page-title mt-3">Author not found</h1>
            <p class="blog-page-description mt-4">This author profile is unavailable or has not been published.</p>
            <a [routerLink]="['/', pathNames.BLOG]" class="blog-action-primary mt-6">Return to the blog</a>
          </section>
        }
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .author-resume-page {
      --author-navy: #071735;
      --author-cyan: #06a9c2;
      --author-cyan-deep: #087b93;
      --author-coral: #f06449;
      --author-gold: #e9ac28;
      padding-top: 1.5rem;
    }

    .author-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.75rem;
    }

    .author-breadcrumb a {
      transition: color 160ms ease;
    }

    .author-breadcrumb a:hover,
    .author-breadcrumb a:focus-visible {
      color: var(--author-cyan-deep);
    }

    .author-hero {
      display: grid;
      gap: clamp(2rem, 5vw, 4.5rem);
      padding: 0 0 clamp(2.5rem, 5vw, 4.5rem);
    }

    .author-contact-rail {
      min-width: 0;
    }

    .author-portrait-frame {
      position: relative;
      overflow: hidden;
      aspect-ratio: 4 / 5;
      background: #dceff3;
      box-shadow: 12px 12px 0 rgb(6 169 194 / 0.16);
    }

    .author-portrait-frame::after {
      position: absolute;
      inset: 0;
      border: 1px solid rgb(7 23 53 / 0.12);
      content: '';
      pointer-events: none;
    }

    .author-portrait {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .author-location {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      margin: 1.75rem 0 0;
      color: var(--site-text);
      font-family: var(--font-accent);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .author-location fa-icon {
      color: var(--author-coral);
    }

    .author-social-links {
      display: grid;
      gap: 0.65rem;
      margin-top: 1.25rem;
    }

    .author-social-link {
      display: grid;
      grid-template-columns: 1.25rem 1fr auto;
      align-items: center;
      gap: 0.75rem;
      min-height: 3rem;
      padding: 0.7rem 0.9rem;
      background: var(--author-navy);
      color: white;
      font-family: var(--font-accent);
      font-size: 0.86rem;
      font-weight: 700;
      text-decoration: none;
      transition: box-shadow 180ms ease, transform 180ms ease;
    }

    .author-social-link--linkedin {
      background: #076ca3;
    }

    .author-social-link:hover,
    .author-social-link:focus-visible {
      box-shadow: 0 10px 24px rgb(7 23 53 / 0.2);
      transform: translateY(-2px);
    }

    .author-social-link__arrow {
      color: rgb(255 255 255 / 0.7);
      font-size: 1rem;
    }

    .author-introduction {
      min-width: 0;
      align-self: center;
    }

    .author-name-block h1 {
      margin: 0;
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-size: clamp(3rem, 7vw, 5.6rem);
      font-weight: 750;
      letter-spacing: -0.045em;
      line-height: 0.94;
    }

    .author-accent-rule {
      display: block;
      width: 3.5rem;
      height: 0.35rem;
      margin-top: 1.6rem;
      background: var(--author-cyan);
      box-shadow: 2rem 0 0 var(--author-gold);
    }

    .author-title {
      max-width: 48rem;
      margin: 2rem 0 0;
      color: var(--site-heading);
      font-family: var(--font-subheading);
      font-size: clamp(1.35rem, 2.3vw, 2rem);
      font-weight: 650;
      line-height: 1.35;
    }

    .author-summary {
      max-width: 48rem;
      margin: 1.25rem 0 0;
      color: var(--site-text);
      font-size: 1.02rem;
      line-height: 1.8;
    }

    .author-quick-facts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem 1.5rem;
      margin-top: 1.5rem;
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.84rem;
      font-weight: 600;
    }

    .author-quick-facts span,
    .author-quick-facts a {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
    }

    .author-quick-facts a {
      color: var(--author-cyan-deep);
      text-decoration: underline;
      text-decoration-color: transparent;
      text-underline-offset: 0.2rem;
      transition: color 160ms ease, text-decoration-color 160ms ease;
    }

    .author-quick-facts a:hover,
    .author-quick-facts a:focus-visible {
      color: var(--site-heading);
      text-decoration-color: currentColor;
    }

    .author-quick-facts fa-icon {
      color: var(--author-cyan-deep);
    }

    .author-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 2rem 0 0;
      border-top: 1px solid var(--site-border);
      border-bottom: 1px solid var(--site-border);
    }

    .author-stats div {
      min-width: 0;
      padding: 1.1rem 0.85rem;
      border-bottom: 1px solid var(--site-border);
    }

    .author-stats div:nth-child(odd) {
      border-right: 1px solid var(--site-border);
    }

    .author-stats div:last-child {
      grid-column: 1 / -1;
      border-bottom: 0;
      border-right: 0;
    }

    .author-stats dt {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .author-stats dt fa-icon {
      color: var(--author-cyan-deep);
      font-size: 0.8rem;
    }

    .author-stats dd {
      margin: 0.55rem 0 0;
      color: var(--author-cyan-deep);
      font-family: var(--font-subheading);
      font-size: clamp(1.05rem, 2vw, 1.45rem);
      font-weight: 750;
      line-height: 1.2;
    }

    .author-resume-section {
      display: grid;
      gap: 2rem;
      margin-inline: calc(var(--site-gutter, 1.5rem) * -1);
      padding: clamp(2.5rem, 5vw, 4.25rem) var(--site-gutter, 1.5rem);
      border-top: 1px solid var(--site-border);
    }

    .author-resume-section--bio {
      background:
        linear-gradient(90deg, rgb(6 169 194 / 0.08), transparent 65%),
        var(--site-section);
    }

    .author-section-label {
      display: flex;
      align-items: flex-start;
      gap: 0.8rem;
    }

    .author-section-label p {
      margin: 0.45rem 0 0;
      color: var(--site-heading);
      font-family: var(--font-accent);
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .author-section-icon {
      display: inline-grid;
      flex: 0 0 auto;
      width: 2rem;
      height: 2rem;
      place-items: center;
      border-bottom: 3px solid currentColor;
      font-size: 0.9rem;
    }

    .author-section-icon--coral {
      color: var(--author-coral);
    }

    .author-section-icon--cyan {
      color: var(--author-cyan);
    }

    .author-biography,
    .author-writing-content {
      min-width: 0;
      max-width: 52rem;
    }

    .author-biography h2,
    .author-section-heading h2 {
      margin: 0 0 1.4rem;
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-size: clamp(1.75rem, 3vw, 2.6rem);
      font-weight: 700;
      line-height: 1.15;
    }

    .author-biography p {
      margin: 1rem 0 0;
      color: var(--site-text);
      font-size: 1rem;
      line-height: 1.85;
    }

    .author-biography .author-biography__lead {
      margin-top: 0;
      color: var(--site-heading);
      font-size: 1.13rem;
      font-weight: 550;
    }

    .author-section-heading {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      justify-content: space-between;
      gap: 0.75rem 1.5rem;
      margin-bottom: 1.75rem;
    }

    .author-section-heading h2 {
      margin-bottom: 0;
    }

    .author-section-heading p {
      max-width: 22rem;
      margin: 0;
      color: var(--site-muted);
      line-height: 1.6;
    }

    @media (min-width: 48rem) {
      .author-hero {
        grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr);
      }

      .author-resume-section {
        grid-template-columns: minmax(9rem, 0.28fr) minmax(0, 1fr);
      }

      .author-biography,
      .author-writing-content {
        max-width: none;
      }
    }

    @media (min-width: 64rem) {
      .author-stats {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }

      .author-stats div,
      .author-stats div:nth-child(odd),
      .author-stats div:last-child {
        grid-column: auto;
        border-right: 1px solid var(--site-border);
        border-bottom: 0;
      }

      .author-stats div:first-child {
        padding-left: 0;
      }

      .author-stats div:last-child {
        border-right: 0;
      }
    }

    @media (max-width: 47.99rem) {
      .author-contact-rail {
        display: grid;
        grid-template-columns: minmax(7rem, 9rem) minmax(0, 1fr);
        gap: 0 1.25rem;
      }

      .author-portrait-frame {
        grid-row: 1 / span 2;
      }

      .author-location {
        align-self: end;
        margin-top: 0;
      }

      .author-social-links {
        align-self: start;
        margin-top: 0.75rem;
      }

      .author-social-link {
        min-height: 2.65rem;
        padding-block: 0.55rem;
      }
    }

    @media (max-width: 30rem) {
      .author-contact-rail {
        grid-template-columns: 1fr;
      }

      .author-portrait-frame {
        grid-row: auto;
        max-width: 14rem;
      }

      .author-location {
        margin-top: 1.5rem;
      }

    }

    @media (prefers-reduced-motion: reduce) {
      .author-social-link {
        transition: none;
      }

      .author-social-link:hover,
      .author-social-link:focus-visible {
        transform: none;
      }
    }

    :host-context(.dark) .author-resume-page {
      --author-cyan-deep: #67d8e6;
    }

    :host-context(.dark) .author-portrait-frame {
      background: #10283a;
      box-shadow: 12px 12px 0 rgb(6 169 194 / 0.14);
    }

    :host-context(.dark) .author-social-link {
      border: 1px solid rgb(103 216 230 / 0.22);
      background: #0a1b34;
    }

    :host-context(.dark) .author-social-link--linkedin {
      background: #064f78;
    }
  `],
})
export class AuthorPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authors = inject(AuthorRepositoryService);
  private readonly blog = inject(BlogRepositoryService);
  private readonly seo = inject(SeoService);
  protected readonly pathNames = PATH_NAMES;
  protected readonly postsPageSize = DEFAULT_PAGINATION_PAGE_SIZE;
  protected readonly archiveViewOptions = BLOG_ARCHIVE_VIEW_OPTIONS;
  protected readonly slug = toSignal(this.route.paramMap.pipe(map(params => params.get('slug') ?? '')), {initialValue: this.route.snapshot.paramMap.get('slug') ?? ''});
  private readonly requestedPage = toSignal(
    this.route.queryParamMap.pipe(map(params => parsePaginationPage(params.get('page')))),
    {initialValue: parsePaginationPage(this.route.snapshot.queryParamMap.get('page'))}
  );
  private readonly requestedView = toSignal(
    this.route.queryParamMap.pipe(map(params => params.get('view'))),
    {initialValue: this.route.snapshot.queryParamMap.get('view')}
  );
  protected readonly archiveView = computed(() => parseBlogArchiveView(this.requestedView(), 'list'));
  protected readonly listingLayout = computed(() => resolveBlogArchiveListingLayout(this.archiveView()));
  private readonly authorList = toSignal(this.authors.getPublishedAuthors$(), {initialValue: []});
  private readonly publishedPosts = toSignal(this.blog.getPublishedPosts$(), {initialValue: []});
  protected readonly author = computed(() => this.authorList().find(author => author.slug === this.slug()));
  protected readonly posts = computed(() => {
    const author = this.author();
    return author ? this.publishedPosts().filter(post => post.authorId === author.id || post.author.slug === author.slug) : [];
  });
  protected readonly totalPages = computed(() => getPaginationPageCount(this.posts().length, this.postsPageSize));
  protected readonly currentPage = computed(() => clampPaginationPage(this.requestedPage(), this.totalPages()));
  protected readonly paginatedPosts = computed(() => paginateItems(
    this.posts(),
    this.currentPage(),
    this.postsPageSize
  ));
  protected readonly bioParagraphs = computed(() => this.author()?.bio.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean) ?? []);
  protected readonly stats = computed<AuthorStats | null>(() => {
    const posts = this.posts();
    if (!this.author()) return null;
    const readingStats = posts.map(post => ({
      wordCount: post.wordCount ?? 0,
      readingMinutes: post.readingMinutes ?? 1,
    }));
    return {
      publishedPosts: posts.length,
      totalWords: readingStats.reduce((total, stats) => total + stats.wordCount, 0),
      totalReadingMinutes: readingStats.reduce((total, stats) => total + stats.readingMinutes, 0),
      categoryCount: new Set(posts.flatMap(post => post.categories)).size,
      latestPublishedAt: posts[0]?.publishedAt ?? posts[0]?.updatedAt ?? null,
    };
  });
  protected readonly faBookOpen = faBookOpen;
  protected readonly faCalendarDays = faCalendarDays;
  protected readonly faClock = faClock;
  protected readonly faFileLines = faFileLines;
  protected readonly faFolderOpen = faFolderOpen;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faPenNib = faPenNib;
  protected readonly faQuoteLeft = faQuoteLeft;
  protected readonly faUser = faUser;

  // Keep icon selection compatible with the existing label-and-URL profile schema.
  protected profilePlatform(label: string, url: string): string {
    const profileName = `${label} ${url}`.toLowerCase();

    if (profileName.includes('linkedin')) return 'linkedin';
    if (profileName.includes('github')) return 'github';
    if (profileName.includes('instagram')) return 'instagram';
    if (profileName.includes('youtube')) return 'youtube';
    if (profileName.includes('twitter') || profileName.includes('x.com')) return 'x';
    return 'website';
  }

  protected profileIcon(label: string, url: string): IconDefinition {
    switch (this.profilePlatform(label, url)) {
      case 'github': return faGithub;
      case 'instagram': return faInstagram;
      case 'linkedin': return faLinkedin;
      case 'x': return faXTwitter;
      case 'youtube': return faYoutube;
      default: return faLink;
    }
  }

  constructor() {
    effect(() => {
      const author = this.author();
      const slug = this.slug();
      if (!author) {
        this.seo.apply({
          title: createSiteTitle('Author not found'), description: 'This author profile is unavailable.',
          path: `/authors/${slug}`, image: HOMEPAGE_OG_IMAGE, imageAlt: `${SITE_NAME} author`, robots: 'noindex,follow', type: 'website',
        });
        return;
      }

      const url = `${SITE_URL}/authors/${author.slug}`;
      this.seo.apply({
        title: createSiteTitle(author.name), description: author.shortBio,
        path: `/authors/${author.slug}`, image: author.avatarUrl || HOMEPAGE_OG_IMAGE,
        imageAlt: author.imageAlt, type: 'website',
        structuredData: {
          '@context': 'https://schema.org', '@type': 'ProfilePage', url,
          mainEntity: {
            '@type': 'Person',
            name: author.name,
            url,
            image: author.avatarUrl,
            jobTitle: author.title,
            sameAs: author.externalProfiles.map(profile => profile.url),
          },
        },
      });
    });
  }
}
