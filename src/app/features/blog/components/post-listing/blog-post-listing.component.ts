import {DatePipe, NgStyle} from '@angular/common';
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogPostSummary} from '../../models/blog-post.model';
import {createBlogCategorySlug, createBlogTagSlug} from '../../utils/blog-category-url.util';
import {resolveBlogPostImage} from '../../utils/blog-image-url.util';

export type BlogPostListingLayout = 'list' | 'grid' | 'fan' | 'compact';
export type BlogPostListingMediaPresentation = 'standard' | 'background';

export interface BlogPostListingAppearance {
  label?: string;
  accent?: string;
  accentStrong?: string;
  accentRgb?: string;
}

export type BlogPostListingAppearanceByPostId = Readonly<
  Record<string, BlogPostListingAppearance | undefined>
>;

@Component({
  selector: 'app-blog-post-listing',
  standalone: true,
  imports: [
    DatePipe,
    NgStyle,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="post-listing-region"
      role="region"
      [attr.aria-label]="regionLabel"
      [attr.aria-busy]="loading"
      [attr.data-layout]="layout"
      [attr.data-media-presentation]="mediaPresentation"
      [class.post-listing-region--clamped]="excerptLineClamp !== null"
      [class.post-listing-region--title-clamped]="titleLineClamp !== null"
      [class.post-listing-region--background-media]="mediaPresentation === 'background'"
      [style.--listing-excerpt-lines]="excerptLineClamp"
      [style.--listing-title-lines]="titleLineClamp"
    >
      @if (error) {
        <div class="post-listing-state post-listing-state--error" role="alert">
          <span class="post-listing-state__mark" aria-hidden="true">!</span>
          <div>
            <p class="post-listing-state__title">{{ errorTitle }}</p>
            <p class="post-listing-state__message">{{ error }}</p>
          </div>
        </div>
      } @else if (loading) {
        <div class="post-listing-loading" role="status" aria-live="polite">
          <span class="sr-only">{{ loadingLabel }}</span>
          <ul
            class="post-listing post-listing--{{ layout }} post-listing--loading"
            role="list"
            aria-hidden="true"
          >
            @for (item of loadingItems; track item) {
              <li class="post-listing__item post-listing__item--skeleton">
                <article class="post-listing__article">
                  <div class="post-listing__media post-listing-skeleton post-listing-skeleton--media"></div>
                  <div class="post-listing__content">
                    <div class="post-listing-skeleton post-listing-skeleton--meta"></div>
                    <div class="post-listing-skeleton post-listing-skeleton--title"></div>
                    <div class="post-listing-skeleton post-listing-skeleton--copy"></div>
                    <div class="post-listing-skeleton post-listing-skeleton--copy-short"></div>
                  </div>
                </article>
              </li>
            }
          </ul>
        </div>
      } @else if (posts.length) {
        <ul class="post-listing post-listing--{{ layout }}" role="list">
          @for (post of posts; track post.id) {
            <li
              class="post-listing__item"
              [attr.data-post-id]="post.id"
              [ngStyle]="appearanceStyle(post)"
            >
              <article class="post-listing__article">
                <a
                  class="post-listing__media"
                  [routerLink]="['/', pathNames.BLOG, post.slug]"
                  [attr.aria-label]="'Read ' + post.title"
                >
                  <img
                    [src]="postImage(post)"
                    [alt]="post.title + ' cover image'"
                    loading="lazy"
                  >
                </a>

                <div class="post-listing__content">
                  @if (showMeta) {
                    <div class="post-listing__meta">
                      @if (appearanceLabel(post); as label) {
                        <span class="post-listing__topic">{{ label }}</span>
                      }
                      <time [attr.datetime]="postDate(post)">
                        {{ postDate(post) | date: 'MMM d, y':'UTC' }}
                      </time>
                      @for (category of post.categories; track category) {
                        <span class="post-listing__separator" aria-hidden="true">/</span>
                        <a
                          [routerLink]="['/', pathNames.BLOG, 'category', categorySlug(category)]"
                          class="post-listing__taxonomy-link"
                        >
                          {{ category }}
                        </a>
                      }
                    </div>
                  }

                  @if (headingLevel === 2) {
                    <h2 class="post-listing__title">
                      <a
                        [routerLink]="['/', pathNames.BLOG, post.slug]"
                        [attr.aria-label]="postTitleIsTruncated(post) ? 'Read ' + post.title : null"
                      >
                        <span [attr.title]="postTitleIsTruncated(post) ? post.title : null">
                          {{ visiblePostTitle(post) }}
                        </span>
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path d="M5 12h14"></path>
                          <path d="m14 7 5 5-5 5"></path>
                        </svg>
                      </a>
                    </h2>
                  } @else {
                    <h3 class="post-listing__title">
                      <a
                        [routerLink]="['/', pathNames.BLOG, post.slug]"
                        [attr.aria-label]="postTitleIsTruncated(post) ? 'Read ' + post.title : null"
                      >
                        <span [attr.title]="postTitleIsTruncated(post) ? post.title : null">
                          {{ visiblePostTitle(post) }}
                        </span>
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path d="M5 12h14"></path>
                          <path d="m14 7 5 5-5 5"></path>
                        </svg>
                      </a>
                    </h3>
                  }

                  @if (showExcerpt && post.excerpt) {
                    <p class="post-listing__excerpt">{{ post.excerpt }}</p>
                  }

                  @if (showTags && post.tags.length) {
                    <ul class="post-listing__tags" aria-label="Tags">
                      @for (tag of post.tags; track tag) {
                        <li>
                          <a
                            [routerLink]="['/', pathNames.BLOG, 'tag', tagSlug(tag)]"
                            class="post-listing__tag"
                          >
                            {{ tag }}
                          </a>
                        </li>
                      }
                    </ul>
                  }

                  @if (layout === 'fan' || showReadLink) {
                    <a
                      class="post-listing__read-link"
                      [routerLink]="['/', pathNames.BLOG, post.slug]"
                    >
                      {{ readLinkLabel }}
                      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <path d="M5 12h14"></path>
                        <path d="m14 7 5 5-5 5"></path>
                      </svg>
                    </a>
                  }
                </div>
              </article>
            </li>
          }
        </ul>
      } @else {
        <div class="post-listing-state post-listing-state--empty" role="status">
          <span class="post-listing-state__mark" aria-hidden="true">+</span>
          <div>
            <p class="post-listing-state__title">{{ emptyTitle }}</p>
            @if (emptyMessage) {
              <p class="post-listing-state__message">{{ emptyMessage }}</p>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .post-listing-region {
      --listing-accent: var(--site-accent);
      --listing-accent-strong: var(--site-accent-strong);
      --listing-accent-rgb: var(--site-accent-rgb);
      min-width: 0;
      color: var(--site-text);
    }

    .post-listing,
    .post-listing__tags {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .post-listing,
    .post-listing__item,
    .post-listing__article,
    .post-listing__content {
      min-width: 0;
    }

    .post-listing__item {
      --post-accent: var(--listing-accent);
      --post-accent-strong: var(--listing-accent-strong);
      --post-accent-rgb: var(--listing-accent-rgb);
      --post-accent-readable: var(--post-accent-strong);
    }

    :host-context(.light) .post-listing__item {
      --post-accent-readable: color-mix(in srgb, var(--post-accent) 68%, var(--site-heading));
    }

    .post-listing__article {
      color: var(--site-text);
    }

    .post-listing__media {
      position: relative;
      display: block;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      border: 1px solid rgb(var(--post-accent-rgb) / 0.28);
      background:
        linear-gradient(145deg, rgb(var(--post-accent-rgb) / 0.13), transparent 58%),
        var(--site-panel);
    }

    .post-listing__media::after {
      position: absolute;
      inset: 0;
      border: 1px solid rgb(var(--post-accent-rgb) / 0.1);
      content: '';
      pointer-events: none;
    }

    .post-listing__media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: filter 220ms ease, transform 280ms ease;
    }

    .post-listing__content {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .post-listing__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.38rem 0.55rem;
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.76rem;
      letter-spacing: 0.045em;
      line-height: 1.4;
      text-transform: uppercase;
    }

    .post-listing__topic {
      color: var(--post-accent-readable);
      font-weight: 700;
      letter-spacing: 0.11em;
    }

    .post-listing__taxonomy-link,
    .post-listing__tag,
    .post-listing__read-link {
      color: inherit;
      text-decoration: none;
    }

    .post-listing__taxonomy-link:hover,
    .post-listing__taxonomy-link:focus-visible,
    .post-listing__tag:hover,
    .post-listing__tag:focus-visible {
      color: var(--post-accent-readable);
    }

    .post-listing__title {
      margin: 0;
      color: var(--site-heading);
      font-family: var(--font-subheading);
      font-size: clamp(1.15rem, 1rem + 0.45vw, 1.5rem);
      font-weight: 600;
      letter-spacing: 0;
      line-height: 1.25;
      overflow-wrap: anywhere;
      text-wrap: balance;
    }

    .post-listing__title a {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      color: inherit;
      text-decoration: none;
    }

    .post-listing__title span {
      min-width: 0;
    }

    .post-listing-region--title-clamped .post-listing__title span {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: var(--listing-title-lines);
    }

    .post-listing__title svg,
    .post-listing__read-link svg {
      width: 1.25rem;
      height: 1.25rem;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
      transition: transform 180ms ease;
    }

    .post-listing__title a:hover,
    .post-listing__title a:focus-visible,
    .post-listing__read-link:hover,
    .post-listing__read-link:focus-visible {
      color: var(--post-accent-readable);
    }

    .post-listing__title a:hover svg,
    .post-listing__title a:focus-visible svg,
    .post-listing__read-link:hover svg,
    .post-listing__read-link:focus-visible svg {
      transform: translateX(0.18rem);
    }

    .post-listing__excerpt {
      margin: 0;
      color: var(--site-muted);
      font-family: var(--font-body);
      font-size: 0.96rem;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }

    .post-listing-region--clamped .post-listing__excerpt {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: var(--listing-excerpt-lines);
    }

    .post-listing__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-top: 0.15rem;
    }

    .post-listing__tag {
      display: inline-flex;
      border: 1px solid rgb(var(--post-accent-rgb) / 0.25);
      background: rgb(var(--post-accent-rgb) / 0.08);
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.72rem;
      line-height: 1;
      padding: 0.38rem 0.52rem;
    }

    .post-listing__read-link {
      display: flex;
      min-height: 44px;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: auto;
      border-bottom: 1px solid var(--post-accent);
      color: var(--post-accent-readable);
      font-family: var(--font-accent);
      font-size: 0.92rem;
      padding: 0.35rem 0 0.6rem;
    }

    /* Editorial list rows */
    .post-listing--list {
      border-top: 1px solid var(--site-border);
    }

    .post-listing--list .post-listing__item {
      border-bottom: 1px solid var(--site-border);
    }

    .post-listing--list .post-listing__article {
      display: grid;
      grid-template-columns: clamp(10rem, 23vw, 14rem) minmax(0, 1fr);
      gap: clamp(1rem, 2.6vw, 1.6rem);
      align-items: start;
      padding-block: 1.25rem;
    }

    .post-listing--list .post-listing__media {
      aspect-ratio: 16 / 10;
    }

    /* Image-led cards */
    .post-listing--grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
      gap: clamp(1rem, 2.6vw, 1.5rem);
    }

    .post-listing--grid .post-listing__article {
      display: flex;
      height: 100%;
      flex-direction: column;
      border: 1px solid var(--site-border);
      background: var(--site-panel-soft);
      transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
    }

    .post-listing--grid .post-listing__media {
      border: 0;
      border-bottom: 1px solid rgb(var(--post-accent-rgb) / 0.25);
    }

    .post-listing--grid .post-listing__content {
      flex: 1;
      padding: 1.1rem;
    }

    .post-listing--grid .post-listing__item:hover .post-listing__article,
    .post-listing--grid .post-listing__item:focus-within .post-listing__article {
      border-color: rgb(var(--post-accent-rgb) / 0.48);
      box-shadow: 0 16px 38px rgb(var(--post-accent-rgb) / 0.09);
      transform: translateY(-0.2rem);
    }

    /* Overlapping feature fan */
    .post-listing--fan {
      display: flex;
      width: 100%;
      align-items: stretch;
      justify-content: center;
      padding: 2.3rem clamp(1.5rem, 3.5vw, 3.4rem) 2.8rem;
      isolation: isolate;
    }

    .post-listing--fan .post-listing__item {
      width: min(34rem, 42%);
      flex: 0 1 34rem;
      margin-inline: -1rem;
      transform: rotate(-2.4deg) translateY(0.55rem);
      transform-origin: 50% 100%;
      transition: transform 220ms ease, z-index 0s 220ms;
    }

    .post-listing--fan .post-listing__item:nth-child(3n + 2) {
      z-index: 2;
      transform: translateY(-0.8rem);
    }

    .post-listing--fan .post-listing__item:nth-child(3n) {
      transform: rotate(2.4deg) translateY(0.55rem);
    }

    .post-listing--fan .post-listing__item:hover,
    .post-listing--fan .post-listing__item:focus-within {
      z-index: 4;
      transform: translateY(-1.15rem) rotate(0);
      transition-delay: 0s;
    }

    .post-listing--fan .post-listing__article {
      display: flex;
      min-height: 20rem;
      height: 100%;
      flex-direction: column;
      border: 1px solid rgb(var(--post-accent-rgb) / 0.42);
      background:
        linear-gradient(145deg, rgb(var(--post-accent-rgb) / 0.12), transparent 48%),
        var(--site-panel);
      box-shadow: 0 20px 55px rgb(0 0 0 / 0.28);
    }

    .post-listing--fan .post-listing__media {
      display: none;
    }

    .post-listing--fan .post-listing__content {
      flex: 1;
      padding: clamp(1.4rem, 3vw, 2.3rem);
    }

    .post-listing--fan .post-listing__title {
      font-size: clamp(1.35rem, 1rem + 1vw, 2rem);
    }

    .post-listing--fan .post-listing__title svg {
      display: none;
    }

    @media (min-width: 48rem) {
      .post-listing-region--background-media .post-listing--fan .post-listing__article {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        min-height: 21rem;
        background: var(--site-panel);
      }

      .post-listing-region--background-media .post-listing--fan .post-listing__media {
        position: absolute;
        z-index: 0;
        inset: 0;
        display: block;
        aspect-ratio: auto;
        border: 0;
      }

      .post-listing-region--background-media .post-listing--fan .post-listing__media::after {
        border-color: rgb(var(--post-accent-rgb) / 0.24);
        background:
          linear-gradient(180deg, rgb(2 6 12 / 0.24) 0%, rgb(2 6 12 / 0.52) 42%, rgb(2 6 12 / 0.94) 100%),
          linear-gradient(90deg, rgb(2 6 12 / 0.54) 0%, transparent 74%);
      }

      .post-listing-region--background-media .post-listing--fan .post-listing__media img {
        filter: brightness(0.72) saturate(0.82);
        transform: scale(1.01);
      }

      .post-listing-region--background-media .post-listing--fan .post-listing__media:focus-visible {
        outline: 2px solid var(--post-accent-readable);
        outline-offset: -0.45rem;
      }

      .post-listing-region--background-media .post-listing--fan .post-listing__content {
        position: relative;
        z-index: 1;
        min-height: 21rem;
        justify-content: flex-end;
        gap: 0.55rem;
        padding: clamp(1.25rem, 2.5vw, 1.9rem);
      }

      .post-listing-region--background-media .post-listing--fan .post-listing__meta {
        color: rgb(241 245 249 / 0.84);
        font-size: 0.7rem;
        text-shadow: 0 1px 0.45rem rgb(0 0 0 / 0.9);
      }

      .post-listing-region--background-media .post-listing--fan .post-listing__title {
        color: #ffffff;
        font-size: clamp(1.15rem, 1.02rem + 0.42vw, 1.5rem);
        line-height: 1.24;
        text-shadow: 0 2px 0.7rem rgb(0 0 0 / 0.95);
      }

      .post-listing-region--background-media .post-listing--fan .post-listing__excerpt {
        color: rgb(248 250 252 / 0.86);
        font-size: 0.9rem;
        line-height: 1.48;
        text-shadow: 0 1px 0.5rem rgb(0 0 0 / 0.95);
      }

      .post-listing-region--background-media .post-listing--fan .post-listing__read-link {
        border-bottom-color: rgb(var(--post-accent-rgb) / 0.78);
        color: #ffffff;
        text-shadow: 0 1px 0.45rem rgb(0 0 0 / 0.95);
      }

      .post-listing-region--background-media .post-listing--fan .post-listing__item:hover img,
      .post-listing-region--background-media .post-listing--fan .post-listing__item:focus-within img {
        filter: brightness(0.8) saturate(0.96);
        transform: scale(1.04);
      }

      :host-context(.reader-contrast-high)
      .post-listing-region--background-media .post-listing--fan .post-listing__media {
        display: none;
      }

      :host-context(.reader-contrast-high)
      .post-listing-region--background-media .post-listing--fan .post-listing__title,
      :host-context(.reader-contrast-high)
      .post-listing-region--background-media .post-listing--fan .post-listing__read-link {
        color: var(--site-heading);
        text-shadow: none;
      }

      :host-context(.reader-contrast-high)
      .post-listing-region--background-media .post-listing--fan .post-listing__meta,
      :host-context(.reader-contrast-high)
      .post-listing-region--background-media .post-listing--fan .post-listing__excerpt {
        color: var(--site-text);
        text-shadow: none;
      }
    }

    /* Dense index rows */
    .post-listing--compact {
      border-top: 1px solid var(--site-border);
    }

    .post-listing--compact .post-listing__item {
      border-bottom: 1px solid var(--site-border);
    }

    .post-listing--compact .post-listing__article {
      padding-block: 1rem;
    }

    .post-listing--compact .post-listing__media {
      display: none;
    }

    .post-listing--compact .post-listing__content {
      display: grid;
      grid-template-columns: minmax(8.5rem, 0.5fr) minmax(13rem, 1.2fr) minmax(12rem, 1fr);
      gap: 0.75rem 1.25rem;
      align-items: center;
    }

    .post-listing--compact .post-listing__meta {
      align-self: start;
    }

    .post-listing--compact .post-listing__title {
      font-size: 1.05rem;
    }

    .post-listing--compact .post-listing__excerpt {
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .post-listing--compact .post-listing__tags {
      grid-column: 2 / -1;
    }

    /* Owned loading, error, and empty states */
    .post-listing-state {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      border-block: 1px solid var(--site-border);
      color: var(--site-text);
      padding-block: 1.4rem;
    }

    .post-listing-state__mark {
      display: grid;
      width: 2.25rem;
      height: 2.25rem;
      flex: 0 0 auto;
      place-items: center;
      border: 1px solid var(--listing-accent);
      border-radius: 999px;
      color: var(--listing-accent-strong);
      font-family: var(--font-accent);
      font-weight: 700;
    }

    .post-listing-state--error .post-listing-state__mark {
      border-color: #fb7185;
      color: #fb7185;
    }

    .post-listing-state__title,
    .post-listing-state__message {
      margin: 0;
    }

    .post-listing-state__title {
      color: var(--site-heading);
      font-family: var(--font-subheading);
      font-size: 1.05rem;
      font-weight: 600;
    }

    .post-listing-state__message {
      margin-top: 0.3rem;
      color: var(--site-muted);
      line-height: 1.55;
    }

    .post-listing-skeleton {
      overflow: hidden;
      background: var(--site-section);
    }

    .post-listing-skeleton::after {
      display: block;
      width: 45%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgb(var(--listing-accent-rgb) / 0.1), transparent);
      content: '';
      animation: listing-shimmer 1.45s ease-in-out infinite;
      transform: translateX(-140%);
    }

    .post-listing-skeleton--meta {
      width: 42%;
      height: 0.7rem;
    }

    .post-listing-skeleton--title {
      width: 78%;
      height: 1.5rem;
    }

    .post-listing-skeleton--copy,
    .post-listing-skeleton--copy-short {
      width: 100%;
      height: 0.85rem;
    }

    .post-listing-skeleton--copy-short {
      width: 68%;
    }

    @keyframes listing-shimmer {
      to {
        transform: translateX(320%);
      }
    }

    @media (hover: hover) {
      .post-listing__media:hover img,
      .post-listing__media:focus-visible img {
        filter: brightness(1.05);
        transform: scale(1.025);
      }
    }

    @media (max-width: 63.99rem) {
      .post-listing--compact .post-listing__content {
        grid-template-columns: minmax(8rem, 0.45fr) minmax(0, 1.55fr);
      }

      .post-listing--compact .post-listing__excerpt,
      .post-listing--compact .post-listing__tags {
        grid-column: 2;
      }
    }

    @media (max-width: 47.99rem) {
      .post-listing--fan {
        display: grid;
        padding: 0;
        border-top: 1px solid var(--site-border);
      }

      .post-listing--fan .post-listing__item,
      .post-listing--fan .post-listing__item:nth-child(3n + 2),
      .post-listing--fan .post-listing__item:nth-child(3n) {
        width: auto;
        margin: 0;
        border-bottom: 1px solid var(--site-border);
        transform: none;
      }

      .post-listing--fan .post-listing__item:hover,
      .post-listing--fan .post-listing__item:focus-within {
        transform: none;
      }

      .post-listing--fan .post-listing__article {
        display: grid;
        min-height: 0;
        grid-template-columns: minmax(7.5rem, 32vw) minmax(0, 1fr);
        gap: 1rem;
        border: 0;
        background: transparent;
        box-shadow: none;
        padding-block: 1rem;
      }

      .post-listing--fan .post-listing__media {
        display: block;
      }

      .post-listing--fan .post-listing__content {
        padding: 0;
      }

      .post-listing--fan .post-listing__title {
        font-size: 1.15rem;
      }

      .post-listing--fan .post-listing__read-link {
        display: none;
      }
    }

    @media (max-width: 39.99rem) {
      .post-listing--list .post-listing__article {
        grid-template-columns: 1fr;
      }

      .post-listing--compact .post-listing__content {
        grid-template-columns: minmax(0, 1fr);
      }

      .post-listing--compact .post-listing__excerpt,
      .post-listing--compact .post-listing__tags {
        grid-column: 1;
      }
    }

    @media (max-width: 30rem) {
      .post-listing--fan .post-listing__article {
        grid-template-columns: 6.5rem minmax(0, 1fr);
        gap: 0.8rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .post-listing__media img,
      .post-listing__title svg,
      .post-listing__read-link svg,
      .post-listing--grid .post-listing__article,
      .post-listing--fan .post-listing__item {
        transition: none;
      }

      .post-listing-skeleton::after {
        animation: none;
        transform: none;
      }

      .post-listing--fan .post-listing__item,
      .post-listing--fan .post-listing__item:nth-child(3n + 2),
      .post-listing--fan .post-listing__item:nth-child(3n),
      .post-listing--fan .post-listing__item:hover,
      .post-listing--fan .post-listing__item:focus-within,
      .post-listing--grid .post-listing__item:hover .post-listing__article,
      .post-listing--grid .post-listing__item:focus-within .post-listing__article,
      .post-listing__media:hover img,
      .post-listing__media:focus-visible img,
      .post-listing__title a:hover svg,
      .post-listing__title a:focus-visible svg,
      .post-listing__read-link:hover svg,
      .post-listing__read-link:focus-visible svg {
        transform: none;
      }
    }
  `],
})
export class BlogPostListingComponent {
  @Input({required: true}) posts: readonly BlogPostSummary[] = [];
  @Input() layout: BlogPostListingLayout = 'list';
  @Input() headingLevel: 2 | 3 = 2;
  @Input() showExcerpt = true;
  @Input() showTags = true;
  @Input() showMeta = true;
  @Input() showReadLink = false;
  @Input() readLinkLabel = 'Read article';
  @Input() excerptLineClamp: number | null = null;
  @Input() titleLineClamp: number | null = null;
  @Input() titleMaxLength: number | null = null;
  @Input() mediaPresentation: BlogPostListingMediaPresentation = 'standard';
  @Input() loading = false;
  @Input() loadingLabel = 'Loading posts';
  @Input() loadingItemCount = 3;
  @Input() error: string | null = null;
  @Input() errorTitle = 'Unable to load posts';
  @Input() emptyTitle = 'No posts to show';
  @Input() emptyMessage = 'New writing for this section will appear here.';
  @Input() regionLabel = 'Blog posts';
  @Input() appearance: BlogPostListingAppearance | null = null;
  @Input() appearanceByPostId: BlogPostListingAppearanceByPostId = {};

  protected readonly pathNames = PATH_NAMES;

  protected get loadingItems(): readonly number[] {
    const count = Math.min(8, Math.max(1, Math.floor(this.loadingItemCount)));
    return Array.from({length: count}, (_, index) => index);
  }

  protected postImage(post: BlogPostSummary): string {
    return resolveBlogPostImage(post);
  }

  protected postDate(post: BlogPostSummary): string {
    return post.publishedAt ?? post.updatedAt;
  }

  protected visiblePostTitle(post: BlogPostSummary): string {
    const maximumLength = this.normalizedTitleMaxLength;

    return maximumLength === null
      ? post.title
      : truncateTitle(post.title, maximumLength);
  }

  protected postTitleIsTruncated(post: BlogPostSummary): boolean {
    const maximumLength = this.normalizedTitleMaxLength;

    return maximumLength !== null && normalizeTitle(post.title).length > maximumLength;
  }

  protected categorySlug(category: string): string {
    return createBlogCategorySlug(category);
  }

  protected tagSlug(tag: string): string {
    return createBlogTagSlug(tag);
  }

  protected appearanceLabel(post: BlogPostSummary): string | null {
    return this.postAppearance(post)?.label?.trim() || null;
  }

  protected appearanceStyle(post: BlogPostSummary): Record<string, string> | null {
    const appearance = this.postAppearance(post);

    if (!appearance) {
      return null;
    }

    const style: Record<string, string> = {};

    if (appearance.accent) {
      style['--post-accent'] = appearance.accent;
    }
    if (appearance.accentStrong) {
      style['--post-accent-strong'] = appearance.accentStrong;
    }
    if (appearance.accentRgb) {
      style['--post-accent-rgb'] = appearance.accentRgb;
    }

    return Object.keys(style).length ? style : null;
  }

  private postAppearance(post: BlogPostSummary): BlogPostListingAppearance | null {
    return this.appearanceByPostId[post.id] ?? this.appearance;
  }

  private get normalizedTitleMaxLength(): number | null {
    if (this.titleMaxLength === null || !Number.isFinite(this.titleMaxLength)) {
      return null;
    }

    return Math.max(1, Math.floor(this.titleMaxLength));
  }
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncateTitle(value: string, maximumLength: number): string {
  const normalizedValue = normalizeTitle(value);

  if (normalizedValue.length <= maximumLength) {
    return normalizedValue;
  }

  if (maximumLength === 1) {
    return '…';
  }

  const visibleLength = maximumLength - 1;
  const candidate = normalizedValue.slice(0, visibleLength + 1);
  const lastSpaceIndex = candidate.lastIndexOf(' ');
  const shouldTrimToWord = lastSpaceIndex > visibleLength * 0.62;
  const visibleValue = (shouldTrimToWord
      ? candidate.slice(0, lastSpaceIndex)
      : normalizedValue.slice(0, visibleLength)
  ).trimEnd();

  return `${visibleValue}…`;
}
