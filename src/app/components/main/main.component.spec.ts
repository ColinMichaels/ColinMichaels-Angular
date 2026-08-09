import {signal} from '@angular/core';
import {ComponentFixture, DeferBlockState, TestBed} from '@angular/core/testing';
import {Meta} from '@angular/platform-browser';
import {RouterTestingModule} from '@angular/router/testing';
import {BehaviorSubject, of} from 'rxjs';

import {BlogPost, BlogPostSummary} from '../../features/blog/models/blog-post.model';
import {BlogEngagementService} from '../../features/blog/services/blog-engagement.service';
import {BlogArticleLibraryService} from '../../features/blog/services/blog-article-library.service';
import {BlogRepositoryService} from '../../features/blog/services/blog-repository.service';
import {DEFAULT_HOMEPAGE_HERO_SETTINGS} from '../../features/homepage/homepage-hero.defaults';
import {HomepageHeroRepositoryService} from '../../features/homepage/services/homepage-hero-repository.service';
import {RecommendedLink} from '../../features/recommended-links/models/recommended-link.model';
import {
  RecommendedLinkRepositoryService
} from '../../features/recommended-links/services/recommended-link-repository.service';
import {YouTubeFeedService} from '../../features/youtube/services/youtube-feed.service';
import {COLIN_AUTHOR_PROFILE} from '../../shared/author/author-profile.data';
import {TypewriterService} from '../game/services/typewriter.service';
import {MainComponent} from './main.component';
import {AuthService} from '../../services/auth.service';
import {DailyDiscoveryService} from '../../features/daily-discovery/services/daily-discovery.service';

const MOCK_FULL_POSTS: readonly BlogPost[] = [
  {
    id: 'post-architecture-boundaries',
    slug: 'architecture-boundaries',
    title: 'Architecture Boundaries for the Site and OS',
    excerpt: 'A short implementation note on separating the public site, reusable OS framework, labs, and future admin tools.',
    coverImage: '/assets/images/backgrounds/day.webp',
    author: {
      name: 'Colin Michaels',
      title: 'Applications Developer',
    },
    categories: ['Architecture'],
    tags: ['Angular', 'Refactor', 'Core OS'],
    status: 'published',
    seo: {
      title: 'Architecture Boundaries for the Site and OS',
      description: 'A short implementation note on separating architecture boundaries.',
      openGraphImage: '/assets/images/backgrounds/day.webp',
    },
    contentFormat: 'editorjs',
    blocks: [
      {
        id: 'architecture-intro',
        type: 'paragraph',
        data: {
          text: 'A short implementation note on separating architecture boundaries.',
        },
      },
    ],
    createdAt: '2026-05-13T19:30:00.000Z',
    publishedAt: '2026-05-13T19:30:00.000Z',
    updatedAt: '2026-05-13T19:30:00.000Z',
  },
  {
    id: 'post-open-heart-weekly-update',
    slug: 'open-heart-surgery-weekly-update',
    title: 'Open heart surgery weekly update',
    excerpt: 'A personal recovery note after recent open heart surgery.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {
      name: 'Colin Michaels',
    },
    categories: ['Weekly Updates'],
    tags: ['Open Heart Surgery', 'Recovery'],
    featured: true,
    status: 'published',
    seo: {
      title: 'Open heart surgery weekly update',
      description: 'A personal recovery note after recent open heart surgery.',
      openGraphImage: '/assets/images/backgrounds/night.webp',
    },
    contentFormat: 'editorjs',
    blocks: [
      {
        id: 'weekly-update-intro',
        type: 'paragraph',
        data: {
          text: 'A personal recovery note after recent open heart surgery.',
        },
      },
    ],
    createdAt: '2026-06-01T12:00:00.000Z',
    publishedAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'post-surgery-medical-notes',
    slug: 'open-heart-surgery-medical-notes',
    title: 'Open heart surgery medical information',
    excerpt: 'Procedure notes, medications, and cardiology context from the surgery.',
    coverImage: '/assets/images/backgrounds/day.webp',
    author: {
      name: 'Colin Michaels',
    },
    categories: ['Medical Information'],
    tags: ['Cardiology', 'Medications'],
    status: 'published',
    seo: {
      title: 'Open heart surgery medical information',
      description: 'Procedure notes, medications, and cardiology context from the surgery.',
      openGraphImage: '/assets/images/backgrounds/day.webp',
    },
    contentFormat: 'editorjs',
    blocks: [
      {
        id: 'medical-notes-intro',
        type: 'paragraph',
        data: {
          text: 'Procedure notes, medications, and cardiology context from the surgery.',
        },
      },
    ],
    createdAt: '2026-06-02T12:00:00.000Z',
    publishedAt: '2026-06-02T12:00:00.000Z',
    updatedAt: '2026-06-02T12:00:00.000Z',
  },
];
const MOCK_POSTS: readonly BlogPostSummary[] = MOCK_FULL_POSTS;
const MOCK_RECOMMENDED_LINKS: readonly RecommendedLink[] = [
  {
    id: 'recommended-link-futuretools',
    title: 'FutureTools.io',
    description: 'A fast way to scan useful AI tools.',
    meta: 'AI tools',
    href: 'https://futuretools.io/',
    host: 'futuretools.io',
    status: 'published',
    featuredSlot: 1,
    displayOrder: 10,
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z',
  },
];

