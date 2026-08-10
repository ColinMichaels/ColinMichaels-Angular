import {TestBed} from '@angular/core/testing';

import {DailyDiscoveryAdminService} from './daily-discovery-admin.service';

describe('DailyDiscoveryAdminService', () => {
  beforeEach(() => TestBed.configureTestingModule({providers: [DailyDiscoveryAdminService]}));

  it('fails closed when Firebase Functions is unavailable', async () => {
    const service = TestBed.inject(DailyDiscoveryAdminService);

    await expectAsync(service.getQuestionSet('2026-08-10'))
      .toBeRejectedWithError('Firebase Functions is not initialized.');
  });
});

