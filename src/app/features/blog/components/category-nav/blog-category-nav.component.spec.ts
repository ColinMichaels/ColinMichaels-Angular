import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {of} from 'rxjs';

import {BlogPostSummary} from '../../models/blog-post.model';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {BlogCategoryNavComponent} from './blog-category-nav.component';

function createPost(index: number, categories: readonly string[]): BlogPostSummary {
  return {
    id: `post-${index}`,
    slug: `post-${index}`,
    title: `Post ${index}`,
    excerpt: `Post ${index} excerpt.`,
    coverImage: `/assets/post-${index}.webp`,
    author: {name: 'Colin Michaels', slug: 'colin-michaels'},
    categories: [...categories],
    subcategories: [],
    tags: [],
    publishedAt: '2026-07-16T12:00:00.000Z',
    updatedAt: '2026-07-16T12:00:00.000Z',
  };
}

describe('BlogCategoryNavComponent', () => {
  let fixture: ComponentFixture<BlogCategoryNavComponent>;

  const posts = [
    createPost(1, ['Tutorials', 'AI & Automation']),
    createPost(2, ['Tutorials', 'Personal Growth']),
    createPost(3, ['Tutorials', 'Creative Technology']),
    createPost(4, ['AI & Automation']),
    createPost(5, ['Health & Recovery']),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogCategoryNavComponent],
      providers: [
        provideRouter([]),
        {
          provide: BlogRepositoryService,
          useValue: {
            getPublishedPosts$: () => of(posts),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogCategoryNavComponent);
    fixture.detectChanges();
  });

  it('renders only the category search when no filters are selected', () => {
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('#blog-category-search');

    expect(element.querySelector('.category-nav__featured')).toBeNull();
    expect(element.querySelector('.category-filter__chip')).toBeNull();
    expect(element.querySelector('.category-filter__clear')).toBeNull();
    expect(input?.placeholder).toBe('Filter categories');
  });

  it('renders active and selected categories as removable chips', () => {
    fixture.componentRef.setInput('activeSlug', 'health-and-recovery');
    fixture.componentRef.setInput('selectedSlugs', ['tutorials']);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const chips = [...element.querySelectorAll<HTMLButtonElement>('.category-filter__chip')];

    expect(chips.map(chip => chip.textContent?.trim())).toEqual(['Tutorials', 'Health & Recovery']);
    expect(chips[1].getAttribute('aria-label')).toBe('Remove Health & Recovery filter');
    expect(element.querySelector<HTMLInputElement>('#blog-category-search')?.placeholder).toBe('Add category');
    expect(element.querySelector('.category-filter__clear')?.textContent?.trim()).toBe('Clear filters');
  });

  it('adds a matched category to the URL-backed multi-filter', () => {
    fixture.componentRef.setInput('selectedSlugs', ['tutorials']);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('#blog-category-search');
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    input!.value = 'health';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.category-filter__result')?.click();

    expect(navigate).toHaveBeenCalledWith(['/', 'blog'], {
      queryParams: {
        categories: 'tutorials,health-and-recovery',
        page: null,
      },
      queryParamsHandling: 'merge',
      fragment: 'blog-post-list',
    });
  });

  it('supports adding the highlighted match from the keyboard', () => {
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('#blog-category-search');
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    input!.value = 'health';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input!.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));

    expect(navigate).toHaveBeenCalledWith(['/', 'blog'], {
      queryParams: {
        categories: 'health-and-recovery',
        page: null,
      },
      queryParamsHandling: 'merge',
      fragment: 'blog-post-list',
    });
  });

  it('clears every selected category filter', () => {
    fixture.componentRef.setInput('selectedSlugs', ['tutorials', 'ai-and-automation']);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    element.querySelector<HTMLButtonElement>('.category-filter__clear')?.click();

    expect(navigate).toHaveBeenCalledWith(['/', 'blog'], {
      queryParams: {
        categories: null,
        page: null,
      },
      queryParamsHandling: 'merge',
      fragment: 'blog-post-list',
    });
  });
});
