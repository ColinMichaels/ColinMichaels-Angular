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

const LEGACY_HERO_IMAGE = '/assets/images/backgrounds/colinmichaels-hero-background.webp';

function createPost(index: number, overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: `post-${index}`,
    slug: `post-${index}`,
    title: `Post ${index} title`,
    excerpt: `Post ${index} excerpt for the article hero.`,
    coverImage: `/assets/images/backgrounds/day.webp?post=${index}`,
    thumbnailImage: `/assets/images/backgrounds/night.webp?post=${index}`,
    author: {
      name: 'Colin Michaels',
      slug: 'colin-michaels',
    },
    categories: ['Tech Tips'],
    subcategories: [],
    tags: ['AI'],
    status: 'published',
    seo: {
      title: `Post ${index} title`,
      description: `Post ${index} excerpt for the article hero.`,
    },
    contentFormat: 'editorjs',
    blocks: [{
      id: `post-${index}-paragraph`,
      type: 'paragraph',
      data: {text: 'Short post body.'},
    }],
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
  async function createComponent(
    posts: readonly BlogPost[],
    heroSettings: HomepageHeroSettings = DEFAULT_HOMEPAGE_HERO_SETTINGS,
    beforeCreate?: () => void,
  ): Promise<ComponentFixture<HomeArticleHeroComponent>> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [HomeArticleHeroComponent, RouterTestingModule],
      providers: [
        {provide: HomeBlogPostFeedService, useValue: configureBlogPostFeed(posts)},
        {provide: HomepageHeroRepositoryService, useValue: configureHomepageHeroRepository(heroSettings)},
        {provide: TopicHubRepositoryService, useValue: configureTopicHubRepository(getPublishedTopicHubs())},
      ],
    }).compileComponents();

    beforeCreate?.();
    const fixture = TestBed.createComponent(HomeArticleHeroComponent);
    fixture.detectChanges();

    return fixture;
  }

  it('makes the newest article the publication-first h1 and links its story and media', async () => {
    const fixture = await createComponent([createPost(1), createPost(2), createPost(3)]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.home-hero-post-title')?.tagName).toBe('H1');
    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 3 title');
    expect(element.querySelector<HTMLAnchorElement>('.home-hero-read-more')?.getAttribute('href')).toBe('/blog/post-3');
    expect(element.querySelector<HTMLAnchorElement>('.home-hero-panel')?.getAttribute('href')).toBe('/blog/post-3');
    expect(element.textContent).not.toContain('A Life of Curiosity');
    expect(element.querySelector('.home-hero-slideshow')).toBeNull();
  });

  it('preserves featured-post selection and one-story-at-a-time navigation', async () => {
    const fixture = await createComponent([
      createPost(1, {featured: true}),
      createPost(2),
      createPost(3, {featured: true}),
    ]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 3 title');
    expect(element.querySelector('.home-hero-post-control-previous')).not.toBeNull();
    expect(element.querySelector('.home-hero-post-position')?.textContent).toContain('1 / 3');

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 2 title');
    expect(element.querySelector('.home-hero-post-position')?.textContent).toContain('2 / 3');
    expect(element.querySelector<HTMLImageElement>('.home-hero-panel-image')?.getAttribute('src'))
      .toBe('/assets/images/backgrounds/night.webp?post=2');
  });

  it('cycles stories every 30 seconds and honors the pause control', async () => {
    let fixture: ComponentFixture<HomeArticleHeroComponent> | undefined;
    let clockInstalled = false;

    try {
      fixture = await createComponent(
        [createPost(1), createPost(2), createPost(3)],
        DEFAULT_HOMEPAGE_HERO_SETTINGS,
        () => {
          jasmine.clock().install();
          clockInstalled = true;
        }
      );
      const element = fixture.nativeElement as HTMLElement;
      const title = () => element.querySelector('.home-hero-post-title')?.textContent?.trim();
      const rotationControl = element.querySelector<HTMLButtonElement>('.home-hero-rotation-control');

      expect(title()).toBe('Post 3 title');
      expect(rotationControl?.getAttribute('aria-pressed')).toBe('false');

      jasmine.clock().tick(29_999);
      fixture.detectChanges();
      expect(title()).toBe('Post 3 title');

      jasmine.clock().tick(1);
      fixture.detectChanges();
      expect(title()).toBe('Post 2 title');

      rotationControl?.click();
      fixture.detectChanges();
      expect(rotationControl?.getAttribute('aria-pressed')).toBe('true');

      jasmine.clock().tick(30_000);
      fixture.detectChanges();
      expect(title()).toBe('Post 2 title');

      rotationControl?.click();
      fixture.detectChanges();
      jasmine.clock().tick(30_000);
      fixture.detectChanges();
      expect(title()).toBe('Post 1 title');

      jasmine.clock().tick(30_000);
      fixture.detectChanges();
      expect(title()).toBe('Post 3 title');
    } finally {
      fixture?.destroy();

      if (clockInstalled) {
        jasmine.clock().uninstall();
      }
    }
  });

  it('keeps both story arrows mounted and focused while wrapping at an endpoint', async () => {
    const fixture = await createComponent([createPost(1), createPost(2), createPost(3)]);
    const element = fixture.nativeElement as HTMLElement;
    const previousButton = element.querySelector<HTMLButtonElement>('.home-hero-post-control-previous');

    previousButton?.focus();
    previousButton?.click();
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 1 title');
    expect(element.querySelector('.home-hero-post-position')?.textContent).toContain('3 / 3');
    expect(element.querySelector('.home-hero-post-control-next')).not.toBeNull();
    expect(document.activeElement).toBe(previousButton);

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 3 title');
    expect(element.querySelector('.home-hero-post-position')?.textContent).toContain('1 / 3');
  });

  it('keeps the viewed post selected when recent posts reorder behind the same lead', async () => {
    const leadPost = createPost(3, {featured: true});
    const fixture = await createComponent([createPost(1), createPost(2), leadPost]);
    const element = fixture.nativeElement as HTMLElement;
    const postFeed = TestBed.inject(HomeBlogPostFeedService) as unknown as {
      publishedPosts: WritableSignal<readonly BlogPost[]>;
    };

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();
    postFeed.publishedPosts.set([createPost(1), createPost(2), leadPost, createPost(4)]);
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 2 title');
    expect(element.querySelector('.home-hero-post-position')?.textContent).toContain('3 / 4');
  });

  it('uses a dedicated post background behind the hero while keeping the post image in the panel', async () => {
    const fixture = await createComponent([
      createPost(1, {backgroundImage: '/assets/images/backgrounds/day.webp?editorial=1'}),
    ], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      useFeaturedPostBackground: false,
    });
    const element = fixture.nativeElement as HTMLElement;
    const backdrop = element.querySelector<HTMLImageElement>('.home-hero-backdrop-image');
    const panel = element.querySelector<HTMLImageElement>('.home-hero-panel-image');

    expect(backdrop?.getAttribute('src')).toBe('/assets/images/backgrounds/day.webp?editorial=1');
    expect(backdrop?.getAttribute('alt')).toBe('');
    expect(backdrop?.getAttribute('fetchpriority')).toBe('high');
    expect(backdrop?.hasAttribute('data-site-preload-image')).toBeTrue();
    expect(element.querySelector('.home-hero-backdrop')?.classList).not.toContain('home-hero-backdrop--blurred');
    expect(panel?.getAttribute('src')).toBe('/assets/images/backgrounds/night.webp?post=1');
    expect(panel?.getAttribute('alt')).toBe('Post 1 title cover image');
    expect(panel?.hasAttribute('data-site-preload-image')).toBeFalse();
  });

  it('reuses the post image as a blurred backdrop when no dedicated background is attached', async () => {
    const fixture = await createComponent([createPost(1)]);
    const element = fixture.nativeElement as HTMLElement;
    const backdrop = element.querySelector<HTMLImageElement>('.home-hero-backdrop-image');
    const panel = element.querySelector<HTMLImageElement>('.home-hero-panel-image');

    expect(backdrop?.getAttribute('src')).toBe('/assets/images/backgrounds/night.webp?post=1');
    expect(panel?.getAttribute('src')).toBe('/assets/images/backgrounds/night.webp?post=1');
    expect(element.querySelector('.home-hero-backdrop')?.classList).toContain('home-hero-backdrop--blurred');
  });

  it('falls back through post media and stable placeholder slides after image failures', async () => {
    const fixture = await createComponent([
      createPost(1, {backgroundImage: '/assets/images/backgrounds/day.webp?editorial=1'}),
    ], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      slides: [
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'fallback-a',
          imageUrl: '/assets/images/backgrounds/day.webp?fallback=a',
          focalPointX: 40,
          focalPointY: 60,
          sortOrder: 10,
        },
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'fallback-b',
          imageUrl: '/assets/images/backgrounds/colinmichaels-hero-background.webp?fallback=b',
          focalPointX: 70,
          focalPointY: 30,
          sortOrder: 20,
        },
      ],
    });
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLImageElement>('.home-hero-backdrop-image')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const coverBackdrop = element.querySelector<HTMLImageElement>('.home-hero-backdrop-image');
    const coverPanel = element.querySelector<HTMLImageElement>('.home-hero-panel-image');
    expect(coverBackdrop?.getAttribute('src')).toBe('/assets/images/backgrounds/night.webp?post=1');
    expect(coverPanel?.getAttribute('src')).toBe('/assets/images/backgrounds/night.webp?post=1');
    expect(element.querySelector('.home-hero-backdrop')?.classList).toContain('home-hero-backdrop--blurred');

    coverPanel?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const firstSlide = element.querySelector<HTMLImageElement>('.home-hero-panel-image');
    const firstSlideBackdrop = element.querySelector<HTMLImageElement>('.home-hero-backdrop-image');
    expect([
      '/assets/images/backgrounds/day.webp?fallback=a',
      '/assets/images/backgrounds/colinmichaels-hero-background.webp?fallback=b',
    ]).toContain(firstSlide?.getAttribute('src') ?? '');
    expect(firstSlideBackdrop?.getAttribute('src')).toBe(firstSlide?.getAttribute('src'));
    expect(firstSlide?.getAttribute('alt')).toBe('');
    expect(element.querySelector('.home-hero-backdrop')?.classList).not.toContain('home-hero-backdrop--blurred');

    const firstSlideUrl = firstSlide?.getAttribute('src') ?? '';
    firstSlide?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const secondSlide = element.querySelector<HTMLImageElement>('.home-hero-panel-image');
    expect([
      '/assets/images/backgrounds/day.webp?fallback=a',
      '/assets/images/backgrounds/colinmichaels-hero-background.webp?fallback=b',
    ]).toContain(secondSlide?.getAttribute('src') ?? '');
    expect(secondSlide?.getAttribute('src')).not.toBe(firstSlideUrl);

    secondSlide?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(element.querySelector('.home-hero-panel-image')).toBeNull();
    expect(element.querySelector('.home-hero-backdrop-image')).toBeNull();
  });

  it('uses a single stable legacy slide only when the post has no usable image', async () => {
    const fixture = await createComponent([
      createPost(1, {coverImage: '', thumbnailImage: undefined}),
    ], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      slides: [{
        ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
        imageUrl: LEGACY_HERO_IMAGE,
        focalPointX: 42,
        focalPointY: 58,
      }],
    });
    const element = fixture.nativeElement as HTMLElement;

    const image = element.querySelector<HTMLImageElement>('.home-hero-panel-image');
    const backdrop = element.querySelector<HTMLImageElement>('.home-hero-backdrop-image');
    expect(image?.getAttribute('src')).toBe(LEGACY_HERO_IMAGE);
    expect(backdrop?.getAttribute('src')).toBe(LEGACY_HERO_IMAGE);
    expect(image?.style.objectPosition).toBe('42% 58%');
    expect(element.querySelectorAll('.home-hero-panel-image')).toHaveSize(1);
    expect(element.querySelectorAll('.home-hero-backdrop-image')).toHaveSize(1);
  });

  it('assigns different stable fallback starts to adjacent post ids', async () => {
    const fixture = await createComponent([
      createPost(1, {coverImage: '', thumbnailImage: undefined}),
      createPost(2, {coverImage: '', thumbnailImage: undefined}),
    ], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      slides: [
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'fallback-a',
          imageUrl: '/assets/images/backgrounds/day.webp?fallback=a',
          sortOrder: 10,
        },
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'fallback-b',
          imageUrl: '/assets/images/backgrounds/colinmichaels-hero-background.webp?fallback=b',
          sortOrder: 20,
        },
      ],
    });
    const element = fixture.nativeElement as HTMLElement;
    const firstPostImage = element.querySelector<HTMLImageElement>('.home-hero-panel-image')?.getAttribute('src');

    fixture.detectChanges();
    expect(element.querySelector<HTMLImageElement>('.home-hero-panel-image')?.getAttribute('src')).toBe(firstPostImage);

    element.querySelector<HTMLButtonElement>('.home-hero-post-control-next')?.click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLImageElement>('.home-hero-panel-image')?.getAttribute('src')).not.toBe(firstPostImage);
  });

  it('uses the selected CMS featured post when available', async () => {
    const fixture = await createComponent([createPost(1), createPost(2)], {
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      featuredPostMode: 'selected',
      featuredPostId: 'post-2',
    });

    expect(fixture.nativeElement.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe('Post 2 title');
  });

  it('shows a fallback state without published posts', async () => {
    const fixture = await createComponent([]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('No published posts yet.');
    expect(element.querySelector('.home-hero-panel')).toBeNull();
    expect(element.querySelector('.home-hero-backdrop')).toBeNull();
    expect(element.querySelector<HTMLImageElement>('.home-hero-panel-image')?.getAttribute('src'))
      .not.toBe(LEGACY_HERO_IMAGE);
  });

  it('renders dates, reading time, and topic color without a redundant curator row', async () => {
    const fixture = await createComponent([createPost(1, {
      publishedAt: '2026-06-26T12:00:00.000Z',
      blocks: [{
        id: 'long-body',
        type: 'paragraph',
        data: {text: Array.from({length: 230}, (_, index) => `word${index}`).join(' ')},
      }],
    })]);
    const element = fixture.nativeElement as HTMLElement;
    const story = element.querySelector<HTMLElement>('.home-hero-story');

    expect(element.textContent).toContain('Jun 26, 2026');
    expect(element.textContent).toContain('2 min read');
    expect(element.textContent).not.toContain('Curated and written by');
    expect(story?.style.getPropertyValue('--home-hero-topic-accent').trim()).toBe('#22d3ee');
  });

  it('keeps the full article title and bounds long excerpt copy', async () => {
    const longExcerpt = Array.from({length: 42}, (_, index) => `Excerpt sentence ${index + 1}.`).join(' ');
    const title = 'This is an intentionally long article title that remains available in the editorial hero';
    const fixture = await createComponent([createPost(1, {title, excerpt: longExcerpt})]);
    const element = fixture.nativeElement as HTMLElement;
    const excerpt = element.querySelector('.home-hero-post-excerpt')?.textContent?.trim() ?? '';

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim()).toBe(title);
    expect(excerpt.endsWith('...')).toBeTrue();
    expect(excerpt.length).toBeLessThan(longExcerpt.length);
  });
});
