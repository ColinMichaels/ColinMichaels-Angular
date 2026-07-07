import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';

import {WindowHeaderComponent} from '../../components/game/templates/app-window/window-header/window-header.component';

@Component({
  selector: 'app-not-found',
  imports: [
    RouterLink,
    WindowHeaderComponent,
  ],
  templateUrl: './not-found.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class NotFoundComponent {
}
