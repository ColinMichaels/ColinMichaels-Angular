import {ComponentFixture, DeferBlockState, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {signal} from '@angular/core';
import {BehaviorSubject, of} from 'rxjs';

import {SiteSearchOverlayService} from '../../features/search/services/site-search-overlay.service';
import {SiteSearchService} from '../../features/search/services/site-search.service';
import {AdminAuthorization, AuthService} from '../../services/auth.service';
import {CAT_CORNER_ADDICT_ROLE} from '../user-account/user-account.model';
import {SiteHeaderComponent} from './site-header.component';

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;
  let nativeElement: HTMLElement;
  let openSearch: jasmine.Spy;
  let closeSearch: jasmine.Spy;
  let getRoleAuthorization: jasmine.Spy;

  beforeEach(async () => {
    getRoleAuthorization = jasmine.createSpy('getRoleAuthorization').and.returnValue(of({
      uid: null,
      email: null,
      isAuthenticated: false,
      isAdmin: false,
      isAuthorized: false,
      claims: {},
      requiredRoles: [],
    }));
    const authService = {
      user$: of(null),
      getCurrentUserProfile: jasmine.createSpy('getCurrentUserProfile').and.returnValue(of(null)),
      getRoleAuthorization,
    };
    const searchOpen = signal(false);
    openSearch = jasmine.createSpy('openSearch').and.callFake(() => searchOpen.set(true));
    closeSearch = jasmine.createSpy('closeSearch').and.callFake(() => searchOpen.set(false));
    const searchOverlayService = {
      isOpen: searchOpen.asReadonly(),
      open: openSearch,
      close: closeSearch,
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
    expect(searchInput?.classList).toContain('site-header-search-input');
    expect(postsLink?.getAttribute('href')).toBe('/blog');
    expect(postsLink?.classList).toContain('site-icon-control');
    expect(logoLink?.getAttribute('href')).toBe('/');
    expect(logoLink?.querySelector('h1')).toBeNull();
    expect(menuButton).not.toBeNull();
    expect(menuButton?.classList).toContain('site-icon-control');
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
    expect(nativeElement.querySelector('form[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
    expect(nativeElement.querySelector('#site-search-results-panel [role="status"]')?.textContent).toContain('0 results');
    expect(nativeElement.querySelectorAll('input[type="search"]')).toHaveSize(1);
    expect(searchInput?.value).toBe('voice AI');
  });

  it('restores focus to the search field after dismissing the contained search surface', async () => {
    const searchInput = nativeElement.querySelector<HTMLInputElement>('input[placeholder="Search"]');

    expect(searchInput).not.toBeNull();
    searchInput?.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    const deferBlocks = await fixture.getDeferBlocks();
    await Promise.all(deferBlocks.map(deferBlock => deferBlock.render(DeferBlockState.Complete)));
    fixture.detectChanges();

    const closeButton = nativeElement.querySelector<HTMLButtonElement>(
      '#site-search-results-panel button[aria-label="Close search"]'
    );
    expect(closeButton).not.toBeNull();
    expect(closeButton?.classList).toContain('site-icon-control');
    closeButton?.focus();
    closeButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(closeSearch).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(searchInput);
    expect(nativeElement.querySelector('form[role="search"]')).not.toBeNull();
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
    expect(menuText).toContain('Write for Us');
    expect(menuText).toContain('Contact');
    expect(menuText).toContain('Open OS');
    expect(menuText).toContain('Install app');
    expect(menuText).toContain('Sign In');
    expect(menuText).not.toContain('Switch to light mode');
    expect(menuText).not.toContain('Switch to dark mode');
    expect(menuText).not.toContain('App controls');
    expect(menuText).not.toContain('Your reading');
    expect(menuText).not.toContain('Saved offline');
    expect(utilityMenu?.querySelectorAll('.site-menu-link').length).toBeGreaterThanOrEqual(4);
    expect(utilityMenu?.querySelector('app-pwa-install-control .site-menu-link')).not.toBeNull();
  });

  it('reveals Cat Corner reactively in the utility menu after membership is granted', async () => {
    const catCornerAuthorization = new BehaviorSubject<AdminAuthorization>({
      uid: 'reader-1',
      email: 'reader@example.com',
      isAuthenticated: true,
      isAdmin: false,
      isAuthorized: false,
      claims: {},
      requiredRoles: [CAT_CORNER_ADDICT_ROLE],
    });
    getRoleAuthorization.and.callFake((requiredRoles: readonly string[]) => {
      return requiredRoles.includes(CAT_CORNER_ADDICT_ROLE)
        ? catCornerAuthorization.asObservable()
        : of({
          uid: 'reader-1',
          email: 'reader@example.com',
          isAuthenticated: true,
          isAdmin: false,
          isAuthorized: false,
          claims: {},
          requiredRoles,
        });
    });

    nativeElement.querySelector<HTMLButtonElement>('button[aria-label="Open site menu"]')?.click();
    fixture.detectChanges();
    const deferBlocks = await fixture.getDeferBlocks();
    await Promise.all(deferBlocks.map(deferBlock => deferBlock.render(DeferBlockState.Complete)));
    fixture.detectChanges();

    expect(nativeElement.querySelector('#site-utility-menu')?.textContent).not.toContain('Cat Corner');

    catCornerAuthorization.next({
      uid: 'reader-1',
      email: 'reader@example.com',
      isAuthenticated: true,
      isAdmin: false,
      isAuthorized: true,
      claims: {roles: {[CAT_CORNER_ADDICT_ROLE]: true}},
      requiredRoles: [CAT_CORNER_ADDICT_ROLE],
    });
    fixture.detectChanges();

    const catCornerLink = [...nativeElement.querySelectorAll<HTMLAnchorElement>('#site-utility-menu a')]
      .find(link => link.textContent?.includes('Cat Corner'));
    expect(catCornerLink?.getAttribute('href')).toBe('/cat-corner');
  });
});
