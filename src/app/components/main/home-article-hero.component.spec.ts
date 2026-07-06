import {ComponentFixture, TestBed} from '@angular/core/testing';
import {computed, signal} from '@angular/core';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

import {BlogPost} from '../../features/blog/models/blog-post.model';
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

describe('HomeArticleHeroComponent', () => {
  async function createComponent(posts: readonly BlogPost[]): Promise<ComponentFixture<HomeArticleHeroComponent>> {
    const topicHubs = getPublishedTopicHubs();

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        HomeArticleHeroComponent,
        RouterTestingModule,
      ],
      providers: [
        {provide: HomeBlogPostFeedService, useValue: configureBlogPostFeed(posts)},
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
    expect(element.textContent).toContain('Post 1 title');
    expect(element.textContent).not.toContain('Post 2 title');
  });

  it('uses the supplied full hero background image', async () => {
    const fixture = await createComponent([createPost(1)]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLImageElement>('.home-hero-background-image')?.getAttribute('src'))
      .toBe(HERO_BACKGROUND_IMAGE);
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
    const fixture = await createComponent([
      createPost(1, {
        title: 'This is an intentionally long article title that should be shortened for the hero panel layout',
        excerpt: 'This is an intentionally long article excerpt that should be shortened for the hero panel layout so every post slice keeps a consistent amount of visible copy.',
      }),
    ]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.home-hero-post-title')?.textContent?.trim())
      .toBe('This is an intentionally long article title that should be shortened for the hero panel layout');
    expect(element.querySelector('.home-hero-post-excerpt')?.textContent?.trim())
      .toBe('This is an intentionally long article excerpt that should be shortened for the hero panel layout so every post...');
  });
});
