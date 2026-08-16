import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';

import {DEFAULT_PAGINATION_PAGE_SIZE} from '../../../../shared/pagination/pagination.util';
import {TopicHubRepositoryService} from '../../../topics/services/topic-hub-repository.service';
import {BlogPostSummary} from '../../models/blog-post.model';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogArticleLibraryService} from '../../services/blog-article-library.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {BlogIndexComponent} from './blog-index.component';

function createPost(index: number): BlogPostSummary {
  return {
    id: `post-${index}`,
    slug: `post-${index}`,
    title: `Article ${index}`,
    excerpt: `Article ${index} excerpt.`,
    coverImage: `/assets/article-${index}.webp`,
    author: {name: 'Colin Michaels', slug: 'colin-michaels'},
    categories: index <= 5 ? ['Engineering', 'Tutorials'] : ['Engineering'],
    subcategories: [],
    tags: [],
    publishedAt: `2026-07-${String(31 - index).padStart(2, '0')}T12:00:00.000Z`,
    updatedAt: `2026-07-${String(31 - index).padStart(2, '0')}T12:00:00.000Z`,
  };
}

function createTopicHub(overrides: Partial<{
  slug: string;
  title: string;
  terms: readonly string[];
}> = {}): Record<string, unknown> {
  return {
    id: `topic-${overrides.slug}`,
    slug: overrides.slug ?? 'topic',
    eyebrow: 'Mock topic',
    title: overrides.title ?? 'Mock topic',
    description: 'Mock topic description',
    summary: 'Mock topic summary',
    status: 'published',
    displayOrder: 10,
    terms: overrides.terms ?? ['engineering'],
    theme: {
      shortLabel: 'Mock',
      accent: '#22d3ee',
      accentStrong: '#67e8f9',
      accentRgb: '34 211 238',
      mapPlacement: {xPercent: 50, yPercent: 50, depth: 1, scale: 1, floatDelayMs: 0},
      icon: 'spark',
      heroMotifs: [],
    },
    asset: {title: 'Mock', intro: '', items: []},
    featuredProject: {label: 'Featured', title: '', description: '', href: '', ctaLabel: 'Open'},
    learningPath: [],
    checklist: [],
    resources: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('BlogIndexComponent', () => {
  let fixture: ComponentFixture<BlogIndexComponent>;
  const queryParamMap = new BehaviorSubject(convertToParamMap({}));
  const topicHubSubject = new BehaviorSubject<readonly Record<string, unknown>[]>([]);
  const posts = Array.from({length: 23}, (_, index) => createPost(index + 1));

  beforeEach(async () => {
    queryParamMap.next(convertToParamMap({}));
    topicHubSubject.next([]);

    await TestBed.configureTestingModule({
      imports: [BlogIndexComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap.asObservable(),
            snapshot: {queryParamMap: convertToParamMap({})},
          },
        },
        {
          provide: BlogRepositoryService,
          useValue: {
            getPublishedPosts$: () => of(posts),
            loading$: of(false),
            error$: of(null),
          },
        },
        {
          provide: TopicHubRepositoryService,
          useValue: {
            getPublishedTopicHubs$: () => topicHubSubject.asObservable(),
            getPublishedTopicHubs: () => topicHubSubject.getValue(),
          },
        },
        {
          provide: BlogOpenGraphService,
          useValue: jasmine.createSpyObj<BlogOpenGraphService>('BlogOpenGraphService', ['applyBlogIndex']),
        },
        {
          provide: BlogArticleLibraryService,
          useValue: {inProgress: signal([]).asReadonly()},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogIndexComponent);
    fixture.detectChanges();
  });

  it('renders ten posts on the first page', () => {
    const element = fixture.nativeElement as HTMLElement;
    const renderedPosts = element.querySelectorAll('[data-post-id]');

    expect(element.querySelector('.site-layout.site-layout-wide')).not.toBeNull();
    expect(element.textContent).not.toContain('Notes on frontend engineering');
    expect(renderedPosts.length).toBe(DEFAULT_PAGINATION_PAGE_SIZE);
    expect(renderedPosts[0].getAttribute('data-post-id')).toBe('post-1');
    expect(renderedPosts[DEFAULT_PAGINATION_PAGE_SIZE - 1].getAttribute('data-post-id')).toBe('post-10');
    expect(element.querySelector('.post-listing-region')?.getAttribute('data-layout')).toBe('list');
    expect(element.querySelector('.site-pagination__view[aria-current="true"]')?.textContent?.trim()).toBe('Image + title');
    expect(element.querySelector('.site-pagination__summary')?.textContent).toContain('Showing 1–10 of 23 posts');
    expect(element.querySelectorAll('.site-pagination__views').length).toBe(1);
    expect(element.querySelector('.blog-page-header .site-pagination__views')).not.toBeNull();
  });

  it('updates the rendered blog slice from the page query parameter', () => {
    queryParamMap.next(convertToParamMap({page: '2'}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const renderedPosts = element.querySelectorAll('[data-post-id]');

    expect(renderedPosts.length).toBe(DEFAULT_PAGINATION_PAGE_SIZE);
    expect(renderedPosts[0].getAttribute('data-post-id')).toBe('post-11');
    expect(renderedPosts[DEFAULT_PAGINATION_PAGE_SIZE - 1].getAttribute('data-post-id')).toBe('post-20');
    expect(element.querySelector('.site-pagination [aria-current="page"]')?.textContent?.trim()).toBe('2');
    expect(element.querySelector('.site-pagination__summary')?.textContent).toContain('Showing 11–20 of 23 posts');
  });

  it('switches the post presentation from the view query parameter', () => {
    queryParamMap.next(convertToParamMap({view: 'grid'}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.post-listing-region')?.getAttribute('data-layout')).toBe('grid');
    expect(element.querySelector('.site-pagination__view[aria-current="true"]')?.textContent?.trim()).toBe('Grid');
  });

  it('renders quick topic filters and includes a high-signal active topic', () => {
    topicHubSubject.next([
      createTopicHub({slug: 'engineering', title: 'Engineering', terms: ['engineering']}),
      createTopicHub({slug: 'tutorials', title: 'Tutorials', terms: ['tutorials']}),
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const topicChips = [...element.querySelectorAll<HTMLElement>('.blog-topic-chip')];
    const topicLabels = topicChips.map(chip => chip.textContent?.replace(/\s+/g, ' ').trim() ?? '');

    expect(topicLabels).toEqual([
      'All 23',
      'Engineering 23',
      'Tutorials 5',
    ]);

    queryParamMap.next(convertToParamMap({topic: 'engineering'}));
    fixture.detectChanges();

    const activeChip = element.querySelector('.blog-topic-chip--active')?.textContent?.replace(/\s+/g, ' ').trim();
    expect(activeChip).toBe('Engineering 23');
  });

  it('filters posts that match every selected category chip', () => {
    queryParamMap.next(convertToParamMap({categories: 'engineering,tutorials'}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const renderedPosts = element.querySelectorAll('[data-post-id]');
    const selectedChips = [...element.querySelectorAll<HTMLElement>('.category-filter__chip')];

    expect(renderedPosts.length).toBe(5);
    expect(renderedPosts[0].getAttribute('data-post-id')).toBe('post-1');
    expect(renderedPosts[4].getAttribute('data-post-id')).toBe('post-5');
    expect(selectedChips.map(chip => chip.textContent?.trim())).toEqual(['Engineering', 'Tutorials']);
  });
});
