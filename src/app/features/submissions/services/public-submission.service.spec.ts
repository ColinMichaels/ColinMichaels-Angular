import {TestBed} from '@angular/core/testing';

import {PublicSubmissionService} from './public-submission.service';

describe('PublicSubmissionService', () => {
  beforeEach(() => TestBed.configureTestingModule({providers: [PublicSubmissionService]}));

  it('fails closed when Firebase Functions is unavailable', async () => {
    const service = TestBed.inject(PublicSubmissionService);

    await expectAsync(service.submit({
      type: 'contact',
      name: 'Reader Name',
      email: 'reader@example.com',
      reason: 'general',
      subject: 'A useful question',
      message: 'This is a complete contact message for the site owner.',
      privacyConsent: true,
      company: '',
    })).toBeRejectedWithError('Firebase Functions is not initialized.');
  });
});
