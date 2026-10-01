import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';

import {SeoService} from '../../../shared/seo/seo.service';
import {createSiteTitle, NOT_FOUND_SEO_METADATA} from '../../../shared/seo/seo.metadata';
import {SeasonalBannerComponent} from '../components/seasonal-banner.component';
import {SeasonalCollectiblesComponent} from '../components/seasonal-collectibles.component';
import {getSeasonalEdition} from '../seasonal.catalog';
import {SeasonalService} from '../seasonal.service';

@Component({
  selector: 'app-seasonal-edition',
  imports: [RouterLink, SeasonalBannerComponent, SeasonalCollectiblesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './seasonal-archive.scss',
  template: `
    @if (edition(); as edition) {
      <div class="site-section seasonal-edition-breadcrumb">
        <a routerLink="/archive/seasons" class="site-inline-link">← Seasonal archive</a>
        <span class="site-meta">{{ edition.holidayLabel }} · {{ edition.year }} @if (edition.preparationStatus === 'template') { · Early edition }</span>
      </div>
      @if (hunt.enabled()) {
        <app-seasonal-banner [primaryHeading]="true"/>
      } @else {
        <header class="site-section seasonal-archive-intro">
          <h1 class="heading-display">{{ edition.titleLine1 }} {{ edition.titleLine2 }}</h1>
          <p class="text-body">{{ edition.archiveDescription }}</p>
          <button class="btn-primary mt-5" type="button" (click)="hunt.setEnabled(true)">Explore this season</button>
        </header>
      }
      <section id="seasonal-context" class="site-section seasonal-edition-context" aria-label="About this season">
        <div>
          <p class="site-meta">{{ edition.dateLabel }}</p>
          <p class="text-body">{{ edition.observanceNote }}</p>
          @if (edition.learnMoreUrl) {
            <a class="site-inline-link" [href]="edition.learnMoreUrl" target="_blank" rel="noopener noreferrer">About {{ edition.holidayLabel }} ↗</a>
          }
        </div>
        <p class="text-body seasonal-edition-invitation">{{ edition.archiveDescription }}</p>
      </section>
      @if (hunt.enabled() && edition.interaction !== 'reflect') {
        <section class="site-section seasonal-edition-trail" aria-labelledby="seasonal-trail-title">
          <div class="seasonal-trail-intro">
            <h2 id="seasonal-trail-title" class="heading-section">Follow the small lights</h2>
            <p class="text-body">Explore this edition. Collect what catches your eye, then open your lantern to see what you found.</p>
          </div>
          @for (item of edition.items; track item.id; let index = $index) {
            <article class="seasonal-trail-stop" [id]="'seasonal-item-' + item.id">
              <span class="seasonal-trail-number" aria-hidden="true">{{ index + 1 < 10 ? '0' : '' }}{{ index + 1 }}</span>
              <div>
                <h3>{{ item.name }}</h3>
                <p class="text-body">{{ item.clue }}</p>
              </div>
              @if (hunt.isCollected(item.id)) {
                <span class="seasonal-trail-found">Found <span aria-hidden="true">✓</span></span>
              } @else {
                <app-seasonal-collectibles [url]="archiveUrl()" placement="trail" [itemId]="item.id"/>
              }
            </article>
          }
        </section>
      }
    } @else {
      <section class="site-section seasonal-archive-intro">
        <h1 class="heading-display">Season not found</h1>
        <p class="text-body">This edition isn’t in the archive.</p>
        <a routerLink="/archive/seasons" class="site-inline-link">Explore the seasonal archive →</a>
      </section>
    }
  `,
})
export class SeasonalEditionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly params = toSignal(this.route.paramMap, {initialValue: this.route.snapshot.paramMap});
  protected readonly hunt = inject(SeasonalService);
  protected readonly edition = computed(() => getSeasonalEdition(this.params().get('id') ?? ''));
  protected readonly archiveUrl = computed(() => '/archive/seasons/' + this.edition()?.id);

  constructor() {
    effect(() => {
      const edition = this.edition();
      this.seo.apply(edition ? {
        title: createSiteTitle(edition.titleLine1 + ' ' + edition.titleLine2),
        description: edition.archiveDescription,
        path: '/archive/seasons/' + edition.id, image: edition.heroSrc,
        imageAlt: edition.holidayLabel + ' seasonal illustration', type: 'website', robots: 'noindex,follow',
      } : NOT_FOUND_SEO_METADATA);
    });
  }
}
