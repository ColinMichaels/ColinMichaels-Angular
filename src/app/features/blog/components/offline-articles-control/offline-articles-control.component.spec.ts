import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {BlogPost} from '../../models/blog-post.model';
import {OfflineBlogPostRecord, OfflineBlogPostService} from '../../services/offline-blog-post.service';
import {OfflineArticlesControlComponent} from './offline-articles-control.component';

function createRecord(slug: string, title: string): OfflineBlogPostRecord {
  const post: BlogPost = {
    id: `post-${slug}`,
    slug,
    title,
    excerpt: 'Saved post.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {name: 'Colin Michaels'},
    categories: ['PWA'],
    tags: ['Offline'],
    status: 'published',
    seo: {title, description: 'Saved post.'},
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-10T12:00:00.000Z',
    publishedAt: '2026-07-10T12:00:00.000Z',
  };

  return {
    version: 1,
    savedAt: '2026-07-10T13:00:00.000Z',
    sourceUpdatedAt: post.updatedAt,
    post,
  };
}

describe('OfflineArticlesControlComponent', () => {
  let fixture: ComponentFixture<OfflineArticlesControlComponent>;
  let records: ReturnType<typeof signal<readonly OfflineBlogPostRecord[]>>;
  let remove: jasmine.Spy;
  let clearAll: jasmine.Spy;

  beforeEach(async () => {
    records = signal([
      createRecord('first-post', 'First saved post'),
      createRecord('second-post', 'Second saved post'),
    ]);
    remove = jasmine.createSpy('remove').and.callFake(async (slug: string) => {
      records.set(records().filter(record => record.post.slug !== slug));
      return true;
    });
    clearAll = jasmine.createSpy('clearAll').and.callFake(async () => {
      records.set([]);
      return true;
    });

    await TestBed.configureTestingModule({
      imports: [OfflineArticlesControlComponent, RouterTestingModule],
      providers: [{
        provide: OfflineBlogPostService,
        useValue: {records, remove, clearAll},
      }],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineArticlesControlComponent);
    fixture.detectChanges();
  });

  it('lists saved articles with offline routes and removal controls', () => {
    const element = fixture.nativeElement as HTMLElement;
    const firstLink = element.querySelector<HTMLAnchorElement>('a[href="/blog/first-post"]');

    expect(element.textContent).toContain('2 articles');
    expect(element.textContent).toContain('First saved post');
    expect(firstLink).not.toBeNull();
    expect(element.querySelector('[aria-label="Remove First saved post from offline reading"]')).not.toBeNull();
  });

  it('removes one saved article and can clear all remaining articles', async () => {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('[aria-label="Remove First saved post from offline reading"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(remove).toHaveBeenCalledOnceWith('first-post');
    expect(element.textContent).toContain('1 article');

    records.set([
      createRecord('second-post', 'Second saved post'),
      createRecord('third-post', 'Third saved post'),
    ]);
    fixture.detectChanges();
    const clearButton = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Clear all saved articles'));
    clearButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(clearAll).toHaveBeenCalledTimes(1);
    expect(element.textContent).not.toContain('Saved offline');
  });

  it('paginates the profile surface into pages of ten without growing the page', () => {
    const manyRecords = Array.from({length: 23}, (_, index) =>
      createRecord(`offline-post-${index}`, `Offline Post ${index}`));
    records.set(manyRecords);
    fixture.componentRef.setInput('surface', 'profile');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('a[href^="/blog/offline-post-"]').length).toBe(10);
    expect(element.textContent).toContain('Page 1 of 3');

    const nextButton = [...element.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Next')) as HTMLButtonElement | undefined;
    nextButton?.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('a[href^="/blog/offline-post-"]').length).toBe(10);
    expect(element.textContent).toContain('Page 2 of 3');

    nextButton?.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('a[href^="/blog/offline-post-"]').length).toBe(3);
    expect(element.textContent).toContain('Page 3 of 3');
  });

  it('does not paginate the menu surface', () => {
    const manyRecords = Array.from({length: 15}, (_, index) =>
      createRecord(`menu-offline-post-${index}`, `Menu Offline Post ${index}`));
    records.set(manyRecords);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('a[href^="/blog/menu-offline-post-"]').length).toBe(15);
    expect(element.textContent).not.toContain('Page 1 of');
  });

  it('shows an empty offline manager on the profile surface', () => {
    records.set([]);
    fixture.componentRef.setInput('surface', 'profile');
    fixture.detectChanges();

    const textContent = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(textContent).toContain('Saved offline');
    expect(textContent).toContain('No articles are downloaded for offline reading');
  });
});
