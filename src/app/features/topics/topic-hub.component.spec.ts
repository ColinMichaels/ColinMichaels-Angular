import {convertToParamMap, ActivatedRoute} from '@angular/router';
import {provideRouter} from '@angular/router';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject, of} from 'rxjs';

import type {BlogPostSummary} from '../blog/models/blog-post.model';
import {BlogRepositoryService} from '../blog/services/blog-repository.service';
import {YouTubeFeedService} from '../youtube/services/youtube-feed.service';
import {SiteAnalyticsService} from '../../shared/analytics/site-analytics.service';
import {SeoService} from '../../shared/seo/seo.service';
import {TopicHubRepositoryService} from './services/topic-hub-repository.service';
import {TOPIC_HUBS} from './topic-hubs.data';
import {TopicHubComponent} from './topic-hub.component';

function createPost(index: number): BlogPostSummary {
  return {
    id: `post-${index}`,
    slug: `ai-workflow-${index}`,
    title: `AI workflow ${index}`,
    excerpt: `Practical AI project organization note ${index}.`,
    coverImage: `/assets/post-${index}.webp`,
    featured: index === 1,
    author: {
      name: 'Colin Michaels',
      title: 'Applications Developer',
    },
    categories: ['AI'],
    tags: ['AI workflow'],
    publishedAt: `2026-07-0${index}T00:00:00.000Z`,
    updatedAt: `2026-07-0${index}T00:00:00.000Z`,
  };
}

describe('TopicHubComponent', () => {
  let fixture: ComponentFixture<TopicHubComponent>;
  const postsSubject = new BehaviorSubject<readonly BlogPostSummary[]>([
    createPost(1),
    createPost(2),
    createPost(3),
    createPost(4),
  ]);
  const seo = jasmine.createSpyObj<SeoService>('SeoService', ['apply']);
  const routeParamsSubject = new BehaviorSubject(convertToParamMap({slug: 'ai-setup'}));

  beforeEach(async () => {
    routeParamsSubject.next(convertToParamMap({slug: 'ai-setup'}));

    await TestBed.configureTestingModule({
      imports: [TopicHubComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParamsSubject.asObservable(),
            snapshot: {paramMap: convertToParamMap({slug: 'ai-setup'})},
          },
        },
        {
          provide: BlogRepositoryService,
          useValue: {
            getPublishedPosts$: () => postsSubject.asObservable(),
            loading$: of(false),
            error$: of(null),
          },
        },
        {
          provide: TopicHubRepositoryService,
          useValue: {
            getPublishedTopicHubs$: () => of(TOPIC_HUBS),
            getPublishedTopicHubs: () => TOPIC_HUBS,
            loading$: of(false),
          },
        },
        {provide: SeoService, useValue: seo},
        {
          provide: YouTubeFeedService,
          useValue: {
            getLatestVideos$: () => of({
              fetchedAt: '2026-08-14T00:00:00.000Z',
              source: 'youtube-api',
              channelId: 'channel-id',
              channelTitle: 'Captain Colin',
              channelUrl: 'https://www.youtube.com/CaptainColin',
              videos: [],
            }),
          },
        },
        {
          provide: SiteAnalyticsService,
          useValue: jasmine.createSpyObj<SiteAnalyticsService>('SiteAnalyticsService', ['trackYouTubeOutbound']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopicHubComponent);
    fixture.detectChanges();
  });

  it('leads with topic-specific copy and artwork', () => {
    const element = fixture.nativeElement as HTMLElement;
    const heroImages = [...element.querySelectorAll<HTMLImageElement>('.topic-hub-hero-media img')];
    const heroFigure = element.querySelector<HTMLElement>('.topic-hub-hero-media');

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('AI Setup Guides');
    expect(heroImages.map(image => image.getAttribute('src'))).toEqual([
      '/assets/images/topics/ai-setup.webp',
      '/assets/images/topics/ai-setup-companion.webp',
    ]);
    expect(heroFigure?.getAttribute('aria-label')).toContain('modular AI workspace');
    expect(element.textContent).toContain('AI workflows worth starting with');
  });

  it('offers direct, pausing controls for topic scene changes', () => {
    const element = fixture.nativeElement as HTMLElement;
    const sceneButtons = [...element.querySelectorAll<HTMLButtonElement>('.topic-hub-scene-button')];

    expect(sceneButtons.length).toBe(2);
    expect(sceneButtons[0].getAttribute('aria-current')).toBe('true');

    sceneButtons[1].click();
    fixture.detectChanges();

    expect(sceneButtons[1].getAttribute('aria-current')).toBe('true');
    expect(element.querySelector('.topic-hub-scene-controls')?.classList
      .contains('topic-hub-scene-controls-paused')).toBeTrue();
    expect(element.querySelector('.topic-hub-hero-image-active')?.getAttribute('src'))
      .toBe('/assets/images/topics/ai-setup-companion.webp');
  });

  it('keeps hero title words intact when the heading wraps', () => {
    const element = fixture.nativeElement as HTMLElement;
    const heading = element.querySelector<HTMLElement>('.topic-hub-hero-copy h1');
    const style = heading ? getComputedStyle(heading) : null;

    expect(heading).not.toBeNull();
    expect(style?.overflowWrap).toBe('normal');
    expect(style?.wordBreak).toBe('normal');
    expect(style?.hyphens).toBe('none');
  });

  it('uses fan and list presentations to prioritize posts before the guide', () => {
    const element = fixture.nativeElement as HTMLElement;
    const listingRegions = [...element.querySelectorAll<HTMLElement>('[data-layout]')];
    const postImages = [...element.querySelectorAll<HTMLImageElement>('.post-listing__image')];
    const featuredSection = element.querySelector('#topic-posts');
    const guideSection = element.querySelector('#topic-guide');

    expect(listingRegions.map(region => region.dataset['layout'])).toEqual(['fan', 'list']);
    expect(listingRegions.map(region => region.dataset['mediaPresentation'])).toEqual(['background', 'standard']);
    expect(element.querySelectorAll('[data-layout="fan"] [data-post-id]').length).toBe(3);
    expect(element.querySelectorAll('[data-layout="list"] [data-post-id]').length).toBe(1);
    expect(postImages.map(image => image.getAttribute('src'))).toEqual([
      '/assets/post-1.webp',
      '/assets/post-2.webp',
      '/assets/post-3.webp',
      '/assets/post-4.webp',
    ]);
    expect(Boolean(
      featuredSection
      && guideSection
      && (featuredSection.compareDocumentPosition(guideSection) & Node.DOCUMENT_POSITION_FOLLOWING)
    )).toBeTrue();
  });

  it('applies topic-specific SEO metadata', () => {
    expect(seo.apply).toHaveBeenCalled();
    expect(seo.apply.calls.mostRecent().args[0].image).toBe('/assets/images/topics/ai-setup.webp');
  });

  it('connects the Drones and FPV hub to a topic-attributed YouTube feed', () => {
    routeParamsSubject.next(convertToParamMap({slug: 'drones-fpv'}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const youtubeSection = element.querySelector<HTMLElement>('#topic-drones-youtube');

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Drones & FPV');
    expect(youtubeSection).not.toBeNull();
    expect(youtubeSection?.textContent).toContain('Watch the flights behind the field notes.');
  });
});
