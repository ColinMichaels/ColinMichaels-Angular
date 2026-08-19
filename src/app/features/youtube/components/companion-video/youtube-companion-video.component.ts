import {ChangeDetectionStrategy, Component, Input, inject} from '@angular/core';

import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {
  CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID,
  CAPTAIN_COLIN_YOUTUBE_SUBSCRIBE_URL,
} from '../../../../shared/seo/site-identity';

@Component({
  selector: 'app-youtube-companion-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="site-card overflow-hidden border-red-500/30 bg-zinc-950 text-zinc-50"
      aria-labelledby="article-companion-video-heading"
    >
      <div class="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <a
          [href]="videoUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="site-media-link relative min-h-52 bg-zinc-900"
          (click)="recordVideoSelection('video_thumbnail')"
        >
          <img
            [src]="thumbnailUrl"
            [alt]="'Companion video for ' + articleTitle"
            width="480"
            height="360"
            class="h-full min-h-52 w-full object-cover"
            loading="lazy"
          >
          <span
            class="absolute bottom-4 left-4 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg"
          >
            Watch on YouTube
          </span>
        </a>

        <div class="flex flex-col justify-center p-6 sm:p-8">
          <p class="eyebrow eyebrow-red">Exact companion video</p>
          <h2 id="article-companion-video-heading" class="mt-3 text-2xl font-semibold leading-tight text-zinc-50">
            Watch the story behind this article.
          </h2>
          <p class="mt-4 text-sm leading-6 text-zinc-300">
            Continue with the selected Captain Colin video for the footage, demonstration, or place behind this write-up.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <a
              [href]="videoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-youtube"
              (click)="recordVideoSelection('video_watch')"
            >
              Watch companion video
            </a>
            <a
              [href]="subscribeUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-ghost"
              (click)="recordSubscriptionSelection()"
            >
              Subscribe
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class YouTubeCompanionVideoComponent {
  @Input({required: true}) videoId = '';
  @Input({required: true}) videoUrl = '';
  @Input({required: true}) thumbnailUrl = '';
  @Input({required: true}) articleTitle = '';

  protected readonly subscribeUrl = CAPTAIN_COLIN_YOUTUBE_SUBSCRIBE_URL;

  private readonly analytics = inject(SiteAnalyticsService);

  protected recordVideoSelection(action: 'video_thumbnail' | 'video_watch'): void {
    this.analytics.trackYouTubeOutbound(this.videoId, action, 'article_companion_youtube');
  }

  protected recordSubscriptionSelection(): void {
    this.analytics.trackYouTubeOutbound(
      CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID,
      'subscribe',
      'article_companion_youtube'
    );
  }
}
