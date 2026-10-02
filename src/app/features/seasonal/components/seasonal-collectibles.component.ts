import {DOCUMENT} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {SeasonalHideout} from '../seasonal-hideouts';
import {SeasonalService} from '../seasonal.service';

@Component({
  selector: 'app-seasonal-collectibles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'seasonal-hideout-target',
    '[attr.data-seasonal-hideout]': 'hideout()',
  },
  template: `
    @if (hunt.edition(); as edition) {
      @if (edition.interaction !== 'reflect' && available().length) {
        @for (item of available(); track item.id) {
          <button type="button" class="seasonal-collectible"
            [class.seasonal-collectible--violet]="item.variant === 'violet'"
            [class.seasonal-collectible--mint]="item.variant === 'mint'"
            [attr.aria-label]="'Collect ' + item.name"
            [attr.title]="item.name"
            [attr.data-testid]="'collectible-' + item.id"
            (click)="collect(item.id)">
            <img [src]="edition.collectibleSrc" width="28" height="28" alt="" draggable="false">
          </button>
        }
      }
    }
  `,
})
export class SeasonalCollectiblesComponent {
  readonly url = input.required<string>();
  readonly hideout = input.required<SeasonalHideout>();
  protected readonly hunt = inject(SeasonalService);
  private readonly document = inject(DOCUMENT);
  protected readonly available = computed(() => this.hunt.itemsAtHideout(this.url(), this.hideout()));

  protected collect(id: string): void {
    if (this.hunt.collect(id)) {
      // A disappearing collectible leaves keyboard focus at the collection.
      this.document.getElementById('seasonal-lantern-toggle')?.focus({preventScroll: true});
    }
  }
}
