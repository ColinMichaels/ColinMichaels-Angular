import {NgClass} from '@angular/common';
import {Component, ChangeDetectionStrategy, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowUpRightFromSquare} from '@fortawesome/free-solid-svg-icons';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {
  BlogPostCardSkeletonComponent
} from '../../features/blog/components/post-card/blog-post-card-skeleton.component';
import {
  HOME_ARTICLE_HERO_POST_LIMIT,
  HomeArticleHeroComponent
} from './home-article-hero.component';
import {HomeLatestWritingSectionComponent} from './home-latest-writing-section.component';
import {HomeRecoveryBlogSectionsComponent} from './home-recovery-blog-sections.component';
import {HomeTopicsSectionComponent} from './home-topics-section.component';
import {
  YouTubeLatestVideosComponent
} from '../../features/youtube/components/latest-videos/youtube-latest-videos.component';
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
    BlogPostCardSkeletonComponent,
    FaIconComponent,
    HomeArticleHeroComponent,
    HomeLatestWritingSectionComponent,
    HomeRecoveryBlogSectionsComponent,
    HomeTopicsSectionComponent,
    NgClass,
    RouterLink,
    SocialsComponent,
    YouTubeLatestVideosComponent,
  ],
  templateUrl: './main.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MainComponent {
  private readonly recommendedLinkRepository = inject(RecommendedLinkRepositoryService);

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
  protected readonly heroPostCount = HOME_ARTICLE_HERO_POST_LIMIT;
  protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
}
