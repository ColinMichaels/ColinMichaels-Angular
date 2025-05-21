import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {StorageService} from './storage.service';

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
export class TaskService {
  private readonly STORAGE_KEY = 'tasks';
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasksSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadTasks();
  }

  private loadTasks(): void {
    this.storageService.getItems<Task>(this.STORAGE_KEY).subscribe(tasks => {
      this.tasksSubject.next(tasks || []);
    });
  }

  addTask(task: Omit<Task, 'id' | 'createdAt'>): void {
    const tasks = this.tasksSubject.value;
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    const updatedTasks = [...tasks, newTask];
    this.storageService.setItems(this.STORAGE_KEY, updatedTasks);
    this.tasksSubject.next(updatedTasks);
  }

  updateTask(updatedTask: Task): void {
    const tasks = this.tasksSubject.value;
    const index = tasks.findIndex(task => task.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = updatedTask;
      this.storageService.setItems(this.STORAGE_KEY, tasks);
      this.tasksSubject.next(tasks);
    }
  }

  deleteTask(taskId: string): void {
    const tasks = this.tasksSubject.value.filter(task => task.id !== taskId);
    this.storageService.setItems(this.STORAGE_KEY, tasks);
    this.tasksSubject.next(tasks);
  }
}
