import {NgClass, NgOptimizedImage} from '@angular/common';
import {Component, ChangeDetectionStrategy, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowUpRightFromSquare} from '@fortawesome/free-solid-svg-icons';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {HomeBlogSectionsComponent} from './home-blog-sections.component';
import {
  YouTubeLatestVideosComponent
} from '../../features/youtube/components/latest-videos/youtube-latest-videos.component';
import {SiteThemeService} from '../../shared/theme/site-theme.service';
import {AuthorBioComponent} from '../../shared/author/author-bio.component';
import {SocialsComponent} from './socials/socials.component';
import {
  RecommendedLinkRepositoryService
} from '../../features/recommended-links/services/recommended-link-repository.service';

interface HomeHighlight {
  eyebrow: string;
  title: string;
  description: string;
  route: string;
  action: string;
  accentClass: string;
}

@Component({
  selector: 'app-main',
  imports: [
    AuthorBioComponent,
    FaIconComponent,
    HomeBlogSectionsComponent,
    NgClass,
    NgOptimizedImage,
    RouterLink,
    SocialsComponent,
    YouTubeLatestVideosComponent,
  ],
  templateUrl: './main.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: `./home-page.scss`
})
export class MainComponent {
  protected readonly theme = inject(SiteThemeService);
  private readonly recommendedLinkRepository = inject(RecommendedLinkRepositoryService);
  protected readonly heroBackgroundImage = computed(() => (
    this.theme.isDark() ? '/assets/images/backgrounds/night.webp' : '/assets/images/backgrounds/day.webp'
  ));
  protected readonly heroBackgroundAlt = computed(() => (
    this.theme.isDark() ? 'Night aerial landscape background' : 'Day aerial landscape background'
  ));

  protected readonly recommendedSites = toSignal(
    this.recommendedLinkRepository.getFeaturedRecommendedLinks$(),
    {initialValue: this.recommendedLinkRepository.getFeaturedRecommendedLinks()}
  );

  protected readonly labItems: readonly HomeHighlight[] = [
    {
      eyebrow: 'Visual Lab',
      title: 'Full Screen Backgrounds',
      description: 'Image, video, overlay, and parallax background experiments for immersive interfaces.',
      route: `/${PATH_NAMES.FS_BACKGROUND}`,
      action: 'View background lab',
      accentClass: 'border-sky-400/70 text-sky-200',
    },
    {
      eyebrow: 'Project Demos',
      title: 'Homepage Experiments',
      description: 'SpaceX, weather, patch builder, task, tooltip, and Tailwind demos now belong with labs.',
      route: `/${PATH_NAMES.LABS}`,
      action: 'Browse labs',
      accentClass: 'border-amber-400/70 text-amber-200',
    },
  ];

  protected readonly pathNames = PATH_NAMES;
  protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
}
