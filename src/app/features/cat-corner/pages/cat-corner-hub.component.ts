import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {BlogPostSummary} from '../../blog/models/blog-post.model';
import {BlogRepositoryService} from '../../blog/services/blog-repository.service';
import {resolveBlogPostImage} from '../../blog/utils/blog-image-url.util';

@Component({
  selector: 'app-cat-corner-hub',
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="cat-corner-page">
      <section class="cat-hero" aria-labelledby="cat-corner-title">
        <div class="cat-hero-copy">
          <h1 id="cat-corner-title">Cat Corner</h1>
          <p class="cat-hero-intro">
            Dispatches, photographs, and household intelligence from Gretchen, Cat Corner Editor-in-Chief.
          </p>

          <div class="cat-membership" aria-label="Cat Corner Addict member">
            <svg aria-hidden="true" viewBox="0 0 32 32">
              <ellipse cx="16" cy="21.5" rx="7.6" ry="6.2"></ellipse>
              <ellipse cx="7.7" cy="13.1" rx="3.1" ry="4.2" transform="rotate(-25 7.7 13.1)"></ellipse>
              <ellipse cx="14" cy="9" rx="3.1" ry="4.3" transform="rotate(-7 14 9)"></ellipse>
              <ellipse cx="24.3" cy="13.1" rx="3.1" ry="4.2" transform="rotate(25 24.3 13.1)"></ellipse>
              <ellipse cx="20" cy="9" rx="3.1" ry="4.3" transform="rotate(7 20 9)"></ellipse>
            </svg>
            <span>
              <strong>Cat Corner Addict</strong>
              <small>Secret club. You're in.</small>
            </span>
          </div>

          @if (featuredPost(); as post) {
            <a class="hero-action" [routerLink]="['/', pathNames.BLOG, post.slug]">
              <span>Read Gretchen's latest</span>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M5 12h14M14 7l5 5-5 5"></path>
              </svg>
            </a>
          }
        </div>

        <div class="cat-hero-portrait" aria-hidden="true">
          <picture>
            <source srcset="/assets/images/cat-corner/gretchen-portrait.webp" type="image/webp">
            <img
              src="/assets/images/cat-corner/gretchen-portrait.png"
              alt=""
              width="720"
              height="960"
            >
          </picture>
        </div>
      </section>

      <section class="cat-editorial" aria-live="polite">
        @if (loading()) {
          <div class="cat-status">
            <span class="status-paw" aria-hidden="true">•••</span>
            <h2>Gretchen is sorting the morning papers.</h2>
          </div>
        } @else if (error()) {
          <div class="cat-status cat-status-error" role="alert">
            <span class="status-rule" aria-hidden="true"></span>
            <h2>The dispatches are temporarily under the sofa.</h2>
            <p>Please check back after Gretchen has reviewed the situation.</p>
          </div>
        } @else if (featuredPost(); as post) {
          <article class="featured-dispatch">
            <div class="featured-copy">
              <span class="clay-rule" aria-hidden="true"></span>
              <p class="section-intro">From Gretchen's desk</p>
              <h2><a [routerLink]="['/', pathNames.BLOG, post.slug]">{{ post.title }}</a></h2>
              <p class="featured-excerpt">{{ post.excerpt }}</p>
              <p class="post-meta">
                <time [attr.datetime]="postDate(post)">{{ postDate(post) | date: 'MMM d, y':'UTC' }}</time>
                @if (post.categories[0]; as category) {
                  <span aria-hidden="true">•</span>
                  <span>{{ category }}</span>
                }
              </p>
              <a class="dispatch-link" [routerLink]="['/', pathNames.BLOG, post.slug]">
                <span>Read the dispatch</span>
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"></path></svg>
              </a>
            </div>

            <a class="featured-image" [routerLink]="['/', pathNames.BLOG, post.slug]" tabindex="-1" aria-hidden="true">
              <img [src]="postImage(post)" alt="" loading="eager">
            </a>
          </article>

          @if (latestPosts().length > 0) {
            <section class="latest-dispatches" aria-labelledby="latest-cat-corner-posts">
              <h2 id="latest-cat-corner-posts">Latest from Cat Corner</h2>
              <div class="latest-list">
                @for (latestPost of latestPosts(); track latestPost.id) {
                  <article class="latest-row">
                    <a class="latest-image" [routerLink]="['/', pathNames.BLOG, latestPost.slug]" tabindex="-1" aria-hidden="true">
                      <img [src]="postImage(latestPost)" alt="" loading="lazy">
                    </a>
                    <div class="latest-copy">
                      <h3><a [routerLink]="['/', pathNames.BLOG, latestPost.slug]">{{ latestPost.title }}</a></h3>
                      <p>{{ latestPost.excerpt }}</p>
                      <p class="post-meta">
                        <time [attr.datetime]="postDate(latestPost)">{{ postDate(latestPost) | date: 'MMM d, y':'UTC' }}</time>
                        @if (latestPost.categories[0]; as category) {
                          <span aria-hidden="true">•</span>
                          <span>{{ category }}</span>
                        }
                      </p>
                    </div>
                    <a
                      class="latest-arrow"
                      [routerLink]="['/', pathNames.BLOG, latestPost.slug]"
                      [attr.aria-label]="'Read ' + latestPost.title"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"></path></svg>
                    </a>
                  </article>
                }
              </div>
            </section>
          } @else {
            <div class="single-dispatch-note">
              Gretchen has filed her first dispatch. More household intelligence is in review.
            </div>
          }
        } @else {
          <div class="cat-status cat-empty">
            <svg aria-hidden="true" viewBox="0 0 32 32">
              <ellipse cx="16" cy="21.5" rx="7.6" ry="6.2"></ellipse>
              <ellipse cx="7.7" cy="13.1" rx="3.1" ry="4.2" transform="rotate(-25 7.7 13.1)"></ellipse>
              <ellipse cx="14" cy="9" rx="3.1" ry="4.3" transform="rotate(-7 14 9)"></ellipse>
              <ellipse cx="24.3" cy="13.1" rx="3.1" ry="4.2" transform="rotate(25 24.3 13.1)"></ellipse>
              <ellipse cx="20" cy="9" rx="3.1" ry="4.3" transform="rotate(7 20 9)"></ellipse>
            </svg>
            <h2>Gretchen hasn't published from her desk yet.</h2>
            <p>The corner is open. Its first dispatch is still receiving a final paw of approval.</p>
          </div>
        }
      </section>

      <footer class="cat-footer">
        <div>
          <strong>Colin Michaels</strong>
          <span>Stories that stick.</span>
        </div>
        <nav aria-label="Cat Corner footer navigation">
          <a [routerLink]="['/', pathNames.BLOG]">All Posts</a>
          <span aria-hidden="true">•</span>
          <a routerLink="/">Home</a>
        </nav>
        <p>© {{ currentYear }} Colin Michaels<br>All rights reserved.</p>
      </footer>
    </main>
  `,
  styles: `
    :host {
      --cat-paper: #fff;
      --cat-paper-soft: #fbfaf7;
      --cat-ink: #2d2e2a;
      --cat-muted: #60635d;
      --cat-line: #d8dcd5;
      --cat-sage: #526b4c;
      --cat-sage-deep: #40583c;
      --cat-clay: #b86c40;
      display: block;
      background: var(--cat-paper);
    }

    .cat-corner-page {
      min-height: calc(100dvh - var(--site-header-sticky-height));
      background: var(--cat-paper);
      color: var(--cat-ink);
    }

    .cat-hero,
    .cat-editorial,
    .cat-footer {
      width: min(100%, 90rem);
      margin-inline: auto;
    }

    .cat-hero {
      display: grid;
      min-height: clamp(34rem, 70vh, 48rem);
      padding: clamp(3rem, 7vw, 6.5rem) clamp(1.25rem, 6vw, 6rem) 0;
      grid-template-columns: minmax(0, 1.05fr) minmax(19rem, .8fr);
      align-items: end;
      gap: clamp(1rem, 5vw, 5rem);
      border-bottom: 1px solid var(--cat-line);
      overflow: hidden;
    }

    .cat-hero-copy {
      align-self: center;
      padding-block: 1rem 4rem;
    }

    .cat-hero h1,
    .featured-copy h2,
    .latest-dispatches > h2,
    .latest-copy h3,
    .section-intro,
    .cat-status h2 {
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 400;
    }

    .cat-hero h1 {
      margin: 0;
      color: var(--cat-sage);
      font-size: clamp(5.2rem, calc(10vw * var(--reader-font-scale, 1)), 10.5rem);
      letter-spacing: calc(-.07em + var(--reader-letter-spacing, 0));
      line-height: calc(var(--reader-line-height, 1.65) * .54);
    }

    .cat-hero-intro {
      max-width: 37rem;
      margin: max(clamp(1.5rem, 3vw, 2.5rem), var(--reader-block-gap, 1.5rem)) 0 0;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: clamp(
        1.45rem,
        calc(2.4vw * var(--reader-font-scale, 1)),
        calc(2rem * var(--reader-font-scale, 1))
      );
      letter-spacing: var(--reader-letter-spacing, 0);
      line-height: calc(var(--reader-line-height, 1.65) * .82);
      text-wrap: balance;
      word-spacing: var(--reader-word-spacing, normal);
    }

    .cat-membership {
      display: inline-flex;
      margin-top: calc(var(--reader-block-gap, 1.5rem) + .5rem);
      align-items: center;
      gap: .7rem;
      color: var(--cat-sage-deep);
    }

    .cat-membership svg {
      width: 1.75rem;
      height: 1.75rem;
      flex: none;
      fill: currentColor;
    }

    .cat-membership span {
      display: grid;
      gap: .15rem;
    }

    .cat-membership strong {
      font-size: calc(.95rem * var(--reader-font-scale, 1));
    }

    .cat-membership small {
      color: var(--cat-muted);
      font-size: calc(.8rem * var(--reader-font-scale, 1));
      line-height: calc(var(--reader-line-height, 1.65) * .8);
    }

    .hero-action {
      display: flex;
      width: fit-content;
      min-width: 15.5rem;
      min-height: 3.4rem;
      margin-top: calc(var(--reader-paragraph-gap, 1rem) + .8rem);
      padding: .8rem 1.1rem .8rem 1.25rem;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      border-radius: .3rem;
      background: var(--cat-sage);
      box-shadow: 0 .8rem 1.7rem rgb(46 62 42 / .14);
      color: white;
      font-size: calc(1rem * var(--reader-font-scale, 1));
      font-weight: 700;
      text-decoration: none;
      transition: background-color 160ms ease, transform 160ms ease;
    }

    .hero-action:hover {
      background: var(--cat-sage-deep);
      transform: translateY(-1px);
    }

    .hero-action svg,
    .dispatch-link svg,
    .latest-arrow svg {
      width: 1.45rem;
      height: 1.45rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .cat-hero-portrait {
      width: min(100%, 31rem);
      justify-self: center;
      line-height: 0;
    }

    .cat-hero-portrait img {
      display: block;
      width: 100%;
      height: auto;
      filter: drop-shadow(0 1rem 1.1rem rgb(49 48 42 / .16));
    }

    .cat-editorial {
      border-bottom: 1px solid var(--cat-line);
    }

    .featured-dispatch {
      display: grid;
      padding: clamp(3rem, 6vw, 5.25rem) clamp(1.25rem, 6vw, 6rem);
      grid-template-columns: minmax(16rem, .72fr) minmax(0, 1.28fr);
      align-items: center;
      gap: clamp(2rem, 6vw, 6rem);
      border-bottom: 1px solid var(--cat-line);
      background: var(--cat-paper-soft);
    }

    .featured-copy {
      max-width: 31rem;
    }

    .clay-rule {
      display: block;
      width: 2.1rem;
      height: 2px;
      margin-bottom: 1.15rem;
      background: var(--cat-clay);
    }

    .section-intro {
      margin: 0;
      font-size: clamp(1.7rem, calc(3vw * var(--reader-font-scale, 1)), 3.25rem);
      line-height: calc(var(--reader-line-height, 1.65) * .7);
    }

    .featured-copy h2 {
      margin: calc(var(--reader-paragraph-gap, 1rem) + .6rem) 0 0;
      font-size: clamp(2rem, calc(3.4vw * var(--reader-font-scale, 1)), 4rem);
      line-height: calc(var(--reader-line-height, 1.65) * .65);
    }

    .featured-copy h2 a,
    .latest-copy h3 a {
      color: inherit;
      text-decoration: none;
    }

    .featured-copy h2 a:hover,
    .latest-copy h3 a:hover {
      color: var(--cat-sage);
    }

    .featured-excerpt {
      margin: var(--reader-paragraph-gap, 1rem) 0 0;
      color: var(--cat-muted);
      font-size: calc(1.05rem * var(--reader-font-scale, 1));
      letter-spacing: var(--reader-letter-spacing, 0);
      line-height: var(--reader-line-height, 1.65);
      word-spacing: var(--reader-word-spacing, normal);
    }

    .post-meta {
      display: flex;
      margin: calc(var(--reader-paragraph-gap, 1rem) + .25rem) 0 0;
      flex-wrap: wrap;
      gap: .65rem;
      color: var(--cat-sage-deep);
      font-size: calc(.78rem * var(--reader-font-scale, 1));
      font-weight: 600;
    }

    .dispatch-link {
      display: inline-flex;
      margin-top: calc(var(--reader-paragraph-gap, 1rem) + .6rem);
      padding-bottom: .2rem;
      align-items: center;
      gap: .8rem;
      border-bottom: 1px solid currentColor;
      color: var(--cat-sage-deep);
      font-size: calc(1rem * var(--reader-font-scale, 1));
      font-weight: 700;
      text-decoration: none;
    }

    .featured-image {
      display: block;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      border-radius: .18rem;
      background: #e8e8e3;
    }

    .featured-image img,
    .latest-image img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 420ms cubic-bezier(.2, .75, .2, 1);
    }

    .featured-image:hover img,
    .latest-image:hover img {
      transform: scale(1.025);
    }

    .latest-dispatches {
      padding: clamp(3rem, 6vw, 5rem) clamp(1.25rem, 6vw, 6rem);
    }

    .latest-dispatches > h2 {
      margin: 0 0 1.1rem;
      font-size: clamp(2.4rem, calc(4vw * var(--reader-font-scale, 1)), 4.75rem);
      line-height: calc(var(--reader-line-height, 1.65) * .61);
    }

    .latest-list {
      border-top: 1px solid var(--cat-line);
    }

    .latest-row {
      display: grid;
      padding-block: 1.25rem;
      grid-template-columns: 12rem minmax(0, 1fr) auto;
      align-items: center;
      gap: clamp(1.25rem, 3vw, 2.2rem);
      border-bottom: 1px solid var(--cat-line);
    }

    .latest-image {
      display: block;
      aspect-ratio: 3 / 2;
      overflow: hidden;
      border-radius: .2rem;
      background: #e8e8e3;
    }

    .latest-copy h3 {
      margin: 0;
      font-size: clamp(1.45rem, calc(2.4vw * var(--reader-font-scale, 1)), 2.8rem);
      line-height: calc(var(--reader-line-height, 1.65) * .7);
    }

    .latest-copy > p:not(.post-meta) {
      max-width: 43rem;
      margin: max(.55rem, calc(var(--reader-paragraph-gap, 1rem) - .45rem)) 0 0;
      color: var(--cat-muted);
      font-size: calc(1rem * var(--reader-font-scale, 1));
      letter-spacing: var(--reader-letter-spacing, 0);
      line-height: var(--reader-line-height, 1.65);
      word-spacing: var(--reader-word-spacing, normal);
    }

    .latest-copy .post-meta {
      margin-top: .75rem;
    }

    .latest-arrow {
      display: grid;
      width: 3rem;
      height: 3rem;
      place-items: center;
      color: var(--cat-sage-deep);
    }

    .latest-arrow:hover {
      color: var(--cat-clay);
    }

    .single-dispatch-note {
      padding: 1.5rem clamp(1.25rem, 6vw, 6rem) 4rem;
      color: var(--cat-muted);
      font-size: calc(1rem * var(--reader-font-scale, 1));
      font-style: italic;
      line-height: var(--reader-line-height, 1.65);
    }

    .cat-status {
      display: grid;
      min-height: 27rem;
      padding: 5rem 1.25rem;
      place-content: center;
      justify-items: center;
      text-align: center;
    }

    .cat-status h2 {
      max-width: 17ch;
      margin: var(--reader-paragraph-gap, 1rem) 0 0;
      font-size: clamp(2rem, calc(4vw * var(--reader-font-scale, 1)), 4.5rem);
      line-height: calc(var(--reader-line-height, 1.65) * .66);
    }

    .cat-status p {
      max-width: 32rem;
      margin: var(--reader-paragraph-gap, 1rem) 0 0;
      color: var(--cat-muted);
      font-size: calc(1rem * var(--reader-font-scale, 1));
      letter-spacing: var(--reader-letter-spacing, 0);
      line-height: var(--reader-line-height, 1.65);
      word-spacing: var(--reader-word-spacing, normal);
    }

    .cat-empty svg {
      width: 3.25rem;
      height: 3.25rem;
      fill: var(--cat-sage);
    }

    .status-paw {
      color: var(--cat-clay);
      font-size: 1.25rem;
      letter-spacing: .45rem;
      animation: papers 1.4s ease-in-out infinite;
    }

    .status-rule {
      width: 2.5rem;
      height: 2px;
      background: var(--cat-clay);
    }

    .cat-footer {
      display: grid;
      padding: 2rem clamp(1.25rem, 6vw, 6rem) 2.5rem;
      grid-template-columns: 1fr auto 1fr;
      align-items: end;
      gap: 2rem;
      color: var(--cat-muted);
      font-size: calc(.82rem * var(--reader-font-scale, 1));
    }

    .cat-footer > div {
      display: grid;
      gap: .25rem;
    }

    .cat-footer strong {
      color: var(--cat-ink);
      font-family: Georgia, 'Times New Roman', serif;
      font-size: calc(1.15rem * var(--reader-font-scale, 1));
      font-weight: 400;
    }

    .cat-footer nav {
      display: flex;
      gap: 1rem;
    }

    .cat-footer a {
      color: var(--cat-ink);
      text-decoration: none;
    }

    .cat-footer a:hover {
      color: var(--cat-sage);
    }

    .cat-footer > p {
      margin: 0;
      text-align: right;
    }

    a:focus-visible {
      outline: 3px solid var(--cat-clay);
      outline-offset: .25rem;
    }

    @keyframes papers {
      0%, 100% { opacity: .35; }
      50% { opacity: 1; }
    }

    :host-context(.dark) {
      --cat-paper: #181916;
      --cat-paper-soft: #20211e;
      --cat-ink: #f1f0ea;
      --cat-muted: #b7b8b0;
      --cat-line: #393c35;
      --cat-sage: #abc1a4;
      --cat-sage-deep: #c2d4bd;
      --cat-clay: #dc966d;
    }

    :host-context(.dark) :is(.featured-image, .latest-image) {
      background: #2b2c28;
    }

    :host-context(.reader-contrast-high) {
      --cat-paper: var(--site-bg);
      --cat-paper-soft: var(--site-section);
      --cat-ink: var(--site-text);
      --cat-muted: var(--site-muted);
      --cat-line: var(--site-border);
      --cat-sage: var(--site-accent-strong);
      --cat-sage-deep: var(--site-accent-strong);
      --cat-clay: var(--site-accent);
    }

    :host-context(.reader-contrast-high) .hero-action {
      background: var(--site-accent);
      color: var(--site-bg);
    }

    @media (max-width: 52rem) {
      .cat-hero {
        position: relative;
        min-height: 35rem;
        padding-top: 3.6rem;
        grid-template-columns: 1fr;
        align-items: start;
      }

      .cat-hero-copy {
        position: relative;
        z-index: 1;
        align-self: start;
        padding-block: 0 3.5rem;
      }

      .cat-hero h1 {
        max-width: 72%;
        font-size: clamp(4.5rem, calc(18vw * var(--reader-font-scale, 1)), 8rem);
      }

      .cat-hero-intro {
        max-width: min(30rem, 72%);
        font-size: clamp(1.15rem, calc(3.8vw * var(--reader-font-scale, 1)), 2.1rem);
      }

      .cat-hero-portrait {
        position: absolute;
        top: 2.4rem;
        right: clamp(.25rem, 3vw, 2rem);
        width: min(42%, 18rem);
      }

      .featured-dispatch {
        grid-template-columns: minmax(13rem, .78fr) minmax(0, 1.22fr);
        gap: 2rem;
      }

      .latest-row {
        grid-template-columns: 9rem minmax(0, 1fr) auto;
      }

      .cat-footer {
        grid-template-columns: 1fr auto;
      }

      .cat-footer > p {
        grid-column: 1 / -1;
        text-align: left;
      }
    }

    @media (max-width: 40rem) {
      .cat-hero {
        min-height: 37rem;
      }

      .cat-hero h1 {
        max-width: 68%;
      }

      .cat-hero-intro {
        max-width: 75%;
      }

      .featured-dispatch {
        grid-template-columns: 1fr;
      }

      .featured-image {
        grid-row: 1;
      }

      .latest-row {
        grid-template-columns: 6.5rem minmax(0, 1fr);
        align-items: start;
      }

      .latest-copy > p:not(.post-meta) {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      .latest-arrow {
        display: none;
      }

      .cat-footer {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }

      .cat-footer > p {
        grid-column: auto;
      }
    }

    @media (max-width: 28rem) {
      .cat-hero {
        min-height: 39rem;
      }

      .cat-hero h1 {
        max-width: 64%;
        font-size: clamp(4rem, calc(19vw * var(--reader-font-scale, 1)), 7rem);
      }

      .cat-hero-portrait {
        width: 44%;
      }

      .cat-hero-intro {
        max-width: 68%;
        font-size: calc(1.05rem * var(--reader-font-scale, 1));
      }

      .hero-action {
        min-width: min(100%, 15.5rem);
      }

      .latest-row {
        grid-template-columns: 1fr;
      }

      .latest-image {
        aspect-ratio: 16 / 9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .hero-action,
      .featured-image img,
      .latest-image img {
        transition: none;
      }

      .hero-action:hover,
      .featured-image:hover img,
      .latest-image:hover img {
        transform: none;
      }

      .status-paw {
        animation: none;
      }
    }
  `,
})
export class CatCornerHubComponent {
  private readonly blogRepository = inject(BlogRepositoryService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly currentYear = new Date().getFullYear();
  protected readonly posts = toSignal(this.blogRepository.getPublishedCatCornerPosts$(), {initialValue: []});
  protected readonly loading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly error = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly featuredPost = computed(() => this.posts()[0] ?? null);
  protected readonly latestPosts = computed(() => this.posts().slice(1));

  protected postImage(post: BlogPostSummary): string {
    return resolveBlogPostImage(post);
  }

  protected postDate(post: BlogPostSummary): string {
    return post.publishedAt ?? post.updatedAt;
  }
}
