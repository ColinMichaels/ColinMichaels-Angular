import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';

import {ReaderPreferencesService} from '../reader-preferences/reader-preferences.service';
import {
  CELEBRATION_CONFETTI,
  CelebrationLauncher,
  CelebrationService,
} from './celebration.service';

describe('CelebrationService', () => {
  let service: CelebrationService;
  let launchConfetti: jasmine.Spy<CelebrationLauncher>;
  const reduceMotion = signal(false);

  beforeEach(() => {
    reduceMotion.set(false);
    launchConfetti = jasmine.createSpy<CelebrationLauncher>('launchConfetti');

    TestBed.configureTestingModule({
      providers: [
        CelebrationService,
        {provide: CELEBRATION_CONFETTI, useValue: launchConfetti},
        {
          provide: ReaderPreferencesService,
          useValue: {
            preferences: () => ({
              fontScale: 100,
              spacing: 'normal',
              highContrast: false,
              reduceMotion: reduceMotion(),
            }),
          },
        },
      ],
    });
    service = TestBed.inject(CelebrationService);
  });

  it('uses one restrained burst for a correct answer', () => {
    service.celebrateCorrectAnswer();

    expect(launchConfetti).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      particleCount: 48,
      disableForReducedMotion: true,
      origin: {y: 0.68},
      zIndex: 250,
    }));
  });

  it('uses an edge-to-edge reward burst for points', () => {
    service.celebratePointsAwarded(5);

    expect(launchConfetti).toHaveBeenCalledTimes(2);
    expect(launchConfetti.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
      particleCount: 42,
      origin: {x: 0.08, y: 0.72},
    }));
    expect(launchConfetti.calls.argsFor(1)[0]).toEqual(jasmine.objectContaining({
      particleCount: 42,
      origin: {x: 0.92, y: 0.72},
    }));
  });

  it('celebrates only a newly confirmed positive point award', () => {
    expect(service.celebrateConfirmedPointAward({awarded: false, points: 5})).toBeFalse();
    expect(service.celebrateConfirmedPointAward({awarded: true, points: 0})).toBeFalse();
    expect(service.celebrateConfirmedPointAward({awarded: true, points: 5})).toBeTrue();

    expect(launchConfetti).toHaveBeenCalledTimes(2);
  });

  it('does not animate when a reader enables reduced motion', () => {
    reduceMotion.set(true);

    service.celebrateCorrectAnswer();
    service.celebratePointsAwarded(5);

    expect(launchConfetti).not.toHaveBeenCalled();
  });
});
