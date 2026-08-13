import {Component} from '@angular/core';
import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';

import {
  SiteSearchHighlightDirective,
  createSearchHighlightTerms,
  findSearchTextMatches,
} from './site-search-highlight.directive';

@Component({
  imports: [SiteSearchHighlightDirective],
  template: `
    <section
      [appSearchHighlight]="query"
      [searchHighlightScrollToFirst]="scrollToFirst"
      searchHighlightScrollSelector="[data-reading-content]"
      searchHighlightContext="/blog/search-highlights"
    >
      <p>Firebase platform patterns make Firebase projects easier to maintain.</p>
      <span data-search-highlight-ignore>Firebase platform ignored text.</span>
      <div class="h-[200vh]" aria-hidden="true"></div>
      <div data-reading-content>
        <p>The lower match appears inside the article.</p>
      </div>
    </section>
  `,
})
class SearchHighlightHostComponent {
  query = 'Firebase platform';
  scrollToFirst = false;
}

describe('SiteSearchHighlightDirective', () => {
  let fixture: ComponentFixture<SearchHighlightHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchHighlightHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchHighlightHostComponent);
  });

  afterEach(() => fixture.destroy());

  it('builds longest-first terms and returns non-overlapping case-insensitive matches', () => {
    const terms = createSearchHighlightTerms('  Firebase   platform  ');

    expect(terms).toEqual(['firebase platform', 'firebase', 'platform']);
    expect(findSearchTextMatches('Firebase platform and FIREBASE', terms)).toEqual([
      {start: 0, end: 17},
      {start: 22, end: 30},
    ]);
  });

  it('highlights visible matching text without changing the rendered content', fakeAsync(() => {
    fixture.detectChanges();
    tick(140);

    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('section');
    expect(host?.getAttribute('data-search-highlight-count')).toBe('2');
    expect(host?.textContent).toContain('Firebase platform patterns make Firebase projects easier to maintain.');
    expect(host?.querySelector('mark')).toBeNull();
  }));

  it('smoothly scrolls to the first article-body match', fakeAsync(() => {
    const scrollTo = spyOn(window, 'scrollTo');
    fixture.componentInstance.query = 'lower match';
    fixture.componentInstance.scrollToFirst = true;
    fixture.detectChanges();
    tick(140);

    expect(scrollTo).toHaveBeenCalled();
    expect(scrollTo.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({behavior: 'smooth'}));
  }));
});
