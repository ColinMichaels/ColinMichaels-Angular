import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';

import {SeasonalService} from '../seasonal.service';
import {SeasonalCollectiblesComponent} from './seasonal-collectibles.component';

@Component({
  selector: 'app-seasonal-banner',
  imports: [SeasonalCollectiblesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hunt.edition(); as edition) {
      <section class="seasonal-banner" [class.seasonal-banner--no-art]="!edition.heroSrc"
        [class.seasonal-banner--scary-christmas]="edition.theme === 'halloween'"
        aria-labelledby="seasonal-heading">
        @if (edition.heroSrc) {
          <img class="seasonal-banner-art" [src]="edition.heroSrc"
            width="1920" height="800" alt="" fetchpriority="high" aria-hidden="true">
        }
        <div class="seasonal-banner-inner">
          <div class="seasonal-banner-copy">
            @if (primaryHeading()) {
              <h1 id="seasonal-heading">{{ edition.titleLine1 }} <span>{{ edition.titleLine2 }}</span></h1>
            } @else {
              <h2 id="seasonal-heading">{{ edition.titleLine1 }} <span>{{ edition.titleLine2 }}</span></h2>
            }
            <p>{{ edition.description }}</p>
            <div class="seasonal-banner-actions">
              @if (edition.interaction === 'reflect') {
                <a href="#seasonal-context" class="seasonal-button seasonal-button--primary">
                  About this day
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
                </a>
              } @else {
                <button type="button" class="seasonal-button seasonal-button--primary" (click)="hunt.openLantern()">
                  {{ edition.theme === 'halloween' ? 'Start the candy hunt' : 'Start the lantern hunt' }}
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
                </button>
              }
              @if (edition.musicSrc) {
                <button type="button" class="seasonal-music-link" (click)="hunt.openLantern()">
                  {{ edition.musicHeading }}
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
                </button>
              } @else if (edition.musicHref) {
                <a class="seasonal-music-link" [href]="edition.musicHref" target="_blank" rel="noopener noreferrer">
                  {{ edition.musicHeading || 'Dreadnauts listening' }}
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
                </a>
              }
            </div>
          </div>
          @if (!hunt.archiveMode() && edition.interaction !== 'reflect') {
            <app-seasonal-collectibles url="/" placement="banner"/>
          }
        </div>
      </section>
    }
  `,
})
export class SeasonalBannerComponent {
  readonly primaryHeading = input(false);
  protected readonly hunt = inject(SeasonalService);
}
