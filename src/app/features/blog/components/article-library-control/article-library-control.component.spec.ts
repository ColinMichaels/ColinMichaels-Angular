import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {provideRouter} from '@angular/router';

import {BlogArticleLibraryRecord, BlogArticleLibraryService} from '../../services/blog-article-library.service';
import {ArticleLibraryControlComponent} from './article-library-control.component';

function createRecord(overrides: Partial<BlogArticleLibraryRecord> = {}): BlogArticleLibraryRecord {
  return {
    version: 2,
    post: overrides.post ?? {
      id: 'library-post',
      slug: 'library-post',
      title: 'Library Post',
      excerpt: 'A saved library post.',
      coverImage: '/assets/library.webp',
      publishedAt: '2026-07-10T12:00:00.000Z',
      updatedAt: '2026-07-10T12:00:00.000Z',
    },
    favorite: overrides.favorite ?? true,
    readLater: overrides.readLater ?? true,
    progressPercent: overrides.progressPercent ?? 56,
    lastReadAt: overrides.lastReadAt ?? '2026-07-10T13:00:00.000Z',
    lastHeadingId: overrides.lastHeadingId ?? 'reader-section',
    lastHeadingText: overrides.lastHeadingText ?? 'Reader section',
    completedAt: overrides.completedAt ?? null,
    modifiedAt: overrides.modifiedAt ?? '2026-07-10T13:00:00.000Z',
  };
}

describe('ArticleLibraryControlComponent', () => {
  let fixture: ComponentFixture<ArticleLibraryControlComponent>;
  const records = signal<readonly BlogArticleLibraryRecord[]>([createRecord()]);
  const setFavorite = jasmine.createSpy('setFavorite').and.resolveTo(createRecord({favorite: false}));
  const setReadLater = jasmine.createSpy('setReadLater').and.resolveTo(createRecord({readLater: false}));

  beforeEach(async () => {
    setFavorite.calls.reset();
    setReadLater.calls.reset();
    records.set([createRecord()]);

    await TestBed.configureTestingModule({
      imports: [ArticleLibraryControlComponent],
      providers: [
        provideRouter([]),
        {
          provide: BlogArticleLibraryService,
          useValue: {
            records: records.asReadonly(),
            completed: () => records().filter(record => Boolean(record.completedAt)),
            inProgress: () => records().filter(record => record.progressPercent > 0 && !record.completedAt),
            setFavorite,
            setReadLater,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleLibraryControlComponent);
    fixture.detectChanges();
  });

  it('shows reading progress and the two independent list choices', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Your reading');
    expect(element.textContent).toContain('56% read');
    expect(element.querySelector('[aria-label="Library Post reading progress"]')?.getAttribute('aria-valuenow')).toBe('56');
    expect(element.querySelector('[aria-label="Remove Library Post from favorites"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('[aria-label="Remove Library Post from read later"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('updates favorites from the library manager', async () => {
    const button = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Remove Library Post from favorites"]');

    button?.click();
    await fixture.whenStable();

    expect(setFavorite).toHaveBeenCalledWith(jasmine.objectContaining({slug: 'library-post'}), false);
  });

  it('shows an empty-state manager on the profile surface', () => {
    records.set([]);
    fixture.componentRef.setInput('surface', 'profile');
    fixture.detectChanges();

    const textContent = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(textContent).toContain('Your reading');
    expect(textContent).toContain('Articles you favorite, save for later, or start reading');
  });
});
