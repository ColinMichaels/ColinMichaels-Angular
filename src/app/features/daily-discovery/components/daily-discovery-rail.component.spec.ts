import {signal, WritableSignal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {User} from 'firebase/auth';
import {BehaviorSubject} from 'rxjs';

import {AuthService} from '../../../services/auth.service';
import {SiteSearchOverlayService} from '../../search/services/site-search-overlay.service';
import {DailyDiscoveryChallenge} from '../models/daily-discovery.model';
import {DailyDiscoveryPlayService} from '../services/daily-discovery-play.service';
import {DailyDiscoveryService} from '../services/daily-discovery.service';
import {DailyDiscoveryStateService} from '../services/daily-discovery-state.service';
import {DailyDiscoveryRailComponent} from './daily-discovery-rail.component';

describe('DailyDiscoveryRailComponent', () => {
  let fixture: ComponentFixture<DailyDiscoveryRailComponent>;
  let element: HTMLElement;
  let getChallenge: jasmine.Spy;
  let requestAttention: jasmine.Spy;
  let startPlaying: jasmine.Spy;
  let hasCompleted: jasmine.Spy;
  let user$: BehaviorSubject<User | null>;
  const isPlaying = signal(false);

  beforeEach(async () => {
    isPlaying.set(false);
    getChallenge = jasmine.createSpy('getChallenge').and.resolveTo(createChallenge());
    requestAttention = jasmine.createSpy('requestAttention');
    startPlaying = jasmine.createSpy('start');
    hasCompleted = jasmine.createSpy('hasCompleted').and.returnValue(false);
    user$ = new BehaviorSubject<User | null>(null);

    await TestBed.configureTestingModule({
      imports: [DailyDiscoveryRailComponent],
      providers: [
        {provide: AuthService, useValue: {user$: user$.asObservable()}},
        {provide: DailyDiscoveryService, useValue: {getChallenge}},
        {
          provide: DailyDiscoveryStateService,
          useValue: {
            hasCompleted,
            getCompletedChallengeIdsForToday: jasmine.createSpy().and.returnValue([]),
          },
        },
        {provide: DailyDiscoveryPlayService, useValue: {isPlaying, start: startPlaying}},
        {provide: SiteSearchOverlayService, useValue: {requestAttention}},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyDiscoveryRailComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('shows the compact daily prompt without adding a second search field', () => {
    expect(element.textContent).toContain('Daily Discovery');
    expect(element.textContent).toContain('What family rule can help stop an AI voice scam?');
    expect(element.textContent).toContain('5 points');
    expect(element.textContent).toContain('1 / 10');
    expect(element.querySelectorAll('input[type="search"]')).toHaveSize(0);
    expect(element.querySelector('.daily-discovery-question')?.tagName).toBe('P');
    expect(element.querySelector('.daily-discovery-answer-toggle')?.textContent?.trim()).toBe('Answer');
    expect(element.querySelector('#daily-discovery-answer-panel')).toBeNull();
  });

  it('starts the persistent play session and cues the existing header search', () => {
    const answerButton = element.querySelector<HTMLButtonElement>('.daily-discovery-answer-toggle');

    answerButton?.click();

    expect(startPlaying).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'family-ai-voice-safe-word',
    }), answerButton);
    expect(requestAttention).toHaveBeenCalledTimes(1);
  });

  it('uses Solve for reasoning questions', () => {
    const componentState = fixture.componentInstance as unknown as {
      challenge: WritableSignal<DailyDiscoveryChallenge | null>;
    };
    componentState.challenge.set(createChallenge({
      id: 'comparison-question',
      questionType: 'compare_articles',
    }));
    fixture.detectChanges();

    expect(element.querySelector('.daily-discovery-answer-toggle')?.textContent?.trim()).toBe('Solve');
  });

  it('hides the homepage rail while Discovery is playing', () => {
    isPlaying.set(true);
    fixture.detectChanges();

    expect(element.classList).toContain('is-playing');
  });

  it('shows account-backed progress without consulting guest completion history', () => {
    user$.next({uid: 'reader-1'} as User);
    const componentState = fixture.componentInstance as unknown as {
      challenge: WritableSignal<DailyDiscoveryChallenge | null>;
    };
    componentState.challenge.set(createChallenge({
      completedCount: 2,
      progress: {
        currentStreak: 3,
        longestStreak: 3,
        totalCompleted: 12,
        lastCompletedDate: '2026-08-09',
        completedChallengeIds: ['q1', 'q2'],
      },
    }));
    hasCompleted.calls.reset();
    fixture.detectChanges();

    expect(element.textContent).toContain('2 / 10 complete');
    expect(element.textContent).toContain('Streak active');
    expect(hasCompleted).not.toHaveBeenCalled();
  });
});

function createChallenge(overrides: Partial<DailyDiscoveryChallenge> = {}): DailyDiscoveryChallenge {
  return {
    id: 'family-ai-voice-safe-word',
    dateKey: '2026-08-09',
    question: 'What family rule can help stop an AI voice scam?',
    points: 5,
    completedToday: false,
    challengeNumber: 1,
    totalQuestions: 10,
    completedCount: 0,
    dailyComplete: false,
    progress: null,
    ...overrides,
  };
}
