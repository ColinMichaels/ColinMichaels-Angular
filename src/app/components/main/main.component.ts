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
    RouterLink,
    SocialsComponent,
    YouTubeLatestVideosComponent,
  ],
  templateUrl: './main.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent {
  private readonly recommendedLinkRepository = inject(RecommendedLinkRepositoryService);

  protected readonly recommendedSites = toSignal(
    this.recommendedLinkRepository.getFeaturedRecommendedLinks$(),
    {initialValue: this.recommendedLinkRepository.getFeaturedRecommendedLinks()}
  );

  protected readonly pathNames = PATH_NAMES;
  protected readonly heroPostCount = HOME_ARTICLE_HERO_POST_LIMIT;
  protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
}
