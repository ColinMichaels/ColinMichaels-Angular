import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';

import {SiteSearchOverlayService} from '../../features/search/services/site-search-overlay.service';
import {AuthService} from '../../services/auth.service';
import {SiteThemeService} from '../theme/site-theme.service';
import {SiteHeaderComponent} from './site-header.component';

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;
  let nativeElement: HTMLElement;
  let openSearch: jasmine.Spy;
  let toggleTheme: jasmine.Spy;

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
    toggleTheme = jasmine.createSpy('toggleMode');
    const themeService = {
      isDark: signal(true),
      toggleMode: toggleTheme,
    };
    const searchOverlayService = {
      isOpen: searchOpen.asReadonly(),
      open: openSearch,
      close: jasmine.createSpy('closeSearch').and.callFake(() => searchOpen.set(false)),
    };

    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent, RouterTestingModule],
      providers: [
        {provide: AuthService, useValue: authService},
        {provide: SiteSearchOverlayService, useValue: searchOverlayService},
        {provide: SiteThemeService, useValue: themeService},
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

  it('moves theme and account utilities into the responsive site menu', () => {
    const menuButton = nativeElement.querySelector<HTMLButtonElement>('button[aria-label="Open site menu"]');

    menuButton?.click();
    fixture.detectChanges();

    const utilityMenu = nativeElement.querySelector<HTMLElement>('#site-utility-menu');
    const themeButton = Array.from(utilityMenu?.querySelectorAll('button') ?? [])
      .find(button => button.textContent?.includes('Switch to light mode'));

    expect(utilityMenu?.textContent).toContain('All Posts');
    expect(utilityMenu?.textContent).toContain('Open OS');
    expect(themeButton).toBeDefined();

    themeButton?.click();
    fixture.detectChanges();

    expect(toggleTheme).toHaveBeenCalledTimes(1);
    expect(nativeElement.querySelector('#site-utility-menu')).toBeNull();
  });
});