async function renderDeferredHomepageContent(fixture: ComponentFixture<MainComponent>): Promise<void> {
  fixture.detectChanges();

  const deferBlocks = await fixture.getDeferBlocks();
  await Promise.all(deferBlocks.map((deferBlock) => deferBlock.render(DeferBlockState.Complete)));

  fixture.detectChanges();
}

describe('MainComponent', () => {
  let fixture: ComponentFixture<MainComponent>;
  let blogRepositoryService: Pick<
    BlogRepositoryService,
    'getPublishedPosts$' | 'getPublishedFullPosts$' | 'getPublishedFullPosts' | 'loading$' | 'error$'
  >;

  beforeEach(async () => {
    blogRepositoryService = {
      getPublishedPosts$: jasmine.createSpy('getPublishedPosts$').and.returnValue(of(MOCK_POSTS)),
      getPublishedFullPosts$: jasmine.createSpy('getPublishedFullPosts$').and.returnValue(of(MOCK_FULL_POSTS)),
      getPublishedFullPosts: jasmine.createSpy('getPublishedFullPosts').and.returnValue(MOCK_FULL_POSTS),
      loading$: of(false),
      error$: of(null),
    } satisfies Pick<BlogRepositoryService, 'getPublishedPosts$' | 'getPublishedFullPosts$' | 'getPublishedFullPosts' | 'loading$' | 'error$'>;
    const youtubeFeedService = {
      getLatestVideos$: jasmine.createSpy('getLatestVideos$').and.returnValue(of({
        fetchedAt: '2026-06-14T00:00:00.000Z',
        source: 'youtube-api',
        channelId: 'channel-id',
        channelTitle: 'Captain Colin',
        channelUrl: 'https://www.youtube.com/CaptainColin',
        videos: [],
      })),
    } satisfies Pick<YouTubeFeedService, 'getLatestVideos$'>;
    const recommendedLinkRepositoryService = {
      getFeaturedRecommendedLinks$: jasmine.createSpy('getFeaturedRecommendedLinks$').and.returnValue(of(MOCK_RECOMMENDED_LINKS)),
      getFeaturedRecommendedLinks: jasmine.createSpy('getFeaturedRecommendedLinks').and.returnValue(MOCK_RECOMMENDED_LINKS),
    } satisfies Pick<RecommendedLinkRepositoryService, 'getFeaturedRecommendedLinks$' | 'getFeaturedRecommendedLinks'>;
    const homepageHeroRepositoryService = {
      settings: signal(DEFAULT_HOMEPAGE_HERO_SETTINGS),
    } satisfies Pick<HomepageHeroRepositoryService, 'settings'>;
    const authService = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(of(false)),
      user$: of(null),
    } satisfies Pick<AuthService, 'isAuthenticated' | 'user$'>;
    const dailyDiscoveryService = {
      getChallenge: jasmine.createSpy('getChallenge').and.resolveTo({
        id: 'family-ai-voice-safe-word',
        dateKey: '2026-08-09',
        question: 'What family rule can help stop an AI voice scam?',
        points: 5,
        completedToday: false,
        progress: null,
      }),
      submitAnswer: jasmine.createSpy('submitAnswer'),
    } satisfies Pick<DailyDiscoveryService, 'getChallenge' | 'submitAnswer'>;
    const blogEngagementService = {
      recordSiteShare: jasmine.createSpy('recordSiteShare').and.resolveTo({awarded: false, points: 0, total: 0}),
    } satisfies Pick<BlogEngagementService, 'recordSiteShare'>;
    const typewriterService = jasmine.createSpyObj<Pick<TypewriterService, 'enableSound' | 'setVolume' | 'clear' | 'enqueueLine'>>(
      'TypewriterService',
      ['enableSound', 'setVolume', 'clear', 'enqueueLine'],
    ) as unknown as Pick<TypewriterService, 'enableSound' | 'setVolume' | 'clear' | 'enqueueLine'> & {
      typedText$: BehaviorSubject<string>;
    };
    typewriterService.typedText$ = new BehaviorSubject('');
    await TestBed.configureTestingModule({
      imports: [
        MainComponent,
        RouterTestingModule,
      ],
      providers: [
        {provide: BlogRepositoryService, useValue: blogRepositoryService},
        {provide: BlogArticleLibraryService, useValue: {inProgress: signal([]).asReadonly()}},
        {provide: AuthService, useValue: authService},
        {provide: BlogEngagementService, useValue: blogEngagementService},
        {provide: DailyDiscoveryService, useValue: dailyDiscoveryService},
        {provide: HomepageHeroRepositoryService, useValue: homepageHeroRepositoryService},
        {provide: RecommendedLinkRepositoryService, useValue: recommendedLinkRepositoryService},
        {provide: TypewriterService, useValue: typewriterService},
        {provide: YouTubeFeedService, useValue: youtubeFeedService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainComponent);
  });

  it('renders the SPA homepage sections', async () => {
    await renderDeferredHomepageContent(fixture);

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.site-page')).not.toBeNull();
    expect(element.querySelector('#work')).not.toBeNull();
    expect(element.querySelector('#about')).not.toBeNull();
    expect(element.querySelector('#home-article-hero')).not.toBeNull();
    expect(element.querySelector('app-daily-discovery-rail')).not.toBeNull();
    expect(element.querySelector('#blog')).not.toBeNull();
    expect(element.querySelector('#topic-guides')).not.toBeNull();
    expect(element.querySelector('#health-recovery')).not.toBeNull();
    expect(element.querySelector('#medical-information')).not.toBeNull();
    expect(element.querySelector('#labs')).toBeNull();
    expect(element.querySelector('#os')).toBeNull();
    expect(element.textContent?.match(/Report a Bug/g)?.length).toBe(1);
    expect(element.querySelector('[aria-label="Share ColinMichaels.com"]')).not.toBeNull();
  });

  it('renders informational navigation and ownership details in the homepage footer section', () => {
    fixture.detectChanges();

    const footer = (fixture.nativeElement as HTMLElement).querySelector('#site-footer');
    const footerText = footer?.textContent ?? '';

    expect(footer?.querySelector('nav[aria-label="Footer navigation"]')).not.toBeNull();
    expect(footer?.querySelector('a[href="/privacy"]')?.textContent?.trim()).toBe('Privacy Policy');
    expect(footer?.querySelector('a[href="/contact"]')?.textContent?.trim()).toBe('Contact');
    expect(footerText).toContain(`© ${new Date().getFullYear()} Colin Michaels. All rights reserved.`);
    expect(footerText).toContain('Home');
    expect(footerText).toContain('Blog');
    expect(footer?.querySelector('a[href="/authors"]')?.textContent?.trim()).toBe('Authors');
    expect(footer?.querySelector('a[href="/write-for-us"]')?.textContent?.trim()).toBe('Write for Us');
    expect(footerText).toContain('Topics');
    expect(footerText).toContain('About');
    expect(footerText).toContain('Open OS');
  });

  it('renders CMS-managed recommended links on the homepage', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('#links')?.textContent).toContain('Recommended Sites');
    expect(element.querySelector('#links')?.textContent).toContain('FutureTools.io');
    expect(element.querySelector<HTMLAnchorElement>('#links a')?.href).toBe('https://futuretools.io/');
  });

  it('applies a versioned homepage social image from the selected post feed', () => {
    fixture.detectChanges();

    const image = TestBed.inject(Meta).getTag("property='og:image'")?.content ?? '';
    expect(image).toContain('/assets/images/backgrounds/night.jpg?ogv=');
  });

  it('embeds published blog content on the homepage', async () => {
    await renderDeferredHomepageContent(fixture);

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('A Life of Curiosity.');
    expect(element.textContent).toContain('A Journey of Growth.');
    expect(element.textContent).toContain('More writing');
    expect(element.querySelector('#home-article-hero')?.textContent).toContain('Open heart surgery weekly update');

    const moreWritingSection = element.querySelector('#blog');
    expect(moreWritingSection?.textContent).toContain('Architecture Boundaries for the Site and OS');
    expect(moreWritingSection?.textContent).toContain('Open heart surgery medical information');
    expect(moreWritingSection?.textContent).not.toContain('Open heart surgery weekly update');
  });

  it('shares one published post feed across homepage blog sections', async () => {
    await renderDeferredHomepageContent(fixture);

    expect(blogRepositoryService.getPublishedFullPosts$).toHaveBeenCalledTimes(1);
    expect(blogRepositoryService.getPublishedFullPosts).toHaveBeenCalledTimes(1);
    expect(blogRepositoryService.getPublishedPosts$).not.toHaveBeenCalled();
  });

  it('renders the homepage author bio section', async () => {
    await renderDeferredHomepageContent(fixture);

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('#about')?.textContent).toContain('About Me');
    expect(element.querySelector('#about')?.textContent).toContain('application developer, creative problem solver');
    expect(element.querySelector('#about img')?.getAttribute('src')).toBe(COLIN_AUTHOR_PROFILE.imageUrl);
  });

  it('shows health recovery and medical information blog sections', async () => {
    await renderDeferredHomepageContent(fixture);

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('#health-recovery')?.textContent).toContain('Open heart surgery weekly update');
    expect(element.querySelector('#medical-information')?.textContent).toContain('Open heart surgery medical information');
  });
});
