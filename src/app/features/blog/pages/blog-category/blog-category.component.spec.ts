import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';

import {DEFAULT_PAGINATION_PAGE_SIZE} from '../../../../shared/pagination/pagination.util';
import {BlogPostSummary} from '../../models/blog-post.model';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {BlogCategoryComponent} from './blog-category.component';

function createPost(index: number): BlogPostSummary {
  const date = `2026-07-${String(31 - index).padStart(2, '0')}T12:00:00.000Z`;

  return {
    id: `post-${index}`,
    slug: `post-${index}`,
    title: `Article ${index}`,
    excerpt: `Article ${index} excerpt.`,
    coverImage: `/assets/article-${index}.webp`,
    author: {name: 'Colin Michaels', slug: 'colin-michaels'},
    categories: ['Engineering'],
    subcategories: [],
    tags: [],
    publishedAt: date,
    updatedAt: date,
  };
}

describe('BlogCategoryComponent', () => {
  let fixture: ComponentFixture<BlogCategoryComponent>;
  const queryParamMap = new BehaviorSubject(convertToParamMap({}));
  const posts = Array.from({length: 23}, (_, index) => createPost(index + 1));

  beforeEach(async () => {
    queryParamMap.next(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [BlogCategoryComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({category: 'engineering'})),
            queryParamMap: queryParamMap.asObservable(),
            snapshot: {
              paramMap: convertToParamMap({category: 'engineering'}),
              queryParamMap: convertToParamMap({}),
            },
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
          provide: BlogOpenGraphService,
          useValue: jasmine.createSpyObj<BlogOpenGraphService>('BlogOpenGraphService', ['applyBlogCategory']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogCategoryComponent);
    fixture.detectChanges();
  });

  it('renders ten category posts on the first page', () => {
    const element = fixture.nativeElement as HTMLElement;
    const renderedPosts = element.querySelectorAll('[data-post-id]');

    expect(element.querySelector('.site-layout.site-layout-reading')).not.toBeNull();
    expect(renderedPosts.length).toBe(DEFAULT_PAGINATION_PAGE_SIZE);
    expect(renderedPosts[0].getAttribute('data-post-id')).toBe('post-1');
    expect(renderedPosts[DEFAULT_PAGINATION_PAGE_SIZE - 1].getAttribute('data-post-id')).toBe('post-10');
    expect(element.querySelector('.post-listing-region')?.getAttribute('data-layout')).toBe('grid');
    expect(element.querySelector('.site-pagination__view[aria-current="true"]')?.textContent?.trim()).toBe('Grid');
    expect(element.querySelector('.site-pagination__summary')?.textContent).toContain('Showing 1–10 of 23 posts');
    expect(element.querySelectorAll('.site-pagination__views').length).toBe(1);
    expect(element.querySelector('.blog-page-header .site-pagination__views')).not.toBeNull();
    expect(element.querySelector('.blog-category-page-title')).not.toBeNull();
    expect(element.querySelector('.category-filter__chip')?.textContent?.trim()).toBe('Engineering');
  });

  it('updates the category slice from the page query parameter', () => {
    queryParamMap.next(convertToParamMap({page: '3'}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const renderedPosts = element.querySelectorAll('[data-post-id]');

    expect(renderedPosts.length).toBe(3);
    expect(renderedPosts[0].getAttribute('data-post-id')).toBe('post-21');
    expect(renderedPosts[2].getAttribute('data-post-id')).toBe('post-23');
    expect(element.querySelector('.site-pagination [aria-current="page"]')?.textContent?.trim()).toBe('3');
    expect(element.querySelector('.site-pagination__summary')?.textContent).toContain('Showing 21–23 of 23 posts');
  });

  it('supports the image and title presentation from the shared view query parameter', () => {
    queryParamMap.next(convertToParamMap({view: 'image-title'}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.post-listing-region')?.getAttribute('data-layout')).toBe('list');
    expect(element.querySelector('.site-pagination__view[aria-current="true"]')?.textContent?.trim()).toBe('Image + title');
  });
});
