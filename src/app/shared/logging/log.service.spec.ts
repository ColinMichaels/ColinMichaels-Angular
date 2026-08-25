import {TestBed} from '@angular/core/testing';

import {FirestoreService} from '../../services/firebase/firestore.service';
import {LOCAL_LOG_BUFFER_CAPACITY, LOCAL_LOG_MESSAGE_CHARACTER_LIMIT, LogService} from './log.service';

describe('LogService', () => {
  it('keeps application and Core OS logs local without writing to Firestore', () => {
    const firestore = jasmine.createSpyObj<FirestoreService>('FirestoreService', ['saveLogEntry']);
    const consoleWarn = spyOn(console, 'warn');

    TestBed.configureTestingModule({
      providers: [
        LogService,
        {provide: FirestoreService, useValue: firestore},
      ],
    });

    const service = TestBed.inject(LogService);
    service.warn('Reader session unavailable', {source: 'auth'});

    expect(service.logs.length).toBe(1);
    expect(service.logs[0].message).toBe('Reader session unavailable (source=auth)');
    expect(firestore.saveLogEntry).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith(
      '[WARN]',
      'Reader session unavailable (source=auth)'
    );
  });

  it('retains only the newest bounded window in chronological order', () => {
    spyOn(console, 'log');
    TestBed.configureTestingModule({providers: [LogService]});
    const service = TestBed.inject(LogService);
    const overflowCount = 7;

    for (let index = 0; index < LOCAL_LOG_BUFFER_CAPACITY + overflowCount; index += 1) {
      service.debug(`entry-${index}`);
    }

    expect(service.logs.length).toBe(LOCAL_LOG_BUFFER_CAPACITY);
    expect(service.logs[0].message).toBe(`entry-${overflowCount}`);
    expect(service.logs.at(-1)?.message)
      .toBe(`entry-${LOCAL_LOG_BUFFER_CAPACITY + overflowCount - 1}`);
    expect(service.getLogsPage(0, 3).map(entry => entry.message)).toEqual([
      `entry-${overflowCount}`,
      `entry-${overflowCount + 1}`,
      `entry-${overflowCount + 2}`,
    ]);
  });

  it('releases the bounded history when logs are cleared', () => {
    spyOn(console, 'info');
    TestBed.configureTestingModule({providers: [LogService]});
    const service = TestBed.inject(LogService);
    const observedLengths: number[] = [];
    const subscription = service.logs$.subscribe(logs => observedLengths.push(logs.length));

    service.info('one');
    service.info('two');
    service.clear();

    expect(service.logs).toEqual([]);
    expect(observedLengths).toEqual([0, 1, 2, 0]);
    subscription.unsubscribe();
  });

  it('stores bounded text instead of retaining caller-owned object graphs', () => {
    spyOn(console, 'info');
    TestBed.configureTestingModule({providers: [LogService]});
    const service = TestBed.inject(LogService);
    const largeMessage = 'x'.repeat(LOCAL_LOG_MESSAGE_CHARACTER_LIMIT + 500);

    service.info(largeMessage);
    service.info({largeMessage});
    service.info('bounded params', {largeMessage});

    expect(typeof service.logs[0].message).toBe('string');
    expect((service.logs[0].message as string).length).toBe(LOCAL_LOG_MESSAGE_CHARACTER_LIMIT);
    expect(service.logs[1].message).toBe('[object Object]');
    expect(service.logs[2].message.length).toBe(LOCAL_LOG_MESSAGE_CHARACTER_LIMIT);
    expect(service.logs[2].message.startsWith('bounded params (largeMessage=')).toBeTrue();
  });
});
