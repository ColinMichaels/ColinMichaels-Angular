import {Component, ChangeDetectionStrategy, computed, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowUpRightFromSquare} from '@fortawesome/free-solid-svg-icons';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {
  BlogPostCardSkeletonComponent
} from '../../features/blog/components/post-card/blog-post-card-skeleton.component';
import {HomeArticleHeroComponent} from './home-article-hero.component';
import {HomeLatestWritingSectionComponent} from './home-latest-writing-section.component';
import {HomeRecoveryBlogSectionsComponent} from './home-recovery-blog-sections.component';
import {HomeTopicsSectionComponent} from './home-topics-section.component';
import {
  YouTubeLatestVideosComponent
} from '../../features/youtube/components/latest-videos/youtube-latest-videos.component';
import {AuthorBioComponent} from '../../shared/author/author-bio.component';
import {
  RecommendedLinkRepositoryService
} from '../../features/recommended-links/services/recommended-link-repository.service';
import {HomepageHeroRepositoryService} from '../../features/homepage/services/homepage-hero-repository.service';
import {HomepageSocialPreviewService} from '../../features/homepage/services/homepage-social-preview.service';
import {DEFAULT_HOMEPAGE_HERO_SETTINGS} from '../../features/homepage/homepage-hero.defaults';
import {selectHomepageHeroPost} from '../../features/homepage/utils/homepage-post-selection.util';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';

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
    YouTubeLatestVideosComponent,
  ],
  templateUrl: './main.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent {
  private readonly blogPostFeed = inject(HomeBlogPostFeedService);
  private readonly homepageHeroRepository = inject(HomepageHeroRepositoryService);
  private readonly homepageSocialPreview = inject(HomepageSocialPreviewService);
  private readonly recommendedLinkRepository = inject(RecommendedLinkRepositoryService);

  protected readonly recommendedSites = toSignal(
    this.recommendedLinkRepository.getFeaturedRecommendedLinks$(),
    {initialValue: this.recommendedLinkRepository.getFeaturedRecommendedLinks()}
  );

  protected readonly pathNames = PATH_NAMES;
  protected readonly heroPostId = computed(() => {
    const settings = this.homepageHeroRepository.settings();
    const publicSettings = settings.status === 'published' ? settings : DEFAULT_HOMEPAGE_HERO_SETTINGS;

    return selectHomepageHeroPost(this.blogPostFeed.publishedPosts(), publicSettings)?.id ?? null;
  });
  protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;

  constructor() {
    effect(() => {
      this.homepageSocialPreview.apply(
        this.homepageHeroRepository.settings(),
        this.blogPostFeed.publishedPosts()
      );
    });
  }
}
