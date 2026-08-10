import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {DailyDiscoveryAdminDryRunResult} from './daily-discovery-admin.models';
import {DailyDiscoveryAdminPageComponent} from './daily-discovery-admin-page.component';
import {DailyDiscoveryAdminService} from './daily-discovery-admin.service';

function createQuizJson(): string {
  return JSON.stringify({
    schema: 'colinmichaels.daily-discovery-quiz',
    version: 1,
    quizDate: '2026-08-10',
    timezone: 'America/New_York',
    status: 'ready',
    uploadStatus: 'approved',
    generatedAt: '2026-08-10T08:00:00-04:00',
    questions: Array.from({length: 5}, (_, index) => ({
      id: `2026-08-10-q${index + 1}`,
      position: index + 1,
      type: ['article_hunt', 'scenario_application', 'inference', 'compare_articles', 'sequence'][index],
      difficulty: index === 0 ? 'easy' : index === 4 ? 'challenge' : 'medium',
      prompt: `Which supported answer belongs to question number ${index + 1}?`,
      hint: `Search the source article for clue number ${index + 1}.`,
      choices: [{id: 'a', text: `Answer ${index + 1}`}, {id: 'b', text: `Distractor ${index + 1}`}],
      answer: {correctChoiceId: 'a', explanation: `The source supports answer number ${index + 1}.`},
      sourceArticles: [{
        title: `Source ${index + 1}`,
        slug: `source-${index + 1}`,
        url: `https://colinmichaels.com/blog/source-${index + 1}`,
        evidence: `Published evidence supports answer number ${index + 1}.`,
      }],
      estimatedSeconds: 45,
    })),
    qualityChecks: {
      questionCount: 5,
      distinctTypes: 5,
      allSourcesLive: true,
      oneDefensibleAnswerEach: true,
      duplicateGatePassed: true,
      titleBlankLimitPassed: true,
      jsonValidated: true,
    },
  });
}

function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll('button'))
    .find(candidate => candidate.textContent?.includes(label));

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button “${label}” was not found.`);
  }

  return button;
}

describe('DailyDiscoveryAdminPageComponent', () => {
  let fixture: ComponentFixture<DailyDiscoveryAdminPageComponent>;
  let service: jasmine.SpyObj<DailyDiscoveryAdminService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj('DailyDiscoveryAdminService', ['getQuestionSet', 'saveQuestionSet']);
    service.getQuestionSet.and.callFake(async dateKey => ({dateKey, exists: false}));

    await TestBed.configureTestingModule({
      imports: [DailyDiscoveryAdminPageComponent, RouterTestingModule],
      providers: [{provide: DailyDiscoveryAdminService, useValue: service}],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyDiscoveryAdminPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('loads a date and presents the upload workflow', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(service.getQuestionSet).toHaveBeenCalled();
    expect(element.textContent).toContain('Daily Discovery');
    expect(element.textContent).toContain('Upload dated JSON');
    expect(element.textContent).toContain('No stored set');
    expect(element.textContent).toContain('Load a question draft');
  });

  it('loads a generated JSON file through the upload input', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input[type="file"]');

    if (!(input instanceof HTMLInputElement)) throw new Error('JSON file input was not found.');

    const transfer = new DataTransfer();
    transfer.items.add(new File(
      [createQuizJson()],
      'daily-discovery-2026-08-10.json',
      {type: 'application/json'}
    ));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 50));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain('daily-discovery-2026-08-10.json');
    expect(element.textContent).toContain('Editing question 1 of 5');
  });

  it('loads pasted JSON, edits a question, validates, and creates the set', async () => {
    const element = fixture.nativeElement as HTMLElement;
    findButton(element, 'Paste JSON').click();
    fixture.detectChanges();

    const textarea = element.querySelector('textarea[placeholder="Paste the complete dated quiz object"]');
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('Paste editor was not found.');
    textarea.value = createQuizJson();
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    findButton(element, 'Load pasted JSON').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain('Editing question 1 of 5');
    const prompt = element.querySelector('textarea');
    expect(prompt).not.toBeNull();

    const validation: DailyDiscoveryAdminDryRunResult = {
      dryRun: true,
      dateKey: '2026-08-10',
      operation: 'create',
      currentRevision: null,
      nextRevision: 1,
      liveReplacement: false,
      questionCount: 5,
      publishedSourceCount: 5,
      requiresApproval: false,
    };
    service.saveQuestionSet.and.resolveTo(validation);
    findButton(element, 'Validate draft').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain('Validation passed');
    const createButton = findButton(element, 'Create set');
    expect(createButton.disabled).toBeFalse();

    service.saveQuestionSet.and.resolveTo({
      dryRun: false,
      dateKey: '2026-08-10',
      operation: 'create',
      revision: 1,
      liveReplacement: false,
      questionCount: 5,
      publishedSourceCount: 5,
      updatedAt: '2026-08-09T20:00:00.000Z',
      idempotent: false,
    });
    createButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.saveQuestionSet.calls.count()).toBe(2);
    expect(element.textContent).toContain('Created 2026-08-10 at revision 1');
  });
});
