import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {YouTubeFeedResponse, YouTubeVideo} from '../../models/youtube-video.model';
import {YouTubeFeedService} from '../../services/youtube-feed.service';

@Component({
  selector: 'app-youtube-latest-videos',
  imports: [
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section id="youtube" class="site-section-band-dark">
      <div class="site-section-inner">
        <div class="site-section-header">
          <div class="max-w-2xl">
            <p class="eyebrow eyebrow-red">YouTube</p>
            <h2 class="mt-3 heading-section">Latest videos</h2>
            <p class="site-section-copy">
              Recent uploads from the channel, pulled through the site backend so API credentials stay off the client.
            </p>
          </div>

          <a
            [href]="channelUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-youtube"
          >
            View channel
          </a>
        </div>

        @if (loadError(); as error) {
          <div class="site-error-panel mt-8">
            <p class="font-medium text-rose-950 dark:text-red-100">Unable to load latest videos.</p>
            <p class="mt-2">{{ error }}</p>
          </div>
        } @else if (isLoading()) {
          <div class="site-card-grid" aria-label="Loading latest YouTube videos">
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
          <div class="site-card-grid">
          @for (video of videos; track video.id) {
            <article class="site-card group flex h-full flex-col overflow-hidden">
              <a [href]="video.videoUrl" target="_blank" rel="noopener noreferrer" class="site-media-link">
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
                  <a [href]="video.videoUrl" target="_blank" rel="noopener noreferrer" class="hover:text-red-200">
                    {{ video.title }}
                  </a>
                </h3>
                <p class="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{{ video.description }}</p>
                <a
                  [href]="video.videoUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link-youtube mt-auto inline-flex w-fit pt-5"
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

  protected readonly feed = signal<YouTubeFeedResponse | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly loadingCards = [1, 2, 3] as const;

  private readonly destroyRef = inject(DestroyRef);
  private readonly youtubeFeed = inject(YouTubeFeedService);

  ngOnInit(): void {
    this.youtubeFeed.getLatestVideos$(this.maxResults)
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
    return this.feed()?.channelUrl ?? 'https://www.youtube.com/CaptainColin';
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'The YouTube feed is currently unavailable.';
  }
}
