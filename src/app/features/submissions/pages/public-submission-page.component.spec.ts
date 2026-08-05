import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, provideRouter} from '@angular/router';

import {PublicSubmissionService} from '../services/public-submission.service';
import {
  createPublicSubmissionForm,
  PublicSubmissionPageComponent,
} from './public-submission-page.component';

describe('PublicSubmissionPageComponent', () => {
  it('renders the contact questionnaire and submits its normalized payload', async () => {
    const submit = jasmine.createSpy('submit').and.resolveTo({accepted: true, referenceId: 'submission-123'});
    const fixture = await createFixture('contact', submit);
    const componentForm = getComponentForm(fixture);

    componentForm.patchValue({
      name: 'Reader Name',
      email: 'reader@example.com',
      reason: 'correction',
      subject: 'Correction for an article',
      message: 'I found a detail that may need a source or a small correction.',
      privacyConsent: true,
    });
    (fixture.nativeElement as HTMLElement).querySelector<HTMLFormElement>('form')
      ?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(submit).toHaveBeenCalledOnceWith({
      type: 'contact',
      name: 'Reader Name',
      email: 'reader@example.com',
      reason: 'correction',
      subject: 'Correction for an article',
      message: 'I found a detail that may need a source or a small correction.',
      privacyConsent: true,
      company: '',
    });
    expect(fixture.nativeElement.querySelector('[data-submission-success]')?.textContent)
      .toContain('submission-123');
    expect(fixture.nativeElement.querySelector('#submission-credit-name')).toBeNull();
  });

  it('renders author credit, references, publishing history, and proposal questions', async () => {
    const fixture = await createFixture('author-pitch', jasmine.createSpy('submit'));
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';

    expect(element.querySelector('#submission-credit-name')).not.toBeNull();
    expect(element.querySelector('#submission-bio')).not.toBeNull();
    expect(element.querySelector('#submission-references')).not.toBeNull();
    expect(element.querySelector('#submission-history')).not.toBeNull();
    expect(element.querySelector('#submission-pitch')).not.toBeNull();
    expect(text).toContain('Where else do you publish?');
    expect(text).toContain('grants no publishing permissions');
  });

  it('applies only the validators needed by the active questionnaire', () => {
    const contactForm = createPublicSubmissionForm('contact');
    contactForm.patchValue({
      name: 'Reader Name',
      email: 'reader@example.com',
      subject: 'General question',
      message: 'This is a complete message with enough information.',
      privacyConsent: true,
    });
    expect(contactForm.valid).toBeTrue();

    const authorForm = createPublicSubmissionForm('author-pitch');
    authorForm.patchValue({
      name: 'Writer Name',
      email: 'writer@example.com',
      creditName: 'Writer Name',
      profileWebsite: 'javascript:alert(1)',
      shortBio: 'I write practical stories grounded in first-hand experience and careful research.',
      topics: 'Recovery and technology',
      proposedTitle: 'A practical post proposal',
      pitch: 'This proposal explains a useful reader problem, the first-hand perspective behind it, and the sources that would support a careful article.',
      originalWorkConfirmation: true,
      privacyConsent: true,
    });
    expect(authorForm.controls.profileWebsite.hasError('httpUrl')).toBeTrue();
    authorForm.controls.profileWebsite.setValue('https://writer.example.com');
    expect(authorForm.valid).toBeTrue();
  });
});

async function createFixture(
  submissionType: 'contact' | 'author-pitch',
  submit: jasmine.Spy
): Promise<ComponentFixture<PublicSubmissionPageComponent>> {
  await TestBed.configureTestingModule({
    imports: [PublicSubmissionPageComponent],
    providers: [
      provideRouter([]),
      {
        provide: PublicSubmissionService,
        useValue: {submit},
      },
      {
        provide: ActivatedRoute,
        useValue: {snapshot: {data: {submissionType}}},
      },
    ],
  })
    .compileComponents();

  const fixture = TestBed.createComponent(PublicSubmissionPageComponent);
  fixture.detectChanges();
  return fixture;
}

function getComponentForm(
  fixture: ComponentFixture<PublicSubmissionPageComponent>
): ReturnType<typeof createPublicSubmissionForm> {
  return (fixture.componentInstance as unknown as {
    form: ReturnType<typeof createPublicSubmissionForm>;
  }).form;
}
