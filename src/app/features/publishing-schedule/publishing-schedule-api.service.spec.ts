import {TestBed} from '@angular/core/testing';
import {PublishingScheduleApiService} from './publishing-schedule-api.service';

describe('PublishingScheduleApiService', () => {
  it('fails closed when Firebase Functions is unavailable', async () => {
    TestBed.configureTestingModule({});
    const api = TestBed.inject(PublishingScheduleApiService);
    await expectAsync(api.getSchedule()).toBeRejectedWithError('Publishing schedule is unavailable.');
    await expectAsync(api.getPost('next-post')).toBeRejectedWithError('Article is unavailable.');
    await expectAsync(api.getPost('../admin')).toBeRejectedWithError('Article is unavailable.');
  });
});
