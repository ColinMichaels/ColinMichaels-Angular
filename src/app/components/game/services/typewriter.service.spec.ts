import {fakeAsync, tick} from '@angular/core/testing';
import {SoundService} from './sound.service';
import {TypewriterService} from './typewriter.service';
import {UserService} from './user.service';

describe('TypewriterService', () => {
  let service: TypewriterService;
  let soundServiceMock: jasmine.SpyObj<Pick<SoundService, 'playVariant'>>;
  let userServiceMock: Pick<UserService, 'user'>;

  beforeEach(() => {
    soundServiceMock = jasmine.createSpyObj<Pick<SoundService, 'playVariant'>>('SoundService', ['playVariant']);
    userServiceMock = {
      user: {
        name: 'Colin',
        mode: 'default',
        score: 0,
        level: 1,
        sections: 0
      }
    };

    service = new TypewriterService(
      soundServiceMock as unknown as SoundService,
      userServiceMock as UserService
    );
  });

  afterEach(() => {
    service.clear();
  });

  it('types lines in queue order and emits completion events for each line', fakeAsync(() => {
    const completedLines: string[] = [];
    const completedAgents: Array<'user' | 'system'> = [];

    service.lineCompleted$.subscribe((event) => {
      completedLines.push(event.text);
      completedAgents.push(event.agent);
    });

    service.enqueueLine({text: 'first', agent: 'system', speed: 1, pauseAfter: 0});
    service.enqueueLine({text: 'second', agent: 'user', speed: 1, pauseAfter: 0});

    tick(50);

    expect(service.typedText$.getValue()).toBe('first\nsecond\n');
    expect(completedLines).toEqual(['first', 'second']);
    expect(completedAgents).toEqual(['system', 'user']);
  }));

  it('uses per-line speed overrides when typing', fakeAsync(() => {
    service.enqueueLine({text: 'ab', agent: 'system', speed: 200, pauseAfter: 0});

    tick(199);
    expect(service.typedText$.getValue()).toBe('');

    tick(1);
    expect(service.typedText$.getValue()).toBe('a');

    tick(200);
    expect(service.typedText$.getValue()).toBe('ab\n');
  }));

  it('cancels pending completion timeout when cleared', fakeAsync(() => {
    const completed = jasmine.createSpy('completed');
    service.lineCompleted$.subscribe(completed);

    service.enqueueLine({text: 'x', agent: 'system', speed: 1, pauseAfter: 500});
    tick(10); // line typed and completion timeout scheduled

    service.clear();
    tick(600);

    expect(service.typedText$.getValue()).toBe('');
    expect(completed).not.toHaveBeenCalled();
  }));

  it('invokes line lifecycle callbacks once per line', fakeAsync(() => {
    const onBegin = jasmine.createSpy('onBegin');
    const onComplete = jasmine.createSpy('onComplete');

    service.enqueueLine({
      text: 'ok',
      agent: 'system',
      speed: 1,
      pauseAfter: 0,
      onBegin,
      onComplete
    });

    tick(20);

    expect(onBegin).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  }));
});
