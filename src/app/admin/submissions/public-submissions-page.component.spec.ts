import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

import {PublicSubmission} from './public-submission.models';
import {PublicSubmissionService} from './public-submission.service';
import {PublicSubmissionsPageComponent} from './public-submissions-page.component';

const contactSubmission: PublicSubmission = {
  id: 'contact-1',
  type: 'contact',
  status: 'new',
  submittedAt: '2026-08-05T12:00:00.000Z',
  updatedAt: '2026-08-05T12:00:00.000Z',
  contact: {name: 'Reader Name', email: 'reader@example.com'},
  inquiry: {reason: 'general', subject: 'A useful question', message: 'A complete message for review.'},
  authorProfile: null,
  proposal: null,
  alertDelivery: {status: 'sent', attemptedAt: '', sentAt: '2026-08-05T12:01:00.000Z', failedAt: ''},
};

const authorSubmission: PublicSubmission = {
  id: 'author-1',
  type: 'author-pitch',
  status: 'in-review',
  submittedAt: '2026-08-04T12:00:00.000Z',
  updatedAt: '2026-08-04T12:00:00.000Z',
  contact: {name: 'Writer Name', email: 'writer@example.com'},
  inquiry: null,
  authorProfile: {
    creditName: 'Writer Name',
    location: 'Florida',
    profileWebsite: 'https://writer.example.com',
    currentRole: 'Writer',
    shortBio: 'A sufficiently detailed author biography for an editorial review.',
    creditDetails: '',
  },
  proposal: {
    topics: 'Technology',
    proposedTitle: 'A practical article proposal',
    pitch: 'A sufficiently detailed pitch for the editorial team to review before responding to the writer.',
    references: '',
    publishingHistory: '',
  },
  alertDelivery: null,
};

describe('PublicSubmissionsPageComponent', () => {
  let fixture: ComponentFixture<PublicSubmissionsPageComponent>;
  let service: jasmine.SpyObj<PublicSubmissionService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj('PublicSubmissionService', [
      'listenToSubmissions',
      'reviewSubmission',
      'respondToSubmission',
      'createResponseRequestId',
    ]);
    service.listenToSubmissions.and.returnValue(of([contactSubmission, authorSubmission]));
    service.reviewSubmission.and.resolveTo({
      submissionId: contactSubmission.id,
      status: 'in-review',
      updatedAt: '2026-08-05T12:05:00.000Z',
    });
    service.respondToSubmission.and.resolveTo({
      submissionId: contactSubmission.id,
      status: 'responded',
      responseId: 'response-1',
      messageId: 'message-1',
    });
    service.createResponseRequestId.and.returnValue('019fd216-37fe-7273-ae49-30fc0820e490');

    await TestBed.configureTestingModule({
      imports: [PublicSubmissionsPageComponent, RouterTestingModule],
      providers: [{provide: PublicSubmissionService, useValue: service}],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicSubmissionsPageComponent);
    fixture.detectChanges();
  });

  it('renders the new-submission queue and the selected private details', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Submissions');
    expect(element.textContent).toContain('Reader Name');
    expect(element.textContent).toContain('A complete message for review.');
    expect(element.textContent).toContain('Alert sent');
    expect(element.textContent).not.toContain('A practical article proposal');
  });

  it('starts review through the trusted callable service', async () => {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(candidate => candidate.textContent?.trim() === 'Start review');

    button?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.reviewSubmission).toHaveBeenCalledWith('contact-1', 'start-review');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Submission moved into review.');
  });

  it('sends a composed response with a stable request id', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const message = element.querySelector<HTMLTextAreaElement>('#submission-response-message');
    expect(message).not.toBeNull();
    message!.value = 'Thank you for reaching out. Here is a complete response.';
    message!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.respondToSubmission).toHaveBeenCalledWith(
      'contact-1',
      '019fd216-37fe-7273-ae49-30fc0820e490',
      'Re: A useful question',
      'Thank you for reaching out. Here is a complete response.'
    );
    expect(element.textContent).toContain('Response sent to reader@example.com.');
  });
});
