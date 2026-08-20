import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faGithub, faInstagram, faLinkedin, faXTwitter, faYoutube} from '@fortawesome/free-brands-svg-icons';
import type {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {TooltipDirective} from '../../game/directives/tooltip.directive';
import {SiteAnalyticsService} from '../../../shared/analytics/site-analytics.service';
import {CREATOR_PROFILE_URLS} from '../../../shared/seo/site-identity';
import type {CreatorProfileId} from '../../../shared/seo/site-identity';

@Component({
  selector: 'app-socials',
  imports: [
    FontAwesomeModule,
    TooltipDirective,
  ],
  templateUrl: './socials.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `:host {
    position: fixed;
    bottom: 0;
    pointer-events: none;
    width: 100%;
    z-index: 60;
  }`
})
export class SocialsComponent {
  // Keep this fixed bar social-only; legal, contact, and primary navigation belong in the page footer.
  readonly links: readonly {
    id: CreatorProfileId;
    href: string;
    label: string;
    title: string;
    class: string;
    icon: IconDefinition;
    tooltip: string;
    tooltipClass: string;
  }[] = [
    {
      id: 'youtube',
      href: CREATOR_PROFILE_URLS.youtube,
      label: 'Follow Colin Michaels on YouTube',
      title: 'YouTube: Colin Michaels',
      class: 'hover:text-red-600',
      icon: faYoutube,
      tooltip: 'YouTube: Colin Michaels',
      tooltipClass: 'bg-red-600 font-mono'
    },
    {
      id: 'x',
      href: CREATOR_PROFILE_URLS.x,
      label: 'Follow Colin Michaels on X',
      title: 'X: @colinmichaels',
      class: 'hover:text-white',
      icon: faXTwitter,
      tooltip: 'X: @colinmichaels',
      tooltipClass: 'bg-white text-black font-mono'
    },
    {
      id: 'github',
      href: CREATOR_PROFILE_URLS.github,
      label: 'View Colin Michaels on GitHub',
      title: 'GitHub: @ColinMichaels',
      class: 'hover:text-white',
      icon: faGithub,
      tooltip: 'GitHub: @ColinMichaels',
      tooltipClass: 'text-black bg-white font-mono'
    },
    {
      id: 'instagram',
      href: CREATOR_PROFILE_URLS.instagram,
      label: 'Follow Colin Michaels on Instagram',
      title: 'Instagram: @colinmichaels',
      class: 'hover:text-pink-600',
      icon: faInstagram,
      tooltip: 'Instagram: @colinmichaels',
      tooltipClass: 'bg-pink-600 text-white font-mono'
    },
    {
      id: 'linkedin',
      href: CREATOR_PROFILE_URLS.linkedin,
      label: 'Connect with Colin Michaels on LinkedIn',
      title: 'LinkedIn: Colin Michaels',
      class: 'hover:text-blue-700',
      icon: faLinkedin,
      tooltip: 'LinkedIn: Colin Michaels',
      tooltipClass: 'bg-blue-700 text-white font-mono'
    },
  ];

  private readonly analytics = inject(SiteAnalyticsService);

  protected recordSelection(profileId: CreatorProfileId): void {
    this.analytics.trackCreatorProfileOutbound(profileId);
  }
}
