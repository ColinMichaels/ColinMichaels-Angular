import {Component, Inject, ChangeDetectionStrategy} from '@angular/core';
import {CONTEXT_MENU_DATA} from '../services/context-menu.service';
import {JsonPipe} from '@angular/common';

@Component({
  selector: 'app-menu-type-a',
  imports: [
    JsonPipe
  ],
  template: `
  <div class="menu-type-a">
    {{ $safeNavigationMigration(data?.customData) | json }}
  </div>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``
})
export class MenuTypeAComponent {
  constructor(@Inject(CONTEXT_MENU_DATA) public data: any) {}

}
