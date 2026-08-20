import {TestBed} from '@angular/core/testing';

import {DailyDiscoveryChallenge} from '../models/daily-discovery.model';
import {CelebrationService} from '../../../shared/celebration/celebration.service';
import {DailyDiscoveryPlayService} from './daily-discovery-play.service';
import {DailyDiscoveryService} from './daily-discovery.service';
import {DailyDiscoveryStateService} from './daily-discovery-state.service';

describe('DailyDiscoveryPlayService', () => {
  let service: DailyDiscoveryPlayService;
  let getChallenge: jasmine.Spy;
  let submitAnswer: jasmine.Spy;
  let hasCompleted: jasmine.Spy;
  let markCompleted: jasmine.Spy;
  let getCompletedChallengeIds: jasmine.Spy;
  let getCompletedChallengeIdsForToday: jasmine.Spy;
  let celebrateCorrectAnswer: jasmine.Spy;
  let celebrateConfirmedPointAward: jasmine.Spy;

  beforeEach(() => {
    getChallenge = jasmine.createSpy('getChallenge');
    submitAnswer = jasmine.createSpy('submitAnswer');
    hasCompleted = jasmine.createSpy('hasCompleted').and.returnValue(false);
    markCompleted = jasmine.createSpy('markCompleted');
    getCompletedChallengeIds = jasmine.createSpy('getCompletedChallengeIds').and.returnValue([]);
    getCompletedChallengeIdsForToday = jasmine.createSpy('getCompletedChallengeIdsForToday').and.returnValue([]);
    celebrateCorrectAnswer = jasmine.createSpy('celebrateCorrectAnswer');
    celebrateConfirmedPointAward = jasmine.createSpy('celebrateConfirmedPointAward').and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        {provide: DailyDiscoveryService, useValue: {getChallenge, submitAnswer}},
        {
          provide: DailyDiscoveryStateService,
          useValue: {hasCompleted, markCompleted, getCompletedChallengeIds, getCompletedChallengeIdsForToday},
        },
        {
          provide: CelebrationService,
          useValue: {celebrateCorrectAnswer, celebrateConfirmedPointAward},
        },
      ],
    });
    service = TestBed.inject(DailyDiscoveryPlayService);
  });

  it('starts and fully clears a persistent play session', () => {
    const returnFocus = document.createElement('button');
    document.body.appendChild(returnFocus);
    service.start(createChallenge(), returnFocus);

    expect(service.isPlaying()).toBeTrue();
    expect(service.answersVisible()).toBeTrue();
    expect(service.challenge()?.id).toBe('question-1');

    service.updateAnswer('draft answer');
    service.stop();

    expect(service.isPlaying()).toBeFalse();
    expect(service.answersVisible()).toBeFalse();
    expect(service.challenge()).toBeNull();
    expect(service.answer()).toBe('');
    returnFocus.remove();
  });

  it('submits through the server boundary and remembers a correct guest completion', async () => {
    submitAnswer.and.resolveTo({
      correct: true,
      message: 'Set a private family safe word.',
      completedCount: 1,
      totalQuestions: 5,
      dailyComplete: false,
    });
    service.start(createChallenge());
    service.updateAnswer('safe word');

    await service.checkAnswer();

    expect(submitAnswer).toHaveBeenCalledWith({
      challengeId: 'question-1',
      dateKey: '2026-08-09',
      answer: 'safe word',
      completedChallengeIds: [],
    });
    expect(markCompleted).toHaveBeenCalledWith('2026-08-09', 'question-1');
    expect(service.isCompleted()).toBeTrue();
    expect(service.completedCount()).toBe(1);
    expect(celebrateConfirmedPointAward).toHaveBeenCalled();
    expect(celebrateCorrectAnswer).toHaveBeenCalledTimes(1);
  });

  it('uses the points celebration once a signed-in correct answer earns points', async () => {
    celebrateConfirmedPointAward.and.returnValue(true);
    submitAnswer.and.resolveTo({
      correct: true,
      message: 'Correct.',
      awarded: true,
      points: 5,
      progress: {
        currentStreak: 2,
        longestStreak: 2,
        totalCompleted: 2,
        lastCompletedDate: '2026-08-09',
        completedChallengeIds: ['question-1'],
      },
      completedCount: 1,
      totalQuestions: 5,
      dailyComplete: false,
    });
    service.start(createChallenge());
    service.updateAnswer('safe word');

    await service.checkAnswer();

    expect(celebrateConfirmedPointAward).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      awarded: true,
      points: 5,
    }));
    expect(celebrateCorrectAnswer).not.toHaveBeenCalled();
  });

  it('keeps the overlay active while loading the next unfinished question', async () => {
    getCompletedChallengeIdsForToday.and.returnValue(['question-1']);
    getChallenge.and.resolveTo(createChallenge({
      id: 'question-2',
      question: 'Which word completes the title?',
      challengeNumber: 2,
      completedCount: 1,
    }));
    service.start(createChallenge());

    await service.loadNextChallenge();

    expect(getChallenge).toHaveBeenCalledWith(['question-1']);
    expect(service.isPlaying()).toBeTrue();
    expect(service.challenge()?.id).toBe('question-2');
    expect(service.answersVisible()).toBeTrue();
  });
});

function createChallenge(overrides: Partial<DailyDiscoveryChallenge> = {}): DailyDiscoveryChallenge {
  return {
    id: 'question-1',
    dateKey: '2026-08-09',
    question: 'What family rule can help stop an AI voice scam?',
    points: 5,
    completedToday: false,
    challengeNumber: 1,
    totalQuestions: 5,
    completedCount: 0,
    dailyComplete: false,
    progress: null,
    ...overrides,
  };
}
