import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';

import {SeoService} from '../../../../shared/seo/seo.service';
import {BlogPost} from '../../../blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../blog/services/blog-repository.service';
import {DEFAULT_AUTHOR_PROFILE} from '../../authors.constants';
import {AuthorRepositoryService} from '../../services/author-repository.service';
import {DEFAULT_PAGINATION_PAGE_SIZE} from '../../../../shared/pagination/pagination.util';
import {AuthorPageComponent} from './author-page.component';

function createPost(index: number): BlogPost {
  const publishedAt = new Date(Date.UTC(2026, 6, 31 - index)).toISOString();

  return {
    id: `post-${index}`,
    slug: `post-${index}`,
    title: `Article ${index}`,
    excerpt: `Article ${index} excerpt.`,
    coverImage: `/assets/article-${index}.webp`,
    authorId: DEFAULT_AUTHOR_PROFILE.id,
    author: {
      name: DEFAULT_AUTHOR_PROFILE.name,
      slug: DEFAULT_AUTHOR_PROFILE.slug,
    },
    categories: ['Engineering'],
    tags: [],
    status: 'published',
    seo: {
      title: `Article ${index}`,
      description: `Article ${index} excerpt.`,
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: publishedAt,
    updatedAt: publishedAt,
    publishedAt,
  };
}

describe('AuthorPageComponent', () => {
  let fixture: ComponentFixture<AuthorPageComponent>;
  const queryParamMap = new BehaviorSubject(convertToParamMap({}));
  const posts = Array.from({length: 23}, (_, index) => createPost(index + 1));

  beforeEach(async () => {
    queryParamMap.next(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [AuthorPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({slug: DEFAULT_AUTHOR_PROFILE.slug})),
            queryParamMap: queryParamMap.asObservable(),
            snapshot: {
              paramMap: convertToParamMap({slug: DEFAULT_AUTHOR_PROFILE.slug}),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        {
          provide: AuthorRepositoryService,
          useValue: {
            getPublishedAuthors$: () => of([DEFAULT_AUTHOR_PROFILE]),
          },
        },
        {
          provide: BlogRepositoryService,
          useValue: {
            getPublishedFullPosts$: () => of(posts),
          },
        },
        {
          provide: SeoService,
          useValue: jasmine.createSpyObj<SeoService>('SeoService', ['apply']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorPageComponent);
    fixture.detectChanges();
  });

  it('renders only the first page of an author\'s posts', () => {
    const element = fixture.nativeElement as HTMLElement;
    const renderedPosts = element.querySelectorAll('[data-post-id]');

    expect(element.querySelector('.site-layout.site-layout-wide')).not.toBeNull();
    expect(renderedPosts.length).toBe(DEFAULT_PAGINATION_PAGE_SIZE);
    expect(renderedPosts[0].getAttribute('data-post-id')).toBe('post-1');
    expect(renderedPosts[DEFAULT_PAGINATION_PAGE_SIZE - 1].getAttribute('data-post-id')).toBe('post-10');
    expect(element.querySelector('.post-listing-region')?.getAttribute('data-layout')).toBe('compact');
    expect(element.querySelector('.site-pagination__view[aria-current="true"]')?.textContent?.trim()).toBe('List');
    expect(element.querySelector('.site-pagination__summary')?.textContent).toContain('Showing 1–10 of 23 articles');
    expect(element.querySelector('.site-pagination')).not.toBeNull();
    expect(element.querySelectorAll('.site-pagination__views').length).toBe(1);
    expect(element.querySelector('.author-section-heading + app-site-pagination .site-pagination__views')).not.toBeNull();
  });

  it('updates the rendered posts and current-page state from the page query parameter', () => {
    queryParamMap.next(convertToParamMap({page: '2'}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const renderedPosts = element.querySelectorAll('[data-post-id]');
    const currentPage = element.querySelector<HTMLElement>('.site-pagination [aria-current="page"]');

    expect(renderedPosts.length).toBe(DEFAULT_PAGINATION_PAGE_SIZE);
    expect(renderedPosts[0].getAttribute('data-post-id')).toBe('post-11');
    expect(renderedPosts[DEFAULT_PAGINATION_PAGE_SIZE - 1].getAttribute('data-post-id')).toBe('post-20');
    expect(currentPage?.textContent?.trim()).toBe('2');
    expect(element.querySelector('.site-pagination__summary')?.textContent).toContain('Showing 11–20 of 23 articles');
  });

  it('clamps an out-of-range page to the last available page', () => {
    queryParamMap.next(convertToParamMap({page: '999'}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const renderedPosts = element.querySelectorAll('[data-post-id]');

    expect(renderedPosts.length).toBe(3);
    expect(renderedPosts[0].getAttribute('data-post-id')).toBe('post-21');
    expect(renderedPosts[2].getAttribute('data-post-id')).toBe('post-23');
    expect(element.querySelector('.site-pagination [aria-current="page"]')?.textContent?.trim()).toBe('3');
    expect(element.querySelector('.site-pagination__summary')?.textContent).toContain('Showing 21–23 of 23 articles');
  });

  it('supports the grid presentation on author archives', () => {
    queryParamMap.next(convertToParamMap({view: 'grid'}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.post-listing-region')?.getAttribute('data-layout')).toBe('grid');
    expect(element.querySelector('.site-pagination__view[aria-current="true"]')?.textContent?.trim()).toBe('Grid');
  });
});
