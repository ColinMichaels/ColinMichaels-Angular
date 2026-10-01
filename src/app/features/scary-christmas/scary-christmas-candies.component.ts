import {DOCUMENT} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {ScaryChristmasPlacement} from './scary-christmas.config';
import {ScaryChristmasService} from './scary-christmas.service';

@Component({
  selector: 'app-scary-christmas-candies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (available().length) {
      <div class="scary-candy-placement" [class]="'scary-candy-placement scary-candy-placement--' + placement()">
        @for (candy of available(); track candy.id) {
          <button type="button" class="scary-candy"
            [class.scary-candy--violet]="candy.variant === 'violet'"
            [class.scary-candy--mint]="candy.variant === 'mint'"
            [attr.aria-label]="'Collect ' + candy.name"
            [attr.title]="'A little treat: ' + candy.name"
            [attr.data-testid]="'candy-' + candy.id"
            (click)="collect(candy.id)">
            <img src="/assets/seasonal/scary-christmas/moon-candy.webp" width="64" height="64" alt="" draggable="false">
          </button>
        }
      </div>
    }
  `,
})
export class ScaryChristmasCandiesComponent {
  readonly url = input.required<string>();
  readonly placement = input.required<ScaryChristmasPlacement>();
  private readonly hunt = inject(ScaryChristmasService);
  private readonly document = inject(DOCUMENT);
  protected readonly available = computed(() => this.hunt.candiesFor(this.url(), this.placement()));

  protected collect(id: string): void {
    if (this.hunt.collect(id)) {
      // A disappearing collectible must leave keyboard focus somewhere useful.
      this.document.getElementById('scary-lantern-toggle')?.focus({preventScroll: true});
    }
  }
}
