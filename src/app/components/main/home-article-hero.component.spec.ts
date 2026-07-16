import {ComponentFixture, TestBed} from '@angular/core/testing';
import {computed, signal, WritableSignal} from '@angular/core';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

import {BlogPost} from '../../features/blog/models/blog-post.model';
import {DEFAULT_HOMEPAGE_HERO_SETTINGS} from '../../features/homepage/homepage-hero.defaults';
import {HomepageHeroSettings} from '../../features/homepage/models/homepage-hero.model';
import {HomepageHeroRepositoryService} from '../../features/homepage/services/homepage-hero-repository.service';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import {getPublishedTopicHubs, TopicHub} from '../../features/topics/topic-hubs.data';
import {HomeArticleHeroComponent} from './home-article-hero.component';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';

const HERO_BACKGROUND_IMAGE = '/assets/images/backgrounds/colinmichaels-hero-background.webp';

function createPost(index: number, overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: `post-${index}`,
    slug: `post-${index}`,
    title: `Post ${index} title`,
    excerpt: `Post ${index} excerpt for the article hero.`,
    coverImage: '/assets/images/backgrounds/day.webp',
    thumbnailImage: '/assets/images/backgrounds/night.webp',
    author: {
      name: 'Colin Michaels',
    },
    categories: ['Tech Tips'],
    subcategories: [],
    tags: ['AI'],
    status: 'published',
    seo: {
      title: `Post ${index} title`,
      description: `Post ${index} excerpt for the article hero.`,
      openGraphImage: '/assets/images/backgrounds/day.webp',
    },
    contentFormat: 'editorjs',
    blocks: [
      {
        id: `post-${index}-paragraph`,
        type: 'paragraph',
        data: {
          text: 'Short post body.',
        },
      },
    ],
    createdAt: `2026-06-0${index}T12:00:00.000Z`,
    updatedAt: `2026-06-0${index}T12:00:00.000Z`,
    publishedAt: `2026-06-0${index}T12:00:00.000Z`,
    ...overrides,
  };
}

function configureBlogPostFeed(posts: readonly BlogPost[]) {
  return {
    publishedPosts: signal(posts),
    isLoading: signal(false),
    loadError: signal<string | null>(null),
    isReady: computed(() => true),
  } satisfies Pick<HomeBlogPostFeedService, 'publishedPosts' | 'isLoading' | 'loadError' | 'isReady'>;
}

function configureTopicHubRepository(topicHubs: readonly TopicHub[]) {
  return {
    getPublishedTopicHubs$: jasmine.createSpy('getPublishedTopicHubs$').and.returnValue(of(topicHubs)),
    getPublishedTopicHubs: jasmine.createSpy('getPublishedTopicHubs').and.returnValue(topicHubs),
  } satisfies Pick<TopicHubRepositoryService, 'getPublishedTopicHubs$' | 'getPublishedTopicHubs'>;
}

function configureHomepageHeroRepository(settings: HomepageHeroSettings = DEFAULT_HOMEPAGE_HERO_SETTINGS) {
  return {
    settings: signal(settings),
  } satisfies Pick<HomepageHeroRepositoryService, 'settings'>;
}

