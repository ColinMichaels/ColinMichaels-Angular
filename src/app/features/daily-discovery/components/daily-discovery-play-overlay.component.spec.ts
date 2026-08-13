import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {User} from 'firebase/auth';
import {BehaviorSubject} from 'rxjs';

import {AuthService} from '../../../services/auth.service';
import {DailyDiscoveryChallenge} from '../models/daily-discovery.model';
import {DailyDiscoveryPlayService} from '../services/daily-discovery-play.service';
import {DailyDiscoveryService} from '../services/daily-discovery.service';
import {DailyDiscoveryStateService} from '../services/daily-discovery-state.service';
import {DailyDiscoveryPlayOverlayComponent} from './daily-discovery-play-overlay.component';

describe('DailyDiscoveryPlayOverlayComponent', () => {
  let fixture: ComponentFixture<DailyDiscoveryPlayOverlayComponent>;
  let element: HTMLElement;
  let play: DailyDiscoveryPlayService;
  let user$: BehaviorSubject<User | null>;

  beforeEach(async () => {
    user$ = new BehaviorSubject<User | null>(null);

    await TestBed.configureTestingModule({
      imports: [DailyDiscoveryPlayOverlayComponent, RouterTestingModule],
      providers: [
        {provide: AuthService, useValue: {user$: user$.asObservable()}},
        {
          provide: DailyDiscoveryService,
          useValue: {getChallenge: jasmine.createSpy(), submitAnswer: jasmine.createSpy()},
        },
        {
          provide: DailyDiscoveryStateService,
          useValue: {
            hasCompleted: jasmine.createSpy().and.returnValue(false),
            markCompleted: jasmine.createSpy(),
            getCompletedChallengeIds: jasmine.createSpy().and.returnValue([]),
            getCompletedChallengeIdsForToday: jasmine.createSpy().and.returnValue([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyDiscoveryPlayOverlayComponent);
    element = fixture.nativeElement as HTMLElement;
    play = TestBed.inject(DailyDiscoveryPlayService);
  });

  it('pins the active question in a high-contrast playing surface', async () => {
    play.start(createMultipleChoiceChallenge());
    fixture.detectChanges();
    await fixture.whenStable();

    const playingToggle = element.querySelector<HTMLElement>('.discovery-playing-toggle');
    expect(playingToggle?.getAttribute('role')).toBe('switch');
    expect(playingToggle?.getAttribute('aria-checked')).toBe('true');
    expect(element.textContent).toContain('Playing Discovery');
    expect(element.textContent).toContain('What built-in feature could help?');
    expect(element.querySelectorAll('input[type="radio"]')).toHaveSize(4);
    expect(Array.from(element.querySelectorAll('[data-choice-marker]')).map(marker => marker.textContent?.trim()))
      .toEqual(['A', 'B', 'C', 'D']);
    expect(Array.from(element.querySelectorAll<HTMLInputElement>('input[type="radio"]')).map(input => input.value))
      .toEqual(['c', 'd', 'b', 'a']);
    expect(document.activeElement).toBe(element.querySelector('input[type="radio"]'));
  });

  it('highlights the displayed letter while retaining the original answer id', () => {
    play.start(createMultipleChoiceChallenge());
    fixture.detectChanges();

    const storedAnswer = element.querySelector<HTMLInputElement>('input[type="radio"][value="a"]');
    storedAnswer?.click();
    fixture.detectChanges();

    const selectedChoice = element.querySelector<HTMLElement>('[data-choice-id="a"]');
    expect(play.answer()).toBe('a');
    expect(storedAnswer?.classList).toContain('discovery-choice-input');
    expect(selectedChoice?.classList).toContain('is-selected');
    expect(selectedChoice?.querySelector('[data-choice-marker]')?.textContent?.trim()).toBe('D');
  });

  it('collapses answers while leaving the question pinned for browsing', () => {
    play.start(createMultipleChoiceChallenge());
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.discovery-keep-browsing')?.click();
    fixture.detectChanges();

    expect(play.isPlaying()).toBeTrue();
    expect(element.textContent).toContain('What built-in feature could help?');
    expect(element.querySelector('#discovery-play-answer-panel')).toBeNull();
    expect(element.querySelector('.discovery-answer-toggle')?.textContent?.trim()).toBe('Answer');
  });

  it('stops play and removes every Discovery gameplay item with Escape', () => {
    play.start(createMultipleChoiceChallenge());
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    fixture.detectChanges();

    expect(play.isPlaying()).toBeFalse();
    expect(play.challenge()).toBeNull();
    expect(element.querySelector('.discovery-play-overlay')).toBeNull();
  });
});

function createMultipleChoiceChallenge(): DailyDiscoveryChallenge {
  return {
    id: 'question-1',
    dateKey: '2026-08-13',
    question: 'What built-in feature could help?',
    points: 5,
    interactionType: 'multiple_choice',
    choices: [
      {id: 'a', text: 'A center-weighted light meter'},
      {id: 'b', text: 'A built-in instant photo printer'},
      {id: 'c', text: 'A detachable film advance lever'},
      {id: 'd', text: 'A mechanical self-timer'},
    ],
    completedToday: false,
    challengeNumber: 1,
    totalQuestions: 5,
    completedCount: 0,
    dailyComplete: false,
    progress: null,
  };
}
