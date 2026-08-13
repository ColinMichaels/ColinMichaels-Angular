import {ComponentFixture, TestBed} from '@angular/core/testing';

import {DailyDiscoveryExternalQuiz} from './daily-discovery-admin.models';
import {DailyDiscoveryDraftPreviewComponent} from './daily-discovery-draft-preview.component';

function createQuiz(): DailyDiscoveryExternalQuiz {
  return {
    schema: 'colinmichaels.daily-discovery-quiz',
    version: 1,
    quizDate: '2026-08-13',
    timezone: 'America/New_York',
    status: 'draft',
    uploadStatus: 'manual_review',
    generatedAt: '2026-08-12T07:45:00-04:00',
    questions: Array.from({length: 5}, (_, index) => ({
      id: `2026-08-13-q${index + 1}`,
      position: index + 1,
      type: ['article_hunt', 'scenario_application', 'inference', 'compare_articles', 'sequence'][index] as DailyDiscoveryExternalQuiz['questions'][number]['type'],
      difficulty: index === 0 ? 'easy' : index === 4 ? 'challenge' : 'medium',
      prompt: `Advanced preview question ${index + 1}?`,
      hint: `Preview hint ${index + 1}.`,
      choices: [
        {id: 'a', text: `Correct answer ${index + 1}`},
        {id: 'b', text: `Distractor ${index + 1}`},
      ],
      answer: {
        correctChoiceId: 'a',
        explanation: `Preview explanation ${index + 1}.`,
      },
      sourceArticles: [{
        title: `Preview source ${index + 1}`,
        slug: `preview-source-${index + 1}`,
        url: `https://colinmichaels.com/blog/preview-source-${index + 1}`,
        evidence: `Preview evidence ${index + 1}.`,
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
  };
}

function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll('button'))
    .find(candidate => candidate.textContent?.includes(label));

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button “${label}” was not found.`);
  }

  return button;
}

describe('DailyDiscoveryDraftPreviewComponent', () => {
  let fixture: ComponentFixture<DailyDiscoveryDraftPreviewComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyDiscoveryDraftPreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyDiscoveryDraftPreviewComponent);
    fixture.componentRef.setInput('quiz', createQuiz());
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  it('previews a future draft without presenting live-account behavior', () => {
    expect(element.textContent).toContain('Admin-only reader preview');
    expect(element.textContent).toContain('Daily Discovery · August 13, 2026');
    expect(element.textContent).toContain('Advanced preview question 1?');
    expect(element.textContent).toContain('not sent to Firebase');
    expect(findButton(element, 'Check answer').disabled).toBeTrue();
  });

  it('supports hint, incorrect, correct, source, and next-question states', () => {
    findButton(element, 'Show hint').click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Preview hint 1.');

    const incorrectChoice = element.querySelector<HTMLInputElement>('input[type="radio"][value="b"]');
    incorrectChoice?.click();
    fixture.detectChanges();
    findButton(element, 'Check answer').click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Not quite');

    const correctChoice = element.querySelector<HTMLInputElement>('input[type="radio"][value="a"]');
    correctChoice?.click();
    fixture.detectChanges();
    findButton(element, 'Check answer').click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Preview explanation 1.');
    expect(element.textContent).toContain('Preview source 1');

    findButton(element, 'Next question').click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Advanced preview question 2?');
    expect(element.textContent).toContain('1 tested this session');
  });

  it('uses shuffled alphabetical markers as the only visible selection control', () => {
    const displayedInputs = Array.from(element.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    const displayedMarkers = Array.from(element.querySelectorAll<HTMLElement>('[data-choice-marker]'));

    expect(displayedInputs.map(input => input.value)).toEqual(['b', 'a']);
    expect(displayedInputs.every(input => input.classList.contains('sr-only'))).toBeTrue();
    expect(displayedMarkers.map(marker => marker.textContent?.trim())).toEqual(['A', 'B']);

    displayedInputs[1].click();
    fixture.detectChanges();

    expect(displayedMarkers[1].classList).toContain('bg-cyan-300');
  });

  it('routes a skipped final question back to the first untested question', () => {
    findButton(element, '5').click();
    fixture.detectChanges();
    const correctChoice = element.querySelector<HTMLInputElement>('input[type="radio"][value="a"]');
    correctChoice?.click();
    fixture.detectChanges();
    findButton(element, 'Check answer').click();
    fixture.detectChanges();
    findButton(element, 'Next untested question').click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Advanced preview question 1?');
    expect(element.textContent).toContain('1 tested this session');
  });

  it('finishes only after every question is tested and can restart', () => {
    for (let index = 0; index < 5; index += 1) {
      const correctChoice = element.querySelector<HTMLInputElement>('input[type="radio"][value="a"]');
      correctChoice?.click();
      fixture.detectChanges();
      findButton(element, 'Check answer').click();
      fixture.detectChanges();
      findButton(element, index === 4 ? 'Finish preview' : 'Next question').click();
      fixture.detectChanges();
    }

    expect(element.textContent).toContain('All 5 questions tested');
    findButton(element, 'Restart preview').click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Advanced preview question 1?');
  });
});
