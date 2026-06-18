import {Injectable, signal} from '@angular/core';

export interface CmsToast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

@Injectable({providedIn: 'root'})
export class CmsToastService {
  readonly toasts = signal<CmsToast[]>([]);

  private nextId = 0;

  success(message: string, durationMs = 4000): void {
    const id = this.nextId++;
    this.toasts.update(list => [...list, {id, type: 'success', message}]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  error(message: string): void {
    const id = this.nextId++;
    this.toasts.update(list => [...list, {id, type: 'error', message}]);
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
