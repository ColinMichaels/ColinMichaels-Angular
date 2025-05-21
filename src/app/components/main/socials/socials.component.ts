import { Component } from '@angular/core';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faApple, faGithub, faInstagram, faLinkedin, faXTwitter, faYoutube} from '@fortawesome/free-brands-svg-icons';
import {NgForOf} from '@angular/common';
import {TooltipDirective} from '../../game/directives/tooltip.directive';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-socials',
  imports: [
    FontAwesomeModule,
    NgForOf,
    TooltipDirective,
    RouterLink
  ],
  templateUrl: './socials.component.html',
  standalone: true,
  styles: `:host {
    position: fixed;
    bottom: 0;
    width: 100%;
  }`
})
export class SocialsComponent {
  links = [
    {
      link: "youtube.com/CaptainColin",
      target: "_blank",
      type: 'external',
      title: "Youtube CaptainColin",
      class: "hover:text-red-600",
      icon: faYoutube,
      tooltip: 'YouTube: @CaptainColin',
      tooltipClass: 'bg-red-600 font-mono'
    },
    {
      link: "twitter.com/colinmichaels",
      target: "_blank",
      type: 'external',
      title: "X",
      class: "hover:text-white",
      icon: faXTwitter,
      tooltip: 'X: @colinmichaels',
      tooltipClass: 'bg-white text-black font-mono'
    },
    {
      link: "github.com/ColinMichaels",
      target: "_blank",
      type: 'external',
      title: "GitHub",
      class: "hover:text-white",
      icon: faGithub,
      tooltip: 'GitHub: @colinmichaels',
      tooltipClass: 'text-black bg-white font-mono'
    },
    {
      link: "instagram.com/captaincolinfpv",
      target: "_blank",
      type: 'external',
      title: "Instagram",
      class: "hover:text-pink-600",
      icon: faInstagram,
      tooltip: 'Instagram: @captaincolinfpv',
      tooltipClass: 'bg-pink-600 text-white font-mono'
    },
    {
      link: "linkedin.com/in/colinmichaels/",
      target: "_blank",
      type: 'external',
      title: "LinkedIn",
      class: "hover:text-blue-700",
      icon: faLinkedin,
      tooltip: 'LinkedIn: @colinmichaels',
      tooltipClass: 'bg-blue-700 text-white font-mono'
    },
    {
      link: "/login",
      type: 'internal',
      target: "_self",
      title: "game",
      class: "group hover:text-green-600",
      icon: faApple,
      tooltip: "Os Emulator", // Tooltip visible in the HTML for this link
      tooltipClass: 'bg-green-600 text-black font-monok'
    },
  ];

  protected encodeUrl(url: string,): string {
    try {
      return encodeURIComponent('https://' + url);
    } catch (error) {
      console.error("Error encoding URL:", error);
      return url; // Return the original URL if encoding fails
    }
  }
}
