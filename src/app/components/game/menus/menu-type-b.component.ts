import {Component, Inject} from '@angular/core';
import {CONTEXT_MENU_DATA} from '../services/context-menu.service';
import {JsonPipe} from '@angular/common';

@Component({
  selector: 'app-menu-type-a',
  imports: [
    JsonPipe
  ],
  template: `
  <div class="menu-type-b">
    {{ data?.customData | json }}
  </div>`,
  styles: ``
})
export class MenuTypeBComponent {
  constructor(@Inject(CONTEXT_MENU_DATA) public data: any) {}

}
