import {ComponentFixture, DeferBlockState, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';

import {SiteSearchOverlayService} from '../../features/search/services/site-search-overlay.service';
import {SiteSearchService} from '../../features/search/services/site-search.service';
import {AuthService} from '../../services/auth.service';
import {SiteHeaderComponent} from './site-header.component';

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;
  let nativeElement: HTMLElement;
  let openSearch: jasmine.Spy;

  beforeEach(async () => {
    const authService = {
      user$: of(null),
      getRoleAuthorization: jasmine.createSpy('getRoleAuthorization').and.returnValue(of({
        uid: null,
        email: null,
        isAuthenticated: false,
        isAdmin: false,
        isAuthorized: false,
        claims: {},
        requiredRoles: [],
      })),
    };
    const searchOpen = signal(false);
    openSearch = jasmine.createSpy('openSearch').and.callFake(() => searchOpen.set(true));
    const searchOverlayService = {
      isOpen: searchOpen.asReadonly(),
      open: openSearch,
      close: jasmine.createSpy('closeSearch').and.callFake(() => searchOpen.set(false)),
    };
    const siteSearchService = {
      getSearchItems$: jasmine.createSpy('getSearchItems$').and.returnValue(of([])),
      loading$: of(false),
      error$: of(null),
    };

    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent, RouterTestingModule],
      providers: [
        {provide: AuthService, useValue: authService},
        {provide: SiteSearchOverlayService, useValue: searchOverlayService},
        {provide: SiteSearchService, useValue: siteSearchService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteHeaderComponent);
    nativeElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('renders the blog-first search and icon utility layout without Labs navigation', () => {
    const searchInput = nativeElement.querySelector<HTMLInputElement>('input[placeholder="Search"]');
    const postsLink = nativeElement.querySelector<HTMLAnchorElement>('a[aria-label="Browse all posts"]');
    const logoLink = nativeElement.querySelector<HTMLAnchorElement>('a[aria-label="Go to homepage"]');
    const menuButton = nativeElement.querySelector<HTMLButtonElement>('button[aria-label="Open site menu"]');

    expect(searchInput).not.toBeNull();
    expect(searchInput?.readOnly).toBeFalse();
    expect(postsLink?.getAttribute('href')).toBe('/blog');
    expect(logoLink?.getAttribute('href')).toBe('/');
    expect(menuButton).not.toBeNull();
    expect(nativeElement.querySelector('nav[aria-label="Primary navigation"]')).toBeNull();
    expect(nativeElement.querySelector('button[aria-label="Toggle navigation menu"]')).toBeNull();
    expect(nativeElement.textContent).not.toContain('Labs');
  });

  it('opens the live-results search overlay from the header field', () => {
    const searchInput = nativeElement.querySelector<HTMLInputElement>('input[placeholder="Search"]');

    expect(searchInput).not.toBeNull();
    searchInput?.click();

    expect(openSearch).toHaveBeenCalledTimes(1);
  });

  it('uses the header field as the only search input in the open results panel', async () => {
    const searchInput = nativeElement.querySelector<HTMLInputElement>('input[placeholder="Search"]');

    searchInput?.focus();
    if (searchInput) {
      searchInput.value = 'voice AI';
      searchInput.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    const deferBlocks = await fixture.getDeferBlocks();
    await Promise.all(deferBlocks.map(deferBlock => deferBlock.render(DeferBlockState.Complete)));
    fixture.detectChanges();

    expect(nativeElement.querySelector('#site-search-results-panel')).not.toBeNull();
    expect(nativeElement.querySelectorAll('input[type="search"]')).toHaveSize(1);
    expect(searchInput?.value).toBe('voice AI');
  });

  it('keeps the responsive site menu focused on navigation, install, and account entry points', async () => {
    const menuButton = nativeElement.querySelector<HTMLButtonElement>('button[aria-label="Open site menu"]');

    menuButton?.click();
    fixture.detectChanges();
    const deferBlocks = await fixture.getDeferBlocks();
    await Promise.all(deferBlocks.map(deferBlock => deferBlock.render(DeferBlockState.Complete)));
    fixture.detectChanges();

    const utilityMenu = nativeElement.querySelector<HTMLElement>('#site-utility-menu');
    const menuText = utilityMenu?.textContent ?? '';

    expect(menuText).toContain('All Posts');
    expect(menuText).toContain('Open OS');
    expect(menuText).toContain('Install app');
    expect(menuText).toContain('Sign In');
    expect(menuText).not.toContain('Switch to light mode');
    expect(menuText).not.toContain('Switch to dark mode');
    expect(menuText).not.toContain('App controls');
    expect(menuText).not.toContain('Your reading');
    expect(menuText).not.toContain('Saved offline');
  });
});
