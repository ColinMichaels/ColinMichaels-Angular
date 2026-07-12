import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink} from '@angular/router';
import {filter, map, startWith} from 'rxjs';

import {PATH_NAMES} from '../../../app-route-paths';

@Component({
  selector: 'app-cat-corner-easter-egg',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      class="gretchen-easter-egg"
      [routerLink]="['/', pathNames.CAT_CORNER, pathNames.CAT_CORNER_UNLOCK]"
      [queryParams]="{returnUrl: returnUrl()}"
      aria-label="You found Gretchen. Unlock Cat Corner."
      title="Gretchen"
    >
      <img
        src="/assets/images/cat-corner/gretchen-easter-egg-small.png"
        alt=""
        width="192"
        height="256"
        loading="lazy"
      >
    </a>
  `,
  styles: `
    :host {
      display: inline-block;
      line-height: 0;
      vertical-align: bottom;
    }

    .gretchen-easter-egg {
      display: inline-grid;
      width: clamp(3rem, 7vw, 4.5rem);
      aspect-ratio: 3 / 4;
      place-items: end center;
      border-radius: 45% 45% 18% 18%;
      opacity: .72;
      outline: 2px solid transparent;
      outline-offset: .25rem;
      transition: opacity 180ms ease, transform 240ms cubic-bezier(.2, .8, .2, 1), filter 180ms ease;
    }

    .gretchen-easter-egg img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 .35rem .35rem rgb(15 23 42 / .18));
    }

    .gretchen-easter-egg:hover {
      opacity: 1;
      transform: translateY(-.2rem) rotate(-1.5deg);
      filter: saturate(1.06);
    }

    .gretchen-easter-egg:focus-visible {
      opacity: 1;
      outline-color: #58704f;
    }

    @media (prefers-reduced-motion: reduce) {
      .gretchen-easter-egg {
        transition: opacity 120ms ease;
      }

      .gretchen-easter-egg:hover {
        transform: none;
      }
    }
  `,
})
export class CatCornerEasterEggComponent {
  private readonly router = inject(Router);
  protected readonly pathNames = PATH_NAMES;
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    {initialValue: this.router.url}
  );
  protected readonly returnUrl = computed(() => this.getSafeReturnUrl(this.currentUrl()));

  private getSafeReturnUrl(url: string): string {
    const unlockPath = `/${PATH_NAMES.CAT_CORNER}/${PATH_NAMES.CAT_CORNER_UNLOCK}`;

    return url.startsWith('/') && !url.startsWith('//') && !url.startsWith(unlockPath)
      ? url
      : '/';
  }
}
