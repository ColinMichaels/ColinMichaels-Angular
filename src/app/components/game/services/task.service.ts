import {Injectable, OnDestroy} from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  EMPTY,
  ReplaySubject,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap
} from 'rxjs';
import {StorageService} from '@core-os/storage';
import {LogService} from './log.service';

export interface Task {
  id: string;
  type: 'personal' | 'work' | 'shopping' | 'other';
  status: 'pending' | 'completed' | 'archived';
  dueDate: Date;
  createdAt: Date;
  createdBy: string;
  data: string; // HTML content
}


@Injectable({
  providedIn: 'root'
})
export class TaskService implements OnDestroy {
  private readonly STORAGE_KEY = 'tasks';
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private readonly loaded$ = new ReplaySubject<void>(1);
  private readonly mutations$ = new Subject<(tasks: Task[]) => Task[]>();
  private readonly destroy$ = new Subject<void>();
  tasks$ = this.tasksSubject.asObservable();

  constructor(
    private readonly storageService: StorageService,
    private readonly logger: LogService
  ) {
    this.bindMutationQueue();
    this.loadTasks();
  }

  private loadTasks(): void {
    this.storageService.getItems<Task>(this.STORAGE_KEY).pipe(take(1)).subscribe({
      next: (tasks) => {
        this.tasksSubject.next(tasks ?? []);
        this.finishLoading();
      },
      error: (error) => {
        this.logger.error('Failed to load tasks from Core OS storage.', {error});
        this.finishLoading();
      }
    });
  }

  addTask(task: Omit<Task, 'id' | 'createdAt'>): void {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.queueTaskMutation((tasks) => [...tasks, newTask]);
  }

  updateTask(updatedTask: Task): void {
    this.queueTaskMutation((tasks) => tasks.map((task) => task.id === updatedTask.id ? updatedTask : task));
  }

  deleteTask(taskId: string): void {
    this.queueTaskMutation((tasks) => tasks.filter(task => task.id !== taskId));
  }

  private queueTaskMutation(mutate: (tasks: Task[]) => Task[]): void {
    this.mutations$.next(mutate);
  }

  private bindMutationQueue(): void {
    this.mutations$.pipe(
      concatMap((mutate) => this.loaded$.pipe(
        take(1),
        switchMap(() => {
          const tasks = mutate(this.tasksSubject.value);
          return this.storageService.setItems(this.STORAGE_KEY, tasks).pipe(
            take(1),
            tap(() => this.tasksSubject.next(tasks)),
            catchError((error) => {
              this.logger.error('Failed to persist tasks to Core OS storage.', {error});
              return EMPTY;
            })
          );
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private finishLoading(): void {
    this.loaded$.next();
    this.loaded$.complete();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.mutations$.complete();
    this.tasksSubject.complete();
  }
}
