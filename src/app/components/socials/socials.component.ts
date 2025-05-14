import { Component } from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faGithub, faInstagram, faLinkedin, faTwitter, faXTwitter, faYoutube} from '@fortawesome/free-brands-svg-icons';
import {faGamepad} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-socials',
  imports: [
    RouterLink,
    RouterLinkActive,
    FontAwesomeModule
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
      &.active{
        @apply shadow-lg shadow-white/20;
      }
    }
  }`
})
export class SocialsComponent {

  protected readonly faYoutube = faYoutube;
  protected readonly faTwitter = faTwitter;
  protected readonly faGithub = faGithub;
  protected readonly faInstagram = faInstagram;
  protected readonly faGamepad = faGamepad;
  protected readonly faLinkedin = faLinkedin;
  protected readonly faXTwitter = faXTwitter;
}
