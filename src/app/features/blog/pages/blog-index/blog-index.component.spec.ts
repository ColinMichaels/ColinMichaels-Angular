import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';

import {DEFAULT_PAGINATION_PAGE_SIZE} from '../../../../shared/pagination/pagination.util';
import {TopicHubRepositoryService} from '../../../topics/services/topic-hub-repository.service';
import {BlogPostSummary} from '../../models/blog-post.model';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
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

describe('BlogIndexComponent', () => {
  let fixture: ComponentFixture<BlogIndexComponent>;
  const queryParamMap = new BehaviorSubject(convertToParamMap({}));
  const posts = Array.from({length: 23}, (_, index) => createPost(index + 1));

  beforeEach(async () => {
    queryParamMap.next(convertToParamMap({}));

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
            getPublishedTopicHubs$: () => of([]),
            getPublishedTopicHubs: () => [],
          },
        },
        {
          provide: BlogOpenGraphService,
          useValue: jasmine.createSpyObj<BlogOpenGraphService>('BlogOpenGraphService', ['applyBlogIndex']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogIndexComponent);
    fixture.detectChanges();
  });

  it('renders ten posts on the first page', () => {
    const element = fixture.nativeElement as HTMLElement;
    const renderedPosts = element.querySelectorAll('[data-post-id]');

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
