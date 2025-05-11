import { Component } from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  selector: 'app-socials',
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './socials.component.html',
  standalone: true,
  styles: `:host {
    position: fixed;
    bottom: 0;
    padding: 6px;
    width: 100%;
    background: rgba(0, 0, 0, 0.55);
    a {
      @apply hover:scale-[1.5] hover:-translate-y-4 delay-75 transition ease-in-out active:animate-bounce focus:animate-bounce;
    }
  }`
})
export class SocialsComponent {

}
