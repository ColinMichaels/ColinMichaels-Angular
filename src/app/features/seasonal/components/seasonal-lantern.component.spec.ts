import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {User} from 'firebase/auth';
import {BehaviorSubject} from 'rxjs';

import {AuthService, AuthState} from '../../../services/auth.service';
import {SEASONAL_CONFIG, SEASONAL_PREFERENCE_STORAGE_KEY, seasonalStorageKey} from '../seasonal.config';
import {SEASONAL_CONFIGURATION, SeasonalService} from '../seasonal.service';
import {SeasonalLanternComponent} from './seasonal-lantern.component';

describe('SeasonalLanternComponent account controls', () => {
  let fixture: ComponentFixture<SeasonalLanternComponent>;
  let service: SeasonalService;
  let authState: BehaviorSubject<AuthState>;
  const user = {uid: 'ordinary-registered-reader', isAnonymous: false} as User;
  const halloweenKey = seasonalStorageKey('scary-christmas-2026');

  beforeEach(async () => {
    localStorage.removeItem(SEASONAL_PREFERENCE_STORAGE_KEY);
    localStorage.removeItem(halloweenKey);
    authState = new BehaviorSubject<AuthState>({status: 'authenticated', user});
    await TestBed.configureTestingModule({
      imports: [SeasonalLanternComponent],
      providers: [provideRouter([]),
        {provide: AuthService, useValue: {authState$: authState.asObservable()}},
        {provide: SEASONAL_CONFIGURATION, useValue: {...SEASONAL_CONFIG, mode: 'manual'}},
      ],
    }).compileComponents();
    service = TestBed.inject(SeasonalService);
    service.setContext('/archive/seasons/scary-christmas-2026');
    fixture = TestBed.createComponent(SeasonalLanternComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem(SEASONAL_PREFERENCE_STORAGE_KEY);
    localStorage.removeItem(halloweenKey);
  });

  function root(): HTMLElement { return fixture.nativeElement as HTMLElement; }
  function button(text: string): HTMLButtonElement | undefined {
    return [...root().querySelectorAll('button')].find(element => element.textContent?.trim() === text
      || element.getAttribute('aria-label') === text);
  }
  function click(text: string): void {
    const target = button(text);
    expect(target).withContext(text).toBeDefined();
    target!.click();
    fixture.detectChanges();
  }

  it('shows settings to an ordinary registered account without requiring roles or membership', () => {
    click('Holiday options');
    expect(root().querySelector('[role="dialog"] h2')?.textContent).toBe('Seasonal options');
    expect(button('Use the normal design')).toBeDefined();
    expect(root().querySelector('select')).toBeNull();
    click('Use the normal design');
    expect(root().querySelector('[role="dialog"]')).toBeNull();
    expect(button('Bring back Scary Christmas')).toBeDefined();
    expect(service.enabled()).toBeFalse();
    click('Bring back Scary Christmas');
    expect(service.enabled()).toBeTrue();
    expect(root().querySelector('#seasonal-lantern-toggle')).not.toBeNull();
  });

  it('keeps public hunt and clues available while hiding settings in every unregistered auth state', () => {
    for (const state of [
      {status: 'initializing', user: null}, {status: 'unavailable', user: null},
      {status: 'unauthenticated', user: null},
      {status: 'authenticated', user: {uid: 'firebase-guest', isAnonymous: true} as User},
    ] as AuthState[]) {
      authState.next(state);
      fixture.detectChanges();
      expect(root().querySelector('#seasonal-theme-toggle')).toBeNull();
      expect(root().querySelector('#seasonal-restore-toggle')).toBeNull();
      root().querySelector<HTMLButtonElement>('#seasonal-lantern-toggle')!.click();
      fixture.detectChanges();
      expect(root().querySelector('[role="dialog"] h2')?.textContent).toBe('Your lantern');
      expect(root().querySelector('.seasonal-theme-settings')).toBeNull();
      expect(button('Use the normal design')).toBeUndefined();
      expect(button('Show clues')).toBeDefined();
      click('Show clues');
      expect(root().querySelectorAll('.seasonal-clue-list a').length).toBe(8);
      click('Hide clues');
      click('Keep exploring');
    }
  });

  it('closes an open options drawer immediately on sign-out and preserves the account preference', async () => {
    service.setEnabled(false);
    fixture.detectChanges();
    const storedPreference = localStorage.getItem(SEASONAL_PREFERENCE_STORAGE_KEY);
    click('Holiday options');
    expect(button("Use the site's holiday design")).toBeDefined();
    authState.next({status: 'unauthenticated', user: null});
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root().querySelector('[role="dialog"]')).toBeNull();
    expect(root().querySelector('#seasonal-theme-toggle')).toBeNull();
    expect(root().querySelector('#seasonal-restore-toggle')).toBeNull();
    expect(root().querySelector('#seasonal-lantern-toggle')).not.toBeNull();
    expect(document.activeElement).toBe(root().querySelector('#seasonal-lantern-toggle'));
    expect(service.enabled()).toBeTrue();
    expect(localStorage.getItem(SEASONAL_PREFERENCE_STORAGE_KEY)).toBe(storedPreference);
    authState.next({status: 'authenticated', user});
    fixture.detectChanges();
    expect(button('Bring back Scary Christmas')).toBeDefined();
    expect(root().querySelector('[role="dialog"]')).toBeNull();
  });

  it('links to Dreadnauts without an audio player and closes on account loss while preserving candy', () => {
    service.setContext('/');
    service.collect('ember-toffee');
    service.openLantern();
    fixture.detectChanges();
    const link = root().querySelector<HTMLAnchorElement>('.seasonal-listening-link');
    expect(link?.href).toBe('https://dreadnauts.uk/music');
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toBe('noopener noreferrer');
    expect(button('Play Spooky')).toBeUndefined();
    expect(root().querySelector('audio')).toBeNull();
    authState.next({status: 'unauthenticated', user: null});
    fixture.detectChanges();
    expect(root().querySelector('[role="dialog"]')).toBeNull();
    expect(service.collectedIds()).toEqual(['ember-toffee']);
    service.openLantern();
    fixture.detectChanges();
    expect(root().querySelector('.seasonal-listening-link')).not.toBeNull();
    expect(root().querySelector('.seasonal-theme-settings')).toBeNull();
  });

  it('keeps reflection information public and excludes account-only controls for guests', () => {
    authState.next({status: 'unauthenticated', user: null});
    service.setContext('/archive/seasons/memorial-day-2027');
    fixture.detectChanges();
    click('About this holiday');
    expect(root().querySelector('[role="dialog"] h2')?.textContent).toBe('About this season');
    expect(root().querySelector('.seasonal-reflection-note')).not.toBeNull();
    expect(root().querySelector('.seasonal-theme-settings')).toBeNull();
    expect(root().querySelector('.seasonal-collection-slots')).toBeNull();
    expect(button('Show clues')).toBeUndefined();
  });
});
