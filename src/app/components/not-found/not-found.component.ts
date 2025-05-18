import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';
import {WindowHeaderComponent} from '../game/templates/app-window/window-header/window-header.component';

@Component({
  selector: 'app-not-found',
  imports: [
    RouterLink,
    WindowHeaderComponent
  ],
  templateUrl: './not-found.component.html',
  styleUrl: `../main/home-page.scss`,
})
export class NotFoundComponent {

}
