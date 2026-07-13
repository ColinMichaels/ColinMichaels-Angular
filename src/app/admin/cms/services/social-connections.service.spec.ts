import {TestBed} from '@angular/core/testing';

import {SocialConnectionsService} from './social-connections.service';

describe('SocialConnectionsService', () => {
  it('fails clearly when Firebase Functions is unavailable', async () => {
    TestBed.configureTestingModule({providers: [SocialConnectionsService]});

    await expectAsync(TestBed.inject(SocialConnectionsService).listConnections())
      .toBeRejectedWithError('Firebase Functions is not initialized.');
  });
});