describe('HomeArticleHeroComponent', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
    window.matchMedia = jasmine.createSpy('matchMedia').and.returnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener'),
      addListener: jasmine.createSpy('addListener'),
      removeListener: jasmine.createSpy('removeListener'),
      dispatchEvent: jasmine.createSpy('dispatchEvent'),
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  async function createComponent(
    posts: readonly BlogPost[],
    heroSettings: HomepageHeroSettings = DEFAULT_HOMEPAGE_HERO_SETTINGS
  ): Promise<ComponentFixture<HomeArticleHeroComponent>> {
    const topicHubs = getPublishedTopicHubs();

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        HomeArticleHeroComponent,
        RouterTestingModule,
      ],
      providers: [
        {provide: HomeBlogPostFeedService, useValue: configureBlogPostFeed(posts)},
        {provide: HomepageHeroRepositoryService, useValue: configureHomepageHeroRepository(heroSettings)},
        {provide: TopicHubRepositoryService, useValue: configureTopicHubRepository(topicHubs)},
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomeArticleHeroComponent);
    fixture.detectChanges();

    return fixture;
  }

  it('renders the newest post in the hero', async () => {
    const fixture = await createComponent([
      createPost(1),
      createPost(2),
      createPost(3),
      createPost(4),
      createPost(5),
    ]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.home-hero-panel').length).toBe(1);
    expect(element.textContent).toContain('Post 5 title');
    expect(element.textContent).not.toContain('Post 4 title');
  });

  it('renders the newest featured post while preserving older feature flags', async () => {
    const olderFeatured = createPost(1, {featured: true});
    const newerFeatured = createPost(4, {featured: true});
    const fixture = await createComponent([
      olderFeatured,
      createPost(5),
      newerFeatured,
    ]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Post 4 title');
    expect(element.textContent).not.toContain('Post 1 title');
    expect(olderFeatured.featured).toBeTrue();

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 5 title');
  });

  it('cycles one post at a time and only renders arrows for available directions', async () => {
    const fixture = await createComponent([
      createPost(1),
      createPost(2, {thumbnailImage: '/assets/images/backgrounds/day.webp'}),
      createPost(3),
    ]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.home-hero-panel').length).toBe(1);
    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 3 title');
    expect(element.querySelector('.home-hero-post-control-previous')).toBeNull();
    expect(element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.type).toBe('button');
    expect(element.querySelector('.home-hero-post-control-next')?.getAttribute('aria-label'))
      .toBe('Show next post: Post 2 title');
    expect(element.querySelector('.home-hero-post-position')?.textContent).toContain('1 / 3');

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.home-hero-panel').length).toBe(1);
    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 2 title');
    expect(element.querySelector('.home-hero-panel')?.getAttribute('href')).toBe('/blog/post-2');
    expect(element.querySelector('.home-hero-panel')?.getAttribute('aria-label')).toBe('Read more: Post 2 title');
    expect(element.querySelector<HTMLImageElement>('.home-hero-panel-image')?.getAttribute('src'))
      .toBe('/assets/images/backgrounds/day.webp');
    expect(element.querySelector('.home-hero-post-control-previous')?.getAttribute('aria-label'))
      .toBe('Show previous post: Post 3 title');
    expect(element.querySelector('.home-hero-post-control-next')?.getAttribute('aria-label'))
      .toBe('Show next post: Post 1 title');
    expect(element.querySelector('.home-hero-post-position')?.textContent).toContain('2 / 3');

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 1 title');
    expect(element.querySelector('.home-hero-post-control-next')).toBeNull();
    expect(element.querySelector('.home-hero-post-control-previous')?.getAttribute('aria-label'))
      .toBe('Show previous post: Post 2 title');

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-previous')?.click();
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 2 title');
  });

  it('moves focus to the remaining arrow when endpoint navigation removes the active control', async () => {
    const fixture = await createComponent([createPost(1), createPost(2)]);
    const element = fixture.nativeElement as HTMLElement;
    const nextButton = element.querySelector<HTMLButtonElement>('.home-hero-post-control-next');

    nextButton?.focus();
    nextButton?.click();
    fixture.detectChanges();

    const previousButton = element.querySelector<HTMLButtonElement>('.home-hero-post-control-previous');
    expect(document.activeElement).toBe(previousButton);

    previousButton?.click();
    fixture.detectChanges();

    expect(document.activeElement).toBe(element.querySelector('.home-hero-post-control-next'));
  });

  it('does not render post navigation when only one post is available', async () => {
    const fixture = await createComponent([createPost(1)]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.home-hero-panel').length).toBe(1);
    expect(element.querySelector('.home-hero-post-controls')).toBeNull();
  });

  it('returns to the gallery lead when the published post set changes', async () => {
    const fixture = await createComponent([
      createPost(1),
      createPost(2),
      createPost(3),
    ]);
    const element = fixture.nativeElement as HTMLElement;
    const postFeed = TestBed.inject(HomeBlogPostFeedService) as unknown as {
      publishedPosts: WritableSignal<readonly BlogPost[]>;
    };

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 2 title');

    postFeed.publishedPosts.set([createPost(4), createPost(5)]);
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 5 title');
    expect(element.querySelector('.home-hero-post-control-previous')).toBeNull();
  });

  it('keeps the active post selected when recent posts reorder behind the same lead', async () => {
    const leadPost = createPost(3, {featured: true});
    const fixture = await createComponent([createPost(1), createPost(2), leadPost]);
    const element = fixture.nativeElement as HTMLElement;
    const postFeed = TestBed.inject(HomeBlogPostFeedService) as unknown as {
      publishedPosts: WritableSignal<readonly BlogPost[]>;
    };

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 2 title');

    postFeed.publishedPosts.set([createPost(1), createPost(2), leadPost, createPost(4)]);
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 2 title');
    expect(element.querySelector('.home-hero-post-position')?.textContent).toContain('3 / 4');
  });

  it('clamps to the nearest remaining post when the active post disappears behind the same lead', async () => {
    const secondPost = createPost(2);
    const leadPost = createPost(3, {featured: true});
    const fixture = await createComponent([createPost(1), secondPost, leadPost]);
    const element = fixture.nativeElement as HTMLElement;
    const postFeed = TestBed.inject(HomeBlogPostFeedService) as unknown as {
      publishedPosts: WritableSignal<readonly BlogPost[]>;
    };

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 1 title');

    postFeed.publishedPosts.set([secondPost, leadPost]);
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 2 title');
    expect(element.querySelector('.home-hero-post-position')?.textContent).toContain('2 / 2');
    expect(element.querySelector('.home-hero-post-control-next')).toBeNull();
  });

  it('uses the supplied full hero background image', async () => {
    const fixture = await createComponent([createPost(1)]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLImageElement>('.home-hero-background-image')?.getAttribute('src'))
      .toBe(HERO_BACKGROUND_IMAGE);
  });

  it('renders CMS-managed hero copy and background slides', async () => {
    const fixture = await createComponent([createPost(1)], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      headlineLines: ['Custom hero', 'Second line'],
      summary: 'Custom homepage hero summary.',
      slides: [
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'slide-one',
          imageUrl: '/assets/images/backgrounds/day.webp',
          focalPointX: 42,
          focalPointY: 58,
          kenBurnsEnabled: true,
        },
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'slide-two',
          imageUrl: '/assets/images/backgrounds/night.webp',
          sortOrder: 20,
        },
      ],
    });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Custom hero');
    expect(element.textContent).toContain('Second line');
    expect(element.textContent).toContain('Custom homepage hero summary.');
    expect(element.querySelectorAll('.home-hero-background-image').length).toBe(2);
    const firstSlide = element.querySelector<HTMLElement>('.home-hero-background-image');

    expect(firstSlide?.style.objectPosition).toBe('42% 58%');
    expect(firstSlide?.style.getPropertyValue('--home-hero-transition-duration')).toBe('1400ms');
    expect(element.querySelector('.home-hero-background-image.has-ken-burns')).not.toBeNull();
    expect(element.querySelector('.home-hero-slide-controls')).toBeNull();
  });

  it('replaces the CMS slideshow with the featured post background', async () => {
    const fixture = await createComponent([
      createPost(1, {
        featured: true,
        backgroundImage: '/assets/images/backgrounds/day.webp',
      }),
    ], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      useFeaturedPostBackground: true,
      slides: [
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'slide-one',
          imageUrl: '/assets/images/backgrounds/day.webp',
        },
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'slide-two',
          imageUrl: '/assets/images/backgrounds/night.webp',
          sortOrder: 20,
        },
      ],
    });
    const element = fixture.nativeElement as HTMLElement;
    const images = element.querySelectorAll<HTMLImageElement>('.home-hero-background-image');
    const background = images.item(0);

    expect(images.length).toBe(1);
    expect(background.getAttribute('src')).toBe('/assets/images/backgrounds/day.webp');
    expect(background.getAttribute('alt')).toBe('');
    expect(background.style.objectPosition).toBe('50% 50%');
    expect(background.classList.contains('has-ken-burns')).toBeFalse();
    expect(background.getAttribute('fetchpriority')).toBe('high');
    expect(background.hasAttribute('data-site-preload-image')).toBeTrue();
    expect(element.querySelector('.home-hero-slideshow')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('restores CMS slides when a featured post background fails to load', async () => {
    const fixture = await createComponent([
      createPost(1, {featured: true, backgroundImage: '/assets/images/backgrounds/day.webp'}),
    ], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      useFeaturedPostBackground: true,
      slides: [
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'slide-one',
          imageUrl: '/assets/images/backgrounds/day.webp',
        },
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'slide-two',
          imageUrl: '/assets/images/backgrounds/night.webp',
          sortOrder: 20,
        },
      ],
    });
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLImageElement>('.home-hero-background-image')
      ?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const images = Array.from(element.querySelectorAll<HTMLImageElement>('.home-hero-background-image'));
    expect(images.map(image => image.getAttribute('src'))).toEqual([
      '/assets/images/backgrounds/day.webp',
      '/assets/images/backgrounds/night.webp',
    ]);
  });

  it('retries a post background after the hero candidate changes away and back', async () => {
    const firstPost = createPost(1, {
      featured: true,
      backgroundImage: '/assets/images/backgrounds/day.webp',
    });
    const secondPost = createPost(2, {
      featured: true,
      backgroundImage: '/assets/images/backgrounds/night.webp',
    });
    const fixture = await createComponent([firstPost], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      useFeaturedPostBackground: true,
    });
    const element = fixture.nativeElement as HTMLElement;
    const postFeed = TestBed.inject(HomeBlogPostFeedService) as unknown as {
      publishedPosts: WritableSignal<readonly BlogPost[]>;
    };

    element.querySelector<HTMLImageElement>('.home-hero-background-image')
      ?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(element.querySelector<HTMLImageElement>('.home-hero-background-image')?.getAttribute('src'))
      .toBe(HERO_BACKGROUND_IMAGE);

    postFeed.publishedPosts.set([secondPost]);
    fixture.detectChanges();
    expect(element.querySelector<HTMLImageElement>('.home-hero-background-image')?.getAttribute('src'))
      .toBe('/assets/images/backgrounds/night.webp');

    postFeed.publishedPosts.set([firstPost]);
    fixture.detectChanges();
    expect(element.querySelector<HTMLImageElement>('.home-hero-background-image')?.getAttribute('src'))
      .toBe('/assets/images/backgrounds/day.webp');
  });

  it('keeps the homepage slideshow when the featured post background option is disabled', async () => {
    const fixture = await createComponent([
      createPost(1, {
        featured: true,
        backgroundImage: '/assets/images/backgrounds/day.webp',
      }),
    ], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      useFeaturedPostBackground: false,
      slides: [
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'slide-one',
          imageUrl: '/assets/images/backgrounds/night.webp',
        },
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'slide-two',
          imageUrl: HERO_BACKGROUND_IMAGE,
          sortOrder: 20,
        },
      ],
    });
    const element = fixture.nativeElement as HTMLElement;
    const images = Array.from(element.querySelectorAll<HTMLImageElement>('.home-hero-background-image'));

    expect(images.map(image => image.getAttribute('src'))).toEqual([
      '/assets/images/backgrounds/night.webp',
      HERO_BACKGROUND_IMAGE,
    ]);
  });

  it('prioritizes every rotating hero background that can become the LCP image', async () => {
    const fixture = await createComponent([createPost(1)], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      slides: [
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'slide-one',
          imageUrl: '/assets/images/backgrounds/day.webp',
        },
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'slide-two',
          imageUrl: '/assets/images/backgrounds/night.webp',
          sortOrder: 20,
        },
      ],
    });
    const element = fixture.nativeElement as HTMLElement;
    const images = Array.from(element.querySelectorAll<HTMLImageElement>('.home-hero-background-image'));

    expect(images.length).toBe(2);
    expect(images.every(image => image.getAttribute('fetchpriority') === 'high')).toBeTrue();
  });

  it('uses the selected CMS featured post when it is available', async () => {
    const fixture = await createComponent([
      createPost(1),
      createPost(2),
    ], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      featuredPostMode: 'selected',
      featuredPostId: 'post-2',
    });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Post 2 title');
    expect(element.textContent).not.toContain('Post 1 title');
  });

  it('uses the thumbnail before the cover image for post panels', async () => {
    const fixture = await createComponent([
      createPost(1, {
        coverImage: '/assets/images/backgrounds/day.webp',
        thumbnailImage: '/assets/images/backgrounds/night.webp',
      }),
    ]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLImageElement>('.home-hero-panel-image')?.getAttribute('src'))
      .toBe('/assets/images/backgrounds/night.webp');
  });

  it('uses a Firebase cover image instead of a stale local thumbnail for post panels', async () => {
    const firebaseCoverImage =
      'https://firebasestorage.googleapis.com/v0/b/colinmichaels.firebasestorage.app/o/cms%2Fblog-media%2Fcover.webp?alt=media&token=abc';
    const fixture = await createComponent([
      createPost(1, {
        coverImage: firebaseCoverImage,
        thumbnailImage: '/assets/images/blog/legacy-thumbnail.webp',
      }),
    ]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLImageElement>('.home-hero-panel-image')?.getAttribute('src'))
      .toBe(firebaseCoverImage);
  });

  it('links each panel to the blog detail route', async () => {
    const fixture = await createComponent([createPost(1, {slug: 'article-hero-post'})]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLAnchorElement>('.home-hero-panel')?.getAttribute('href'))
      .toBe('/blog/article-hero-post');
  });

  it('shows a fallback state when no posts exist', async () => {
    const fixture = await createComponent([]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.home-hero-panel').length).toBe(0);
    expect(element.querySelector('.home-hero-post-controls')).toBeNull();
    expect(element.textContent).toContain('No published posts yet.');
    expect(element.querySelector<HTMLImageElement>('.home-hero-background-image')?.getAttribute('src'))
      .toBe(HERO_BACKGROUND_IMAGE);
  });

  it('displays published dates and calculated reading minutes', async () => {
    const fixture = await createComponent([
      createPost(1, {
        publishedAt: '2026-06-26T12:00:00.000Z',
        blocks: [
          {
            id: 'long-body',
            type: 'paragraph',
            data: {
              text: Array.from({length: 230}, (_, index) => `word${index}`).join(' '),
            },
          },
        ],
      }),
    ]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Jun 26, 2026');
    expect(element.textContent).toContain('2 min read');
  });

  it('shows the matched topic label and color variables on each panel', async () => {
    const fixture = await createComponent([createPost(1)]);
    const element = fixture.nativeElement as HTMLElement;
    const panel = element.querySelector<HTMLElement>('.home-hero-panel');

    expect(element.querySelector('.home-hero-category')?.textContent?.trim()).toBe('AI');
    expect(panel?.style.getPropertyValue('--home-hero-topic-accent').trim()).toBe('#22d3ee');
    expect(panel?.style.getPropertyValue('--home-hero-topic-accent-strong').trim()).toBe('#67e8f9');
    expect(panel?.style.getPropertyValue('--home-hero-topic-rgb').trim()).toBe('34 211 238');
  });

  it('keeps full title text available and limits excerpt text for consistent panel content', async () => {
    const longExcerpt = Array.from(
      {length: 42},
      (_, index) => `This is excerpt sentence ${index + 1} for the hero panel layout.`
    ).join(' ');
    const fixture = await createComponent([
      createPost(1, {
        title: 'This is an intentionally long article title that should be shortened for the hero panel layout',
        excerpt: longExcerpt,
      }),
    ]);
    const element = fixture.nativeElement as HTMLElement;
    const renderedExcerpt = element.querySelector('.home-hero-post-excerpt')?.textContent?.trim() ?? '';

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim())
      .toBe('This is an intentionally long article title that should be shortened for the hero panel layout');
    expect(renderedExcerpt.endsWith('...')).toBeTrue();
    expect(renderedExcerpt.length).toBeLessThan(longExcerpt.length);
  });
});
