import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';

import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {
  YOUTUBE_CHANNEL_ID,
  YOUTUBE_SUBSCRIBE_URL,
} from '../../../../shared/seo/site-identity';
import {YouTubeFeedService} from '../../services/youtube-feed.service';
import {YouTubeLatestVideosComponent} from './youtube-latest-videos.component';

describe('YouTubeLatestVideosComponent', () => {
  it('renders a clear channel promise and tracks video and subscription choices', () => {
    const analytics = jasmine.createSpyObj<SiteAnalyticsService>('SiteAnalyticsService', ['trackYouTubeOutbound']);
    const youtubeFeed = {
      getLatestVideos$: jasmine.createSpy('getLatestVideos$').and.returnValue(of({
        fetchedAt: '2026-08-14T00:00:00.000Z',
        source: 'youtube-api' as const,
        channelId: 'channel-id',
        channelTitle: 'Captain Colin',
        channelUrl: 'https://www.youtube.com/CaptainColin',
        videos: [{
          id: 'video-id',
          title: 'A useful test flight',
          description: 'A short FPV flight.',
          publishedAt: '2026-08-13T00:00:00.000Z',
          thumbnailUrl: 'https://i.ytimg.com/vi/video-id/hqdefault.jpg',
          thumbnailAlt: 'A useful test flight thumbnail',
          videoUrl: 'https://www.youtube.com/watch?v=video-id',
        }],
      })),
    } satisfies Pick<YouTubeFeedService, 'getLatestVideos$'>;

    TestBed.configureTestingModule({
      imports: [YouTubeLatestVideosComponent],
      providers: [
        {provide: SiteAnalyticsService, useValue: analytics},
        {provide: YouTubeFeedService, useValue: youtubeFeed},
      ],
    });

    const fixture = TestBed.createComponent(YouTubeLatestVideosComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const subscribeLink = element.querySelector<HTMLAnchorElement>('a[href*="sub_confirmation=1"]');
    const watchLink = [...element.querySelectorAll<HTMLAnchorElement>('a')]
      .find(link => link.textContent?.includes('Watch on YouTube'));

    expect(element.textContent).toContain('FPV flights, Florida places, and creator experiments.');
    expect(subscribeLink?.href).toBe(YOUTUBE_SUBSCRIBE_URL);

    watchLink?.click();
    subscribeLink?.click();

    expect(analytics.trackYouTubeOutbound).toHaveBeenCalledWith('video-id', 'video_watch', 'homepage_youtube');
    expect(analytics.trackYouTubeOutbound).toHaveBeenCalledWith(
      YOUTUBE_CHANNEL_ID,
      'subscribe',
      'homepage_youtube'
    );
  });

  it('supports contextual copy, section identity, and analytics attribution', () => {
    const analytics = jasmine.createSpyObj<SiteAnalyticsService>('SiteAnalyticsService', ['trackYouTubeOutbound']);
    const youtubeFeed = {
      getLatestVideos$: jasmine.createSpy('getLatestVideos$').and.returnValue(of({
        fetchedAt: '2026-08-14T00:00:00.000Z',
        source: 'youtube-api' as const,
        channelId: 'channel-id',
        channelTitle: 'Captain Colin',
        channelUrl: 'https://www.youtube.com/CaptainColin',
        videos: [],
      })),
    } satisfies Pick<YouTubeFeedService, 'getLatestVideos$'>;

    TestBed.configureTestingModule({
      imports: [YouTubeLatestVideosComponent],
      providers: [
        {provide: SiteAnalyticsService, useValue: analytics},
        {provide: YouTubeFeedService, useValue: youtubeFeed},
      ],
    });

    const fixture = TestBed.createComponent(YouTubeLatestVideosComponent);
    fixture.componentRef.setInput('sectionId', 'article-drone-youtube');
    fixture.componentRef.setInput('heading', 'Watch the flights behind the field notes.');
    fixture.componentRef.setInput('analyticsSourceComponent', 'article_drones_youtube');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const section = element.querySelector('section');
    const channelLink = [...element.querySelectorAll<HTMLAnchorElement>('a')]
      .find(link => link.textContent?.includes('View channel'));

    channelLink?.click();

    expect(section?.id).toBe('article-drone-youtube');
    expect(section?.getAttribute('aria-labelledby')).toBe('article-drone-youtube-heading');
    expect(element.textContent).toContain('Watch the flights behind the field notes.');
    expect(analytics.trackYouTubeOutbound).toHaveBeenCalledWith(
      YOUTUBE_CHANNEL_ID,
      'channel',
      'article_drones_youtube'
    );
  });
});
