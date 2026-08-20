import {TestBed} from '@angular/core/testing';

import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {
  CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID,
  CAPTAIN_COLIN_YOUTUBE_SUBSCRIBE_URL,
  COLIN_MICHAELS_YOUTUBE_CHANNEL_ID,
  COLIN_MICHAELS_YOUTUBE_SUBSCRIBE_URL,
} from '../../../../shared/seo/site-identity';
import {YouTubeCompanionVideoComponent} from './youtube-companion-video.component';

describe('YouTubeCompanionVideoComponent', () => {
  it('uses Colin Michaels for a general article companion and records bounded attribution', () => {
    const analytics = jasmine.createSpyObj<SiteAnalyticsService>(
      'SiteAnalyticsService',
      ['trackYouTubeOutbound']
    );

    TestBed.configureTestingModule({
      imports: [YouTubeCompanionVideoComponent],
      providers: [{provide: SiteAnalyticsService, useValue: analytics}],
    });

    const fixture = TestBed.createComponent(YouTubeCompanionVideoComponent);
    fixture.componentRef.setInput('videoId', 'L229QDxDakU');
    fixture.componentRef.setInput('videoUrl', 'https://www.youtube.com/watch?v=L229QDxDakU');
    fixture.componentRef.setInput('thumbnailUrl', 'https://i.ytimg.com/vi/L229QDxDakU/hqdefault.jpg');
    fixture.componentRef.setInput('articleTitle', 'A Florida FPV flight');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const watchLink = [...element.querySelectorAll<HTMLAnchorElement>('a')]
      .find(link => link.textContent?.includes('Watch companion video'));
    const subscribeLink = [...element.querySelectorAll<HTMLAnchorElement>('a')]
      .find(link => link.textContent?.trim() === 'Subscribe');

    expect(watchLink?.href).toBe('https://www.youtube.com/watch?v=L229QDxDakU');
    expect(subscribeLink?.href).toBe(COLIN_MICHAELS_YOUTUBE_SUBSCRIBE_URL);
    expect(element.querySelector('img')?.alt).toBe('Companion video for A Florida FPV flight');
    expect(element.textContent).toContain('follow Colin Michaels for future work');

    watchLink?.click();
    subscribeLink?.click();

    expect(analytics.trackYouTubeOutbound).toHaveBeenCalledWith(
      'L229QDxDakU',
      'video_watch',
      'article_companion_youtube'
    );
    expect(analytics.trackYouTubeOutbound).toHaveBeenCalledWith(
      COLIN_MICHAELS_YOUTUBE_CHANNEL_ID,
      'subscribe',
      'article_companion_youtube'
    );
  });

  it('keeps Captain Colin for an explicitly selected FPV companion', () => {
    const analytics = jasmine.createSpyObj<SiteAnalyticsService>('SiteAnalyticsService', ['trackYouTubeOutbound']);

    TestBed.configureTestingModule({
      imports: [YouTubeCompanionVideoComponent],
      providers: [{provide: SiteAnalyticsService, useValue: analytics}],
    });

    const fixture = TestBed.createComponent(YouTubeCompanionVideoComponent);
    fixture.componentRef.setInput('videoId', 'L229QDxDakU');
    fixture.componentRef.setInput('videoUrl', 'https://www.youtube.com/watch?v=L229QDxDakU');
    fixture.componentRef.setInput('thumbnailUrl', 'https://i.ytimg.com/vi/L229QDxDakU/hqdefault.jpg');
    fixture.componentRef.setInput('articleTitle', 'A Florida FPV flight');
    fixture.componentRef.setInput('channel', 'captain-colin');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const subscribeLink = [...element.querySelectorAll<HTMLAnchorElement>('a')]
      .find(link => link.textContent?.trim() === 'Subscribe');

    expect(subscribeLink?.href).toBe(CAPTAIN_COLIN_YOUTUBE_SUBSCRIBE_URL);
    expect(element.textContent).toContain('follow Captain Colin for future work');

    subscribeLink?.click();

    expect(analytics.trackYouTubeOutbound).toHaveBeenCalledWith(
      CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID,
      'subscribe',
      'article_companion_youtube'
    );
  });
});
