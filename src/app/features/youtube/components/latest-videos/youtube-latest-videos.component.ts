import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {YouTubeFeedResponse, YouTubeVideo} from '../../models/youtube-video.model';
import {YouTubeFeedService} from '../../services/youtube-feed.service';
import {
  SiteAnalyticsService,
  YouTubeAnalyticsSourceComponent,
} from '../../../../shared/analytics/site-analytics.service';
import {
  getYouTubeChannelIdentity,
  PRIMARY_YOUTUBE_CHANNEL_KEY,
  type YouTubeChannelKey,
} from '../../../../shared/seo/site-identity';

@Component({
  selector: 'app-youtube-latest-videos',
  imports: [
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .youtube-latest-videos__inner {
      padding-inline: var(--site-gutter);
    }

    .youtube-latest-videos--compact {
      padding-block: 0.9rem;
    }

    .youtube-latest-videos--compact .youtube-latest-videos__inner {
      padding-inline: 0.9rem;
    }

    .youtube-latest-videos--compact .site-section-header {
      display: block;
      margin-bottom: 0;
      padding-block: 0 0.85rem;
    }

    .youtube-latest-videos--compact .heading-section {
      font-size: 1.25rem;
      line-height: 1.28;
    }

    .youtube-latest-videos--compact .site-section-copy {
      display: -webkit-box;
      margin-top: 0.45rem;
      overflow: hidden;
      font-size: 0.84rem;
      line-height: 1.45;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .youtube-latest-videos--compact .youtube-latest-videos__actions {
      gap: 0.45rem;
      margin-top: 0.75rem;
    }

    .youtube-latest-videos--compact .youtube-latest-videos__actions a {
      min-height: 2.35rem;
      padding-inline: 0.7rem;
      font-size: 0.78rem;
    }

    .youtube-latest-videos--compact .youtube-latest-videos__grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
      margin-top: 0.85rem;
    }

    .youtube-latest-videos--compact .site-skeleton-card,
    .youtube-latest-videos--compact .youtube-latest-videos__card {
      min-height: 0;
    }

    .youtube-latest-videos--compact .site-card-body {
      padding: 0.85rem;
    }

    .youtube-latest-videos--compact .site-card-body h3 {
      margin-top: 0.65rem;
      font-size: 1rem;
      line-height: 1.35;
    }

    .youtube-latest-videos--compact .site-card-body > p:not(.site-meta) {
      display: -webkit-box;
      margin-top: 0.6rem;
      overflow: hidden;
      line-height: 1.45;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .youtube-latest-videos--compact .link-youtube {
      padding-top: 0.8rem;
    }
  `],
  template: `
    <section
      [attr.id]="sectionId"
      [attr.aria-labelledby]="sectionId + '-heading'"
      class="site-section-band-dark youtube-latest-videos"
      [class.youtube-latest-videos--compact]="compact"
    >
      <div class="site-section-inner youtube-latest-videos__inner">
        <div class="site-section-header">
          <div class="max-w-2xl">
            <p class="eyebrow eyebrow-red">{{ eyebrow }}</p>
            <h2 [attr.id]="sectionId + '-heading'" class="mt-3 heading-section">{{ heading }}</h2>
            <p class="site-section-copy">
              {{ description }}
            </p>
          </div>

          <div class="youtube-latest-videos__actions flex flex-wrap items-center gap-3">
            <a
              [href]="channelUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-ghost"
              (click)="recordChannelSelection('channel')"
            >
              View channel
            </a>
            <a
              [href]="subscribeUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-youtube"
              (click)="recordChannelSelection('subscribe')"
            >
              Subscribe on YouTube
            </a>
          </div>
        </div>

        @if (loadError(); as error) {
          <div class="site-error-panel mt-8">
            <p class="font-medium text-rose-950 dark:text-red-100">Unable to load latest videos.</p>
            <p class="mt-2">{{ error }}</p>
          </div>
        } @else if (isLoading()) {
          <div class="site-card-grid youtube-latest-videos__grid" aria-label="Loading latest YouTube videos">
          @for (item of loadingCards; track item) {
            <div class="site-skeleton-card animate-pulse">
              <div class="aspect-video bg-zinc-200 dark:bg-zinc-800"></div>
              <div class="space-y-3 p-5">
                <div class="site-skeleton-block h-3 w-28"></div>
                <div class="site-skeleton-block h-5 w-4/5"></div>
                <div class="site-skeleton-block h-3 w-full"></div>
                <div class="site-skeleton-block h-3 w-2/3"></div>
              </div>
            </div>
          }
        </div>
      } @else {
          <div class="site-card-grid youtube-latest-videos__grid">
          @for (video of videos; track video.id) {
            <article class="site-card group flex h-full flex-col overflow-hidden" [class.youtube-latest-videos__card]="compact">
              <a
                [href]="video.videoUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="site-media-link"
                (click)="recordVideoSelection(video, 'video_thumbnail')"
              >
                <img
                  [src]="video.thumbnailUrl"
                  [alt]="video.thumbnailAlt"
                  class="site-media-image aspect-video"
                  loading="lazy"
                >
              </a>
              <div class="site-card-body flex flex-1 flex-col">
                <p class="site-meta">
                  {{ video.publishedAt | date: 'MMM d, y':'UTC' }}
                </p>
                <h3 class="mt-3 text-xl font-semibold leading-snug text-zinc-50">
                  <a
                    [href]="video.videoUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:text-red-200"
                    (click)="recordVideoSelection(video, 'video_title')"
                  >
                    {{ video.title }}
                  </a>
                </h3>
                <p class="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{{ video.description }}</p>
                <a
                  [href]="video.videoUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link-youtube mt-auto inline-flex w-fit pt-5"
                  (click)="recordVideoSelection(video, 'video_watch')"
                >
                  Watch on YouTube
                </a>
              </div>
            </article>
          } @empty {
            <p class="site-empty-panel">No public YouTube videos are available yet.</p>
        }
        </div>
      }
      </div>
    </section>
  `,
})
export class YouTubeLatestVideosComponent implements OnInit {
  @Input() maxResults = 3;
  @Input() sectionId = 'youtube';
  @Input() channel: YouTubeChannelKey = PRIMARY_YOUTUBE_CHANNEL_KEY;
  @Input() eyebrow = 'Colin Michaels on YouTube';
  @Input() heading = 'What I’m testing, building, and sharing now.';
  @Input() description = 'Watch the newest videos, then subscribe for the next useful find, build, story, or experiment.';
  @Input() analyticsSourceComponent: YouTubeAnalyticsSourceComponent = 'homepage_youtube';
  @Input() compact = false;

  protected readonly feed = signal<YouTubeFeedResponse | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly loadingCards = [1, 2, 3] as const;

  private readonly destroyRef = inject(DestroyRef);
  private readonly analytics = inject(SiteAnalyticsService);
  private readonly youtubeFeed = inject(YouTubeFeedService);

  ngOnInit(): void {
    this.youtubeFeed.getLatestVideos$(this.maxResults, this.channel)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: feed => {
          this.feed.set(feed);
          this.loadError.set(null);
          this.isLoading.set(false);
        },
        error: error => {
          this.feed.set(null);
          this.loadError.set(this.getErrorMessage(error));
          this.isLoading.set(false);
        },
      });
  }

  protected get videos(): readonly YouTubeVideo[] {
    return this.feed()?.videos ?? [];
  }

  protected get channelUrl(): string {
    return getYouTubeChannelIdentity(this.channel).url;
  }

  protected get subscribeUrl(): string {
    return getYouTubeChannelIdentity(this.channel).subscribeUrl;
  }

  protected recordChannelSelection(action: 'channel' | 'subscribe'): void {
    this.analytics.trackYouTubeOutbound(
      getYouTubeChannelIdentity(this.channel).id,
      action,
      this.analyticsSourceComponent
    );
  }

  protected recordVideoSelection(
    video: YouTubeVideo,
    action: 'video_thumbnail' | 'video_title' | 'video_watch'
  ): void {
    this.analytics.trackYouTubeOutbound(video.id, action, this.analyticsSourceComponent);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'The YouTube feed is currently unavailable.';
  }
}
