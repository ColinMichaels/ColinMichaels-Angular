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
    <section id="youtube" class="border-y border-white/10 bg-neutral-950 py-14">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="blog-section-rule flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div class="max-w-2xl">
            <p class="text-sm uppercase tracking-[0.28em] text-red-300">YouTube</p>
            <h2 class="mt-3 text-3xl font-semibold text-zinc-50 sm:text-4xl">Latest videos</h2>
            <p class="mt-4 text-sm leading-6 text-zinc-400">
              Recent uploads from the channel, pulled through the site backend so API credentials stay off the client.
            </p>
          </div>

          <a
            [href]="channelUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex w-fit border border-red-300/70 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-300 hover:text-neutral-950"
          >
            View channel
          </a>
        </div>

        @if (loadError(); as error) {
          <div class="mt-8 border border-red-300/30 bg-red-950/20 p-5 text-zinc-300">
            <p class="font-medium text-red-100">Unable to load latest videos.</p>
            <p class="mt-2 text-sm leading-6 text-zinc-400">{{ error }}</p>
          </div>
        } @else if (isLoading()) {
        <div class="mt-8 grid gap-5 lg:grid-cols-3" aria-label="Loading latest YouTube videos">
          @for (item of loadingCards; track item) {
            <div class="animate-pulse border border-white/10 bg-zinc-900/70">
              <div class="aspect-video bg-zinc-800"></div>
              <div class="space-y-3 p-5">
                <div class="h-3 w-28 bg-zinc-800"></div>
                <div class="h-5 w-4/5 bg-zinc-800"></div>
                <div class="h-3 w-full bg-zinc-800"></div>
                <div class="h-3 w-2/3 bg-zinc-800"></div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="mt-8 grid gap-5 lg:grid-cols-3">
          @for (video of videos; track video.id) {
            <article class="group flex h-full flex-col overflow-hidden border border-white/10">
              <a [href]="video.videoUrl" target="_blank" rel="noopener noreferrer" class="block overflow-hidden">
                <img
                  [src]="video.thumbnailUrl"
                  [alt]="video.thumbnailAlt"
                  class="aspect-video w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                >
              </a>
              <div class="flex flex-1 flex-col p-5">
                <p class="text-xs uppercase tracking-[0.22em] text-zinc-500">
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
                  class="mt-auto inline-flex w-fit pt-5 text-sm font-medium text-red-200 hover:text-red-100"
                >
                  Watch on YouTube
                </a>
              </div>
            </article>
          } @empty {
          <p class="border border-white/10 p-5 text-zinc-400">No public YouTube videos are available yet.</p>
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
