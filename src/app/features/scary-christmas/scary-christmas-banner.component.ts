import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {ScaryChristmasCandiesComponent} from './scary-christmas-candies.component';
import {ScaryChristmasService} from './scary-christmas.service';

@Component({
  selector: 'app-scary-christmas-banner',
  imports: [ScaryChristmasCandiesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="scary-banner" aria-labelledby="scary-christmas-heading">
      <img class="scary-banner-art" src="/assets/seasonal/scary-christmas/haunted-lantern-night.webp"
        width="1920" height="800" alt="" fetchpriority="high" aria-hidden="true">
      <div class="scary-banner-inner">
        <div class="scary-banner-copy">
          <h2 id="scary-christmas-heading">Scary <span>Christmas.</span></h2>
          <p>A little spooky. A little cosmic. A whole lot of candy.</p>
          <div class="scary-banner-actions">
            <button type="button" class="scary-button scary-button--primary" (click)="hunt.openLantern()">
              Start the candy hunt
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
            </button>
            <button type="button" class="scary-music-link" (click)="hunt.openLantern()">
              Dreadnauts after dark
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
            </button>
          </div>
        </div>
        <app-scary-christmas-candies url="/" placement="banner"/>
      </div>
    </section>
  `,
})
export class ScaryChristmasBannerComponent {
  protected readonly hunt = inject(ScaryChristmasService);
}
