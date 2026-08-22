import {TestBed} from '@angular/core/testing';
import {of, Subject, throwError} from 'rxjs';

import {StorageService} from '@core-os/storage';
import {LogService} from './log.service';
import {Task, TaskService} from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let storage: jasmine.SpyObj<StorageService>;
  let logger: jasmine.SpyObj<LogService>;

  const task = {
    type: 'work' as const,
    status: 'pending' as const,
    dueDate: new Date('2026-08-23T00:00:00.000Z'),
    createdBy: 'Colin',
    data: 'Ship the storage migration'
  };

  beforeEach(() => {
    storage = jasmine.createSpyObj<StorageService>('StorageService', ['getItems', 'setItems']);
    storage.getItems.and.returnValue(of([]));
    storage.setItems.and.returnValue(of(undefined));
    logger = jasmine.createSpyObj<LogService>('LogService', ['error']);

    TestBed.configureTestingModule({
      providers: [
        {provide: StorageService, useValue: storage},
        {provide: LogService, useValue: logger}
      ]
    });
    service = TestBed.inject(TaskService);
  });

  it('is created after loading persisted tasks once', () => {
    expect(service).toBeTruthy();
    expect(storage.getItems).toHaveBeenCalledOnceWith('tasks');
  });

  it('subscribes to persistence before publishing a new task', () => {
    service.addTask(task);

    expect(storage.setItems).toHaveBeenCalled();
    let persistedTasks: unknown[] | undefined;
    service.tasks$.subscribe((tasks) => {
      persistedTasks = tasks;
    }).unsubscribe();
    expect(persistedTasks?.length).toBe(1);
  });

  it('keeps the prior task state and logs when persistence fails', () => {
    storage.setItems.and.returnValue(throwError(() => new Error('quota exceeded')));

    service.addTask(task);

    let currentTasks: Task[] = [];
    service.tasks$.subscribe((tasks) => {
      currentTasks = tasks;
    }).unsubscribe();
    expect(currentTasks).toEqual([]);
    expect(logger.error).toHaveBeenCalled();
  });

  it('serializes overlapping mutations against the latest persisted state', () => {
    const firstWrite = new Subject<void>();
    const secondWrite = new Subject<void>();
    storage.setItems.and.returnValues(firstWrite.asObservable(), secondWrite.asObservable());

    service.addTask(task);
    service.addTask({...task, data: 'Verify the queued write'});

    expect(storage.setItems).toHaveBeenCalledTimes(1);

    firstWrite.next();
    firstWrite.complete();

    expect(storage.setItems).toHaveBeenCalledTimes(2);
    const secondSnapshot = storage.setItems.calls.argsFor(1)[1] as Task[];
    expect(secondSnapshot.map((item) => item.data)).toEqual([
      'Ship the storage migration',
      'Verify the queued write'
    ]);

    secondWrite.next();
    secondWrite.complete();
  });
});
