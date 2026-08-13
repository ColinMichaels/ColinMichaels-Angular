import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {BlogArticleLibraryRecord, BlogArticleLibraryService} from '../services/blog-article-library.service';
import {ContinueReadingShelfComponent} from './continue-reading-shelf.component';

function createRecord(overrides: Partial<BlogArticleLibraryRecord> = {}): BlogArticleLibraryRecord {
  return {
    version: 2,
    post: overrides.post ?? {
      id: 'continue-post',
      slug: 'continue-post',
      title: 'Continue This Article',
      excerpt: 'A partially read article.',
      coverImage: '/assets/continue.webp',
      publishedAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-08-01T12:00:00.000Z',
    },
    favorite: overrides.favorite ?? false,
    readLater: overrides.readLater ?? false,
    progressPercent: overrides.progressPercent ?? 57,
    lastReadAt: overrides.lastReadAt ?? '2026-08-03T12:00:00.000Z',
    lastHeadingId: overrides.lastHeadingId ?? 'meaningful-section',
    lastHeadingText: overrides.lastHeadingText ?? 'Meaningful section',
    completedAt: overrides.completedAt ?? null,
    modifiedAt: overrides.modifiedAt ?? '2026-08-03T12:00:00.000Z',
  };
}

describe('ContinueReadingShelfComponent', () => {
  let fixture: ComponentFixture<ContinueReadingShelfComponent>;
  const inProgress = signal<readonly BlogArticleLibraryRecord[]>([createRecord()]);

  beforeEach(async () => {
    inProgress.set([createRecord()]);

    await TestBed.configureTestingModule({
      imports: [ContinueReadingShelfComponent],
      providers: [
        provideRouter([]),
        {
          provide: BlogArticleLibraryService,
          useValue: {inProgress: inProgress.asReadonly()},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContinueReadingShelfComponent);
    fixture.detectChanges();
  });

  it('links an unfinished article to its last saved section', () => {
    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>('.continue-reading-card');

    expect(element.textContent).toContain('Continue reading');
    expect(element.textContent).toContain('57% read');
    expect(element.textContent).toContain('Resume at Meaningful section');
    expect(link?.getAttribute('href')).toBe('/blog/continue-post#meaningful-section');
    expect(link?.getAttribute('aria-label')).toContain('57% read');
  });

  it('stays out of the page when there is nothing unfinished', () => {
    inProgress.set([]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="continue-reading-shelf"]')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).classList).toContain('is-empty');
  });

  it('offers the compact editorial resume treatment on the homepage', () => {
    fixture.componentRef.setInput('surface', 'homeEditorial');
    fixture.componentRef.setInput('maxRecords', 1);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.continue-reading-shelf--home-editorial')).not.toBeNull();
    expect(element.textContent).toContain('Pick up where you left off on this device.');
    expect(element.textContent).toContain('Resume article');
    expect(element.textContent).not.toContain('Your reading');
  });
});
