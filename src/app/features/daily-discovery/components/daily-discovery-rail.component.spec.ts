import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {User} from 'firebase/auth';
import {BehaviorSubject} from 'rxjs';

import {AuthService} from '../../../services/auth.service';
import {SiteSearchOverlayService} from '../../search/services/site-search-overlay.service';
import {DailyDiscoveryService} from '../services/daily-discovery.service';
import {DailyDiscoveryStateService} from '../services/daily-discovery-state.service';
import {DailyDiscoveryRailComponent} from './daily-discovery-rail.component';

describe('DailyDiscoveryRailComponent', () => {
  let fixture: ComponentFixture<DailyDiscoveryRailComponent>;
  let element: HTMLElement;
  let getChallenge: jasmine.Spy;
  let submitAnswer: jasmine.Spy;
  let openAndFocus: jasmine.Spy;
  let hasCompleted: jasmine.Spy;
  let markCompleted: jasmine.Spy;
  let user$: BehaviorSubject<User | null>;

  beforeEach(async () => {
    getChallenge = jasmine.createSpy('getChallenge').and.resolveTo({
      id: 'family-ai-voice-safe-word',
      dateKey: '2026-08-09',
      question: 'What family rule can help stop an AI voice scam?',
      points: 5,
      completedToday: false,
      progress: null,
    });
    submitAnswer = jasmine.createSpy('submitAnswer');
    openAndFocus = jasmine.createSpy('openAndFocus');
    hasCompleted = jasmine.createSpy('hasCompleted').and.returnValue(false);
    markCompleted = jasmine.createSpy('markCompleted');
    user$ = new BehaviorSubject<User | null>(null);

    await TestBed.configureTestingModule({
      imports: [DailyDiscoveryRailComponent, RouterTestingModule],
      providers: [
        {provide: AuthService, useValue: {user$: user$.asObservable()}},
        {provide: DailyDiscoveryService, useValue: {getChallenge, submitAnswer}},
        {provide: DailyDiscoveryStateService, useValue: {hasCompleted, markCompleted}},
        {provide: SiteSearchOverlayService, useValue: {openAndFocus}},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyDiscoveryRailComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('shows the daily prompt without adding a second search field', () => {
    expect(element.textContent).toContain('Daily Discovery');
    expect(element.textContent).toContain('What family rule can help stop an AI voice scam?');
    expect(element.textContent).toContain('5 points');
    expect(element.querySelectorAll('input[type="search"]')).toHaveSize(0);
  });

  it('opens and focuses the existing header search from its CTA', () => {
    const searchButton = [...element.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Search the blog'));

    searchButton?.click();
    fixture.detectChanges();

    expect(openAndFocus).toHaveBeenCalledTimes(1);
    expect(element.querySelector<HTMLInputElement>('#daily-discovery-answer')?.type).toBe('text');
    expect(element.querySelectorAll('input[type="search"]')).toHaveSize(0);
  });

  it('stores a successful guest completion on the device', async () => {
    submitAnswer.and.resolveTo({
      correct: true,
      message: 'Set a private family safe word.',
      source: {
        slug: 'i-cloned-my-own-voice-now-my-family-needs-a-safe-word',
        title: 'I Cloned My Own Voice. Now My Family Needs a Safe Word.',
      },
      awarded: false,
      points: 0,
      total: null,
      progress: null,
    });
    const questionButton = element.querySelector<HTMLButtonElement>('.daily-discovery-question');

    questionButton?.click();
    fixture.detectChanges();
    const input = element.querySelector<HTMLInputElement>('#daily-discovery-answer');
    if (input) {
      input.value = 'safe word';
      input.dispatchEvent(new Event('input'));
    }
    element.querySelector<HTMLFormElement>('.daily-discovery-answer-form')
      ?.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(submitAnswer).toHaveBeenCalledWith({
      challengeId: 'family-ai-voice-safe-word',
      dateKey: '2026-08-09',
      answer: 'safe word',
    });
    expect(markCompleted).toHaveBeenCalledWith('2026-08-09', 'family-ai-voice-safe-word');
    expect(element.textContent).toContain('Discovery complete');
    expect(element.textContent).toContain('Solved on this device.');
  });

  it('keeps an incorrect answer private and offers another search', async () => {
    submitAnswer.and.resolveTo({
      correct: false,
      message: 'Not quite. Search the post again.',
    });
    element.querySelector<HTMLButtonElement>('.daily-discovery-question')?.click();
    fixture.detectChanges();
    const input = element.querySelector<HTMLInputElement>('#daily-discovery-answer');
    if (input) {
      input.value = 'call the police';
      input.dispatchEvent(new Event('input'));
    }
    element.querySelector<HTMLFormElement>('.daily-discovery-answer-form')
      ?.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(markCompleted).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Not quite. Search the post again.');
    expect(element.querySelector('#daily-discovery-answer')).not.toBeNull();
  });

  it('shows the awarded points and streak benefit to a signed-in solver', async () => {
    user$.next({uid: 'reader-1'} as User);
    submitAnswer.and.resolveTo({
      correct: true,
      message: 'Set a private family safe word.',
      source: {
        slug: 'i-cloned-my-own-voice-now-my-family-needs-a-safe-word',
        title: 'I Cloned My Own Voice. Now My Family Needs a Safe Word.',
      },
      awarded: true,
      points: 5,
      total: 45,
      progress: {
        currentStreak: 3,
        longestStreak: 3,
        totalCompleted: 3,
        lastCompletedDate: '2026-08-09',
      },
    });
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.daily-discovery-question')?.click();
    fixture.detectChanges();
    const input = element.querySelector<HTMLInputElement>('#daily-discovery-answer');
    if (input) {
      input.value = 'safe word';
      input.dispatchEvent(new Event('input'));
    }
    element.querySelector<HTMLFormElement>('.daily-discovery-answer-form')
      ?.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain('+5 points · 3 day streak');
    expect(element.textContent).not.toContain('Solved on this device.');
  });
});
