import {TestBed} from '@angular/core/testing';

import {DailyDiscoveryStateService} from './daily-discovery-state.service';

describe('DailyDiscoveryStateService', () => {
  let service: DailyDiscoveryStateService;

  beforeEach(() => {
    window.localStorage.removeItem('cm.daily-discovery.v1');
    TestBed.configureTestingModule({});
    service = TestBed.inject(DailyDiscoveryStateService);
  });

  afterEach(() => {
    window.localStorage.removeItem('cm.daily-discovery.v1');
  });

  it('remembers a guest completion for the matching date and challenge only', () => {
    service.markCompleted('2026-08-09', 'family-ai-voice-safe-word');

    expect(service.hasCompleted('2026-08-09', 'family-ai-voice-safe-word')).toBeTrue();
    expect(service.hasCompleted('2026-08-10', 'family-ai-voice-safe-word')).toBeFalse();
  });

  it('ignores invalid stored data', () => {
    window.localStorage.setItem('cm.daily-discovery.v1', '{not-json');

    expect(service.hasCompleted('2026-08-09', 'family-ai-voice-safe-word')).toBeFalse();
  });
});
