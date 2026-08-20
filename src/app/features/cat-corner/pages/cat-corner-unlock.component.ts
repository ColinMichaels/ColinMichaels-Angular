import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink, UrlTree} from '@angular/router';
import {firstValueFrom} from 'rxjs';

import {PATH_NAMES} from '../../../app-route-paths';
import {CatCornerAccessService} from '../services/cat-corner-access.service';

type UnlockState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-cat-corner-unlock',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="unlock-page">
      <section class="unlock-layout" aria-labelledby="cat-corner-unlock-title">
        <div
          class="unlock-copy"
          aria-live="polite"
          aria-atomic="true"
          [attr.aria-busy]="state() === 'loading'"
        >
          @switch (state()) {
            @case ('loading') {
              <p class="state-label">Checking Gretchen's guest list</p>
              <h1 id="cat-corner-unlock-title">One moment.</h1>
              <p class="unlock-intro" role="status">Gretchen is adding your name to Cat Corner.</p>
              <span class="loading-mark" aria-hidden="true">
                <span></span><span></span><span></span>
              </span>
            }
            @case ('success') {
              <h1 id="cat-corner-unlock-title">You found Gretchen.</h1>
              <p class="unlock-intro">Your account now carries the Cat Corner Addict badge.</p>

              <p class="membership-mark">
                <svg aria-hidden="true" viewBox="0 0 32 32">
                  <ellipse cx="16" cy="21.5" rx="7.6" ry="6.2"></ellipse>
                  <ellipse cx="7.7" cy="13.1" rx="3.1" ry="4.2" transform="rotate(-25 7.7 13.1)"></ellipse>
                  <ellipse cx="14" cy="9" rx="3.1" ry="4.3" transform="rotate(-7 14 9)"></ellipse>
                  <ellipse cx="24.3" cy="13.1" rx="3.1" ry="4.2" transform="rotate(25 24.3 13.1)"></ellipse>
                  <ellipse cx="20" cy="9" rx="3.1" ry="4.3" transform="rotate(7 20 9)"></ellipse>
                </svg>
                <span>Cat Corner Addict</span>
              </p>

              <div class="unlock-actions">
                <a
                  class="primary-action"
                  [routerLink]="['/', pathNames.CAT_CORNER]"
                >
                  <span>Enter Cat Corner</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M5 12h14M14 7l5 5-5 5"></path>
                  </svg>
                </a>
                <a class="return-link" [routerLink]="returnUrl">Return to the article</a>
              </div>
            }
            @case ('error') {
              <p class="state-label error-label">The guest book slipped off the desk</p>
              <h1 id="cat-corner-unlock-title">Gretchen couldn't finish that.</h1>
              <p class="unlock-intro" role="alert">Your badge could not be added just yet. Please try again.</p>
              <div class="unlock-actions">
                <button class="primary-action" type="button" (click)="unlock()">
                  <span>Try Again</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M20 7v5h-5M4 17v-5h5"></path>
                    <path d="M6.1 9a7 7 0 0 1 11.5-2L20 9M4 15l2.4 2A7 7 0 0 0 18 15"></path>
                  </svg>
                </button>
                <a class="return-link" [routerLink]="returnUrl">Return to the article</a>
              </div>
            }
          }
        </div>

        <div class="gretchen-portrait" aria-hidden="true">
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
    </main>
  `,
  styles: `
    :host {
      --cat-paper: #fff;
      --cat-ink: #292a27;
      --cat-muted: #595d57;
      --cat-sage: #4f6849;
      --cat-sage-deep: #40573d;
      --cat-sage-soft: #e9eee7;
      display: block;
    }

    .unlock-page {
      min-height: calc(100dvh - var(--site-header-sticky-height));
      overflow: hidden;
      border-bottom: 1px solid #d9ddd7;
      background: var(--cat-paper);
      color: var(--cat-ink);
    }

    .unlock-layout {
      display: grid;
      min-height: inherit;
      width: min(100%, 90rem);
      margin-inline: auto;
      padding: clamp(3rem, 8vw, 7rem) clamp(1.25rem, 7vw, 7.5rem) 2rem;
      grid-template-columns: minmax(0, .92fr) minmax(20rem, .78fr);
      align-items: center;
      gap: clamp(2rem, 5vw, 6rem);
    }

    .unlock-copy {
      position: relative;
      z-index: 1;
      max-width: 39rem;
      padding-block: 2rem 4rem;
    }

    h1 {
      margin: 0;
      color: var(--cat-sage);
      font-family: var(--font-editorial, 'Source Sans 3', system-ui, sans-serif);
      font-size: clamp(4.2rem, calc(8vw * var(--reader-font-scale, 1)), 9.5rem);
      font-weight: 400;
      letter-spacing: calc(-.065em + var(--reader-letter-spacing, 0));
      line-height: calc(var(--reader-line-height, 1.65) * .55);
      text-wrap: balance;
    }

    .state-label {
      margin: 0 0 calc(var(--reader-paragraph-gap, 1rem) + .25rem);
      color: var(--cat-sage);
      font-size: calc(.78rem * var(--reader-font-scale, 1));
      font-weight: 700;
      letter-spacing: calc(.16em + var(--reader-letter-spacing, 0));
      line-height: calc(var(--reader-line-height, 1.65) * .8);
      text-transform: uppercase;
    }

    .error-label {
      color: #a15535;
    }

    .unlock-intro {
      max-width: 31rem;
      margin: max(clamp(2rem, 4vw, 3rem), calc(var(--reader-block-gap, 1.5rem) + .5rem)) 0 0;
      color: var(--cat-ink);
      font-size: clamp(1.2rem, calc(2.1vw * var(--reader-font-scale, 1)), 2.25rem);
      letter-spacing: var(--reader-letter-spacing, 0);
      line-height: calc(var(--reader-line-height, 1.65) * .84);
      word-spacing: var(--reader-word-spacing, normal);
    }

    .membership-mark {
      display: inline-flex;
      margin: calc(var(--reader-block-gap, 1.5rem) + .5rem) 0 0;
      align-items: center;
      gap: .85rem;
      color: var(--cat-sage-deep);
      font-size: clamp(1.05rem, calc(1.7vw * var(--reader-font-scale, 1)), 1.9rem);
      font-weight: 700;
    }

    .membership-mark svg {
      width: 3.4rem;
      height: 3.4rem;
      padding: .8rem;
      border-radius: 50%;
      background: var(--cat-sage-soft);
      fill: currentColor;
    }

    .unlock-actions {
      display: flex;
      margin-top: calc(var(--reader-paragraph-gap, 1rem) + 1.1rem);
      flex-direction: column;
      align-items: flex-start;
      gap: 1.35rem;
    }

    .primary-action {
      display: inline-flex;
      min-width: min(100%, 20rem);
      min-height: 3.8rem;
      padding: .85rem 1.2rem .85rem 1.45rem;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      border: 1px solid var(--cat-sage-deep);
      border-radius: .25rem;
      background: var(--cat-sage);
      box-shadow: 0 0 0 .3rem var(--cat-paper), 0 0 0 .4rem var(--cat-sage);
      color: #fff;
      font: inherit;
      font-size: calc(1.05rem * var(--reader-font-scale, 1));
      font-weight: 700;
      line-height: 1.1;
      text-decoration: none;
      transition: background-color 160ms ease, transform 160ms ease;
      cursor: pointer;
    }

    .primary-action:hover {
      background: var(--cat-sage-deep);
      transform: translateY(-1px);
    }

    .primary-action:focus-visible,
    .return-link:focus-visible {
      outline: 3px solid #bd744b;
      outline-offset: .3rem;
    }

    .primary-action svg {
      width: 1.6rem;
      height: 1.6rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .return-link {
      border-bottom: 1px solid currentColor;
      color: var(--cat-sage-deep);
      font-size: calc(1rem * var(--reader-font-scale, 1));
      font-weight: 700;
      line-height: var(--reader-line-height, 1.65);
      text-decoration: none;
    }

    .gretchen-portrait {
      align-self: end;
      justify-self: center;
      width: min(100%, 31rem);
      line-height: 0;
    }

    .gretchen-portrait img {
      display: block;
      width: 100%;
      height: auto;
      filter: drop-shadow(0 1.4rem 1rem rgb(49 48 42 / .16));
    }

    .loading-mark {
      display: flex;
      margin-top: 2.25rem;
      gap: .45rem;
    }

    .loading-mark span {
      width: .55rem;
      height: .55rem;
      border-radius: 50%;
      background: var(--cat-sage);
      animation: cat-corner-wait 1.2s ease-in-out infinite;
    }

    .loading-mark span:nth-child(2) {
      animation-delay: 120ms;
    }

    .loading-mark span:nth-child(3) {
      animation-delay: 240ms;
    }

    @keyframes cat-corner-wait {
      0%, 60%, 100% { opacity: .32; transform: translateY(0); }
      30% { opacity: 1; transform: translateY(-.25rem); }
    }

    :host-context(.dark) {
      --cat-paper: #181916;
      --cat-ink: #f0efe9;
      --cat-muted: #b8b9b0;
      --cat-sage: #a9c0a2;
      --cat-sage-deep: #c0d3bb;
      --cat-sage-soft: #293126;
    }

    :host-context(.dark) .unlock-page {
      border-color: #343831;
    }

    :host-context(.dark) .primary-action {
      background: #526b4c;
      color: #fff;
    }

    :host-context(.reader-contrast-high) {
      --cat-paper: var(--site-bg);
      --cat-ink: var(--site-text);
      --cat-muted: var(--site-muted);
      --cat-sage: var(--site-accent-strong);
      --cat-sage-deep: var(--site-accent-strong);
      --cat-sage-soft: var(--site-accent-soft);
    }

    :host-context(.reader-contrast-high) .unlock-page {
      border-color: var(--site-border);
    }

    :host-context(.reader-contrast-high) .error-label {
      color: var(--site-accent-strong);
    }

    :host-context(.reader-contrast-high) .primary-action {
      border-color: var(--site-accent);
      background: var(--site-accent);
      box-shadow: 0 0 0 .3rem var(--site-bg), 0 0 0 .4rem var(--site-accent);
      color: var(--site-bg);
    }

    @media (max-width: 48rem) {
      .unlock-layout {
        min-height: auto;
        padding-top: 3.25rem;
        grid-template-columns: 1fr;
        gap: 0;
      }

      .unlock-copy {
        padding-block: 0;
      }

      h1 {
        max-width: 9ch;
        font-size: clamp(4rem, calc(19vw * var(--reader-font-scale, 1)), 8rem);
      }

      .gretchen-portrait {
        width: min(76vw, 24rem);
        margin-top: -2rem;
        transform: translateX(15%);
      }

      .unlock-actions {
        position: relative;
        z-index: 2;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .primary-action {
        transition: none;
      }

      .primary-action:hover {
        transform: none;
      }

      .loading-mark span {
        animation: none;
      }
    }
  `,
})
export class CatCornerUnlockComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly access = inject(CatCornerAccessService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly state = signal<UnlockState>('loading');
  protected readonly returnUrl: UrlTree = this.router.parseUrl(this.getSafeReturnUrl(
    this.route.snapshot.queryParamMap.get('returnUrl')
  ));

  ngOnInit(): void {
    void this.unlock();
  }

  protected async unlock(): Promise<void> {
    this.state.set('loading');

    try {
      await firstValueFrom(this.access.claimAccess());
      this.state.set('success');
    } catch {
      this.state.set('error');
    }
  }

  private getSafeReturnUrl(value: string | null): string {
    const unlockPath = `/${PATH_NAMES.CAT_CORNER}/${PATH_NAMES.CAT_CORNER_UNLOCK}`;

    return value?.startsWith('/') && !value.startsWith('//') && !value.startsWith(unlockPath)
      ? value
      : '/';
  }
}
