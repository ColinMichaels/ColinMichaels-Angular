import {Component, DestroyRef, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Task, TaskService} from '../../services/task.service';
import {catchError, map, startWith} from 'rxjs/operators';
import {BehaviorSubject, combineLatest, debounceTime, Observable, of} from 'rxjs';
import {TooltipDirective} from '@core-os/tooltip';
import {TimeAgoPipe} from '../../../../pipes/time-ago.pipe';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArchive, faCheck, faPlus, faRedo, faTrash} from '@fortawesome/free-solid-svg-icons';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {LogService} from '../../services/log.service';

type TaskStatus = 'all' | Task['status'];

@Component({
  selector: 'app-task-app',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TooltipDirective, TimeAgoPipe, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './task-app.component.html',
})
export class TaskAppComponent implements OnInit {
  tasks$: Observable<Task[]>;
  filteredTasks$: Observable<Task[]> | undefined;

  // In the component class
  taskForm: FormGroup;
  showNewTaskForm = true;

  // Update the statusFilters definition
  statusFilters = ['all', 'pending', 'completed', 'archived'] as const;
  currentFilter: TaskStatus = 'all';

  // Initialize the filter subjects with startWith
  private filterSubject = new BehaviorSubject<TaskStatus>('all');
  searchControl = new FormControl('', {nonNullable: true});
  typeFilter = new FormControl('all', {nonNullable: true});

  filterBy!: FormControl

  constructor(
    private readonly taskService: TaskService,
    private readonly fb: FormBuilder,
    private readonly logger: LogService,
    private readonly destroyRef: DestroyRef
  ) {
    this.taskForm = this.fb.group({
      type: ['personal', Validators.required],
      data: ['', Validators.required],
      dueDate: [this.defaultDateString, Validators.required],
      createdBy: ['user', Validators.required]
    });
    this.filterBy = new FormControl('');

    this.tasks$ = this.taskService.tasks$.pipe(
      takeUntilDestroyed(this.destroyRef)
    );

  }

  get defaultDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.filteredTasks$ = combineLatest([
      this.tasks$,
      this.filterSubject,
      this.searchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300)
      ),
      this.typeFilter.valueChanges.pipe(
        startWith('all')
      )
    ]).pipe(
      takeUntilDestroyed(this.destroyRef),
      map(([tasks, statusFilter, searchTerm, typeFilter]) => {
        return tasks.filter(task => {
          // Null safety checks
          if (!task?.data || !task?.type) return false;

          // Combined filters
          const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
          const matchesType = typeFilter === 'all' || task.type === typeFilter;
          const matchesSearch = !searchTerm || (
            task.data.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.type.toLowerCase().includes(searchTerm.toLowerCase())
          );
          return matchesStatus && matchesType && matchesSearch;
        });
      }),
      catchError(error => {
        this.logger.error(`Error in filter stream: ${error?.message ?? error}`);
        return of([]);
      }),
      map(tasks => this.sortTasks(tasks)),
      catchError(error => {
        this.logger.error(`Error filtering tasks: ${error?.message ?? error}`);
        return of([]);
      })
    );
  }

  addNewTask(): void {
    if (this.taskForm.valid) {
      this.taskService.addTask({
        ...this.taskForm.value,
        status: 'pending'
      });
      this.taskForm.reset({
        type: 'personal',
        data: '',
        dueDate: this.defaultDateString,
        createdBy: 'user'
      });
      this.showNewTaskForm = false;
    }
  }

  updateTaskStatus(task: Task, status: Task['status']): void {
    this.taskService.updateTask({...task, status});
  }

  deleteTask(taskId: string): void {
    this.taskService.deleteTask(taskId);
  }

  setStatusFilter(filter: TaskStatus): void {
    this.currentFilter = filter;
    this.filterSubject.next(filter);
  }


  // Optional: Add sorting functionality
  sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      // Sort by status priority (pending first, then completed, then archived)
      const statusOrder: Record<Task['status'], number> = {
        pending: 0,
        completed: 1,
        archived: 2
      };

      if (a.status !== b.status) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // Then sort by due date
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }

  protected readonly faCheck = faCheck;
  protected readonly faTrash = faTrash;
  protected readonly faRedo = faRedo;
  protected readonly faArchive = faArchive;
  protected readonly faPlus = faPlus;
}
