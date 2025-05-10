import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-socials',
  imports: [
    RouterLink
  ],
  templateUrl: './socials.component.html',
  standalone: true,
  styles: `:host {
    position: fixed;
    bottom: 0;
    padding: 6px;
    width: 100%;
    background: rgba(0, 0, 0, 0.55);
  }`
})
export class SocialsComponent {

}
