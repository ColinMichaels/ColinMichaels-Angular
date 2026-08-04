import {TestBed} from '@angular/core/testing';

import {FirestoreService} from '../../services/firebase/firestore.service';
import {LogService} from './log.service';

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
});
