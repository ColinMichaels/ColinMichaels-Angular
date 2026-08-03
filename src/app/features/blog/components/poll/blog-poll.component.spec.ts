import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {User} from 'firebase/auth';
import {BehaviorSubject} from 'rxjs';

import {AuthService} from '../../../../services/auth.service';
import {BlogContentBlock} from '../../models/blog-post.model';
import {BlogPollService} from '../../services/blog-poll.service';
import {BlogPollComponent} from './blog-poll.component';

const pollBlock: BlogContentBlock = {
  id: 'poll-1',
  type: 'poll',
  data: {
    question: 'Which topic should I break down next?',
    description: 'Choose one answer. You can change your vote later.',
    pollOptions: [
      {id: 'ai', label: 'Building safer AI workflows'},
      {id: 'angular', label: 'Angular performance tuning'},
    ],
    pollResultsVisibility: 'afterVote',
  },
};

describe('BlogPollComponent', () => {
  let fixture: ComponentFixture<BlogPollComponent>;
  let authState$: BehaviorSubject<User | null>;
  let pollService: {
    getResults: jasmine.Spy;
    submitVote: jasmine.Spy;
  };
  const user = {uid: 'reader-1'} as User;

  function createComponent(block = pollBlock): ComponentFixture<BlogPollComponent> {
    const componentFixture = TestBed.createComponent(BlogPollComponent);
    componentFixture.componentRef.setInput('block', block);
    componentFixture.componentRef.setInput('postId', 'post-1');
    componentFixture.componentRef.setInput('postSlug', 'sample-post');
    componentFixture.detectChanges();
    return componentFixture;
  }

  beforeEach(async () => {
    authState$ = new BehaviorSubject<User | null>(null);
    pollService = {
      getResults: jasmine.createSpy('getResults').and.resolveTo({
        pollId: 'poll-1',
        selectedOptionId: null,
        resultsVisible: false,
        totalResponses: 0,
        options: [],
      }),
      submitVote: jasmine.createSpy('submitVote').and.resolveTo({
        pollId: 'poll-1',
        selectedOptionId: 'ai',
        resultsVisible: true,
        totalResponses: 4,
        options: [
          {id: 'ai', label: 'Building safer AI workflows', count: 3, percent: 75},
          {id: 'angular', label: 'Angular performance tuning', count: 1, percent: 25},
        ],
      }),
    };

    await TestBed.configureTestingModule({
      imports: [BlogPollComponent, RouterTestingModule],
      providers: [
        {provide: AuthService, useValue: {user$: authState$.asObservable()}},
        {provide: BlogPollService, useValue: pollService},
      ],
    }).compileComponents();
  });

  it('shows an accessible sign-in voting form to signed-out readers', () => {
    fixture = createComponent();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('input[type="radio"]').length).toBe(2);
    expect(element.textContent).toContain('Which topic should I break down next?');
    expect(element.textContent).toContain('Sign in to vote');
    expect(element.querySelector('a')?.getAttribute('href')).toContain('redirectUrl=%2Fblog%2Fsample-post');
    expect(pollService.getResults).not.toHaveBeenCalled();
  });

  it('submits a signed-in vote and renders direct result labels', async () => {
    authState$.next(user);
    fixture = createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[value="ai"]') as HTMLInputElement;
    input.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(pollService.submitVote).toHaveBeenCalledWith({
      postId: 'post-1',
      postSlug: 'sample-post',
      pollId: 'poll-1',
      optionId: 'ai',
    });
    expect(fixture.nativeElement.textContent).toContain('75%');
    expect(fixture.nativeElement.textContent).toContain('3 votes');
    expect(fixture.nativeElement.textContent).toContain('Your vote');
    expect(fixture.nativeElement.textContent).toContain('4 responses');
  });

  it('loads always-visible results for signed-out readers', async () => {
    pollService.getResults.and.resolveTo({
      pollId: 'poll-1',
      selectedOptionId: null,
      resultsVisible: true,
      totalResponses: 1,
      options: [
        {id: 'ai', label: 'Building safer AI workflows', count: 1, percent: 100},
        {id: 'angular', label: 'Angular performance tuning', count: 0, percent: 0},
      ],
    });
    fixture = createComponent({
      ...pollBlock,
      data: {...pollBlock.data, pollResultsVisibility: 'always'},
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(pollService.getResults).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('100%');
    expect(fixture.nativeElement.textContent).toContain('1 response');
  });

  it('confirms a private-result vote without exposing aggregate counts', async () => {
    authState$.next(user);
    pollService.submitVote.and.resolveTo({
      pollId: 'poll-1',
      selectedOptionId: 'ai',
      resultsVisible: false,
      totalResponses: 0,
      options: [],
    });
    fixture = createComponent({
      ...pollBlock,
      data: {...pollBlock.data, pollResultsVisibility: 'hidden'},
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[value="ai"]') as HTMLInputElement;
    input.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Results are private for this poll.');
    expect(fixture.nativeElement.textContent).not.toContain('responses');
  });

  it('uses the compact heading and panel treatment in a reading rail', () => {
    fixture = createComponent();
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('section');
    const heading = fixture.nativeElement.querySelector('h3');

    expect(panel.classList).toContain('p-4');
    expect(heading.classList).toContain('text-lg');
    expect(heading.classList).not.toContain('sm:text-2xl');
  });

  it('keeps production-preview polls visible but prevents result reads and vote writes', async () => {
    authState$.next(user);
    fixture = TestBed.createComponent(BlogPollComponent);
    fixture.componentRef.setInput('block', pollBlock);
    fixture.componentRef.setInput('postId', 'post-1');
    fixture.componentRef.setInput('postSlug', 'sample-post');
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const fieldset = element.querySelector<HTMLFieldSetElement>('fieldset');
    const form = element.querySelector<HTMLFormElement>('form');

    expect(fieldset?.disabled).toBeTrue();
    expect(element.textContent).toContain('Production preview only. Voting is disabled.');
    form?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(pollService.getResults).not.toHaveBeenCalled();
    expect(pollService.submitVote).not.toHaveBeenCalled();
  });
});
