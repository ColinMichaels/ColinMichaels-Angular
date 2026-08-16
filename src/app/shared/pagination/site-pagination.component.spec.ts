import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {SitePaginationComponent} from './site-pagination.component';

describe('SitePaginationComponent', () => {
  let fixture: ComponentFixture<SitePaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SitePaginationComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SitePaginationComponent);
    fixture.componentRef.setInput('totalItems', 200);
    fixture.componentRef.setInput('currentPage', 10);
    fixture.componentRef.setInput('routeCommands', ['/blog']);
    fixture.componentRef.setInput('fragment', 'posts');
    fixture.componentRef.setInput('itemLabel', 'articles');
    fixture.componentRef.setInput('itemLabelSingular', 'article');
    fixture.detectChanges();
  });

  it('renders a compact, accessible page window with URL-backed controls', () => {
    const element = fixture.nativeElement as HTMLElement;
    const pageLinks = [...element.querySelectorAll<HTMLAnchorElement>('.site-pagination__page')];
    const pageLabels = pageLinks.map(link => link.textContent?.trim());
    const currentPage = element.querySelector<HTMLAnchorElement>('[aria-current="page"]');

    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Pagination');
    expect(pageLabels).toEqual(['1', '9', '10', '11', '20']);
    expect(element.querySelectorAll('.site-pagination__ellipsis').length).toBe(2);
    expect(currentPage?.textContent?.trim()).toBe('10');
    expect(currentPage?.getAttribute('href')).toBe('/blog?page=10#posts');
    expect(element.querySelector('.site-pagination__summary')?.textContent).toContain('Showing 91–100 of 200 articles');
  });

  it('removes the page query parameter from first-page links', () => {
    fixture.componentRef.setInput('currentPage', 2);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const firstPage = [...element.querySelectorAll<HTMLAnchorElement>('.site-pagination__page')]
      .find(link => link.textContent?.trim() === '1');

    expect(firstPage?.getAttribute('href')).toBe('/blog#posts');
  });

  it('hides page controls when all items fit on one page', () => {
    fixture.componentRef.setInput('totalItems', 1);
    fixture.componentRef.setInput('currentPage', 1);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('nav')).toBeNull();
    expect(element.querySelector('.site-pagination__summary')?.textContent).toContain('Showing 1–1 of 1 article');
  });

  it('renders URL-backed view options that reset pagination and preserve other query parameters', () => {
    fixture.componentRef.setInput('queryParams', {topic: 'angular'});
    fixture.componentRef.setInput('viewOptions', [
      {value: 'list', label: 'List', icon: 'list'},
      {value: 'grid', label: 'Grid', icon: 'grid'},
      {value: 'image-title', label: 'Image + title', icon: 'image-title'},
    ]);
    fixture.componentRef.setInput('activeView', 'grid');
    fixture.componentRef.setInput('defaultView', 'image-title');
    fixture.componentRef.setInput('viewAriaLabel', 'Blog post view options');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const viewNavigation = element.querySelector<HTMLElement>('.site-pagination__views');
    const viewLinks = [...element.querySelectorAll<HTMLAnchorElement>('.site-pagination__view')];
    const linkByLabel = (label: string) => viewLinks.find(link => link.textContent?.trim() === label);

    expect(viewNavigation?.getAttribute('aria-label')).toBe('Blog post view options');
    expect(viewLinks.map(link => link.textContent?.trim())).toEqual(['List', 'Grid', 'Image + title']);
    expect(linkByLabel('Grid')?.getAttribute('aria-current')).toBe('true');
    expect(linkByLabel('List')?.getAttribute('href')).toBe('/blog?topic=angular&view=list#posts');
    expect(linkByLabel('Image + title')?.getAttribute('href')).toBe('/blog?topic=angular#posts');
  });

  it('can render view options independently from the summary and page navigation', () => {
    fixture.componentRef.setInput('viewOptions', [
      {value: 'list', label: 'List', icon: 'list'},
      {value: 'grid', label: 'Grid', icon: 'grid'},
    ]);
    fixture.componentRef.setInput('activeView', 'list');
    fixture.componentRef.setInput('showSummary', false);
    fixture.componentRef.setInput('showPageNavigation', false);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.site-pagination__views')).not.toBeNull();
    expect(element.querySelector('.site-pagination__summary')).toBeNull();
    expect(element.querySelector('.site-pagination')).toBeNull();
  });

  it('supports icon-only view controls with hover and keyboard tooltips', () => {
    fixture.componentRef.setInput('viewOptions', [
      {value: 'list', label: 'List', icon: 'list'},
      {value: 'grid', label: 'Grid', icon: 'grid'},
    ]);
    fixture.componentRef.setInput('iconOnlyViewOptions', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const viewLinks = [...element.querySelectorAll<HTMLAnchorElement>('.site-pagination__view')];

    expect(element.querySelector('.site-pagination__views')?.classList).toContain('site-pagination__views--icon-only');
    expect(viewLinks.every(link => link.classList.contains('site-pagination__view--icon-only'))).toBeTrue();
    expect(viewLinks.map(link => link.getAttribute('data-tooltip'))).toEqual(['List view', 'Grid view']);
    expect(viewLinks.map(link => link.getAttribute('aria-label'))).toEqual([
      'Show articles in list view',
      'Show articles in grid view',
    ]);
    expect(viewLinks.every(link => link.querySelector('.site-pagination__view-label--sr-only'))).toBeTrue();
  });
});
