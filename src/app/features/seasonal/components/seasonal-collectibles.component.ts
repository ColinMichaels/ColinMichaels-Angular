import {DOCUMENT} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {SeasonalPlacement} from '../seasonal.models';
import {SeasonalService} from '../seasonal.service';

@Component({
  selector: 'app-seasonal-collectibles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hunt.edition(); as edition) {
      @if (edition.interaction !== 'reflect' && available().length) {
        <div [class]="'seasonal-collectible-placement seasonal-collectible-placement--' + placement()">
          @for (item of available(); track item.id) {
            <button type="button" class="seasonal-collectible"
              [class.seasonal-collectible--violet]="item.variant === 'violet'"
              [class.seasonal-collectible--mint]="item.variant === 'mint'"
              [attr.aria-label]="'Collect ' + item.name"
              [attr.title]="item.name"
              [attr.data-testid]="'collectible-' + item.id"
              (click)="collect(item.id)">
              <img [src]="edition.collectibleSrc" width="64" height="64" alt="" draggable="false">
            </button>
          }
        </div>
      }
    }
  `,
})
export class SeasonalCollectiblesComponent {
  readonly url = input.required<string>();
  readonly placement = input.required<SeasonalPlacement>();
  protected readonly hunt = inject(SeasonalService);
  private readonly document = inject(DOCUMENT);
  protected readonly available = computed(() => this.hunt.itemsFor(this.url(), this.placement()));

  protected collect(id: string): void {
    if (this.hunt.collect(id)) {
      // A disappearing collectible leaves keyboard focus at the collection.
      this.document.getElementById('seasonal-lantern-toggle')?.focus({preventScroll: true});
    }
  }
}
