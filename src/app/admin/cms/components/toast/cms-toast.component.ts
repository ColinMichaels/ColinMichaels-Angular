import {Component, ChangeDetectionStrategy, inject} from '@angular/core';

import {CmsToastService} from '../../services/cms-toast.service';

@Component({
  selector: 'app-cms-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed bottom-6 right-6 z-50 flex w-80 flex-col-reverse gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex items-start gap-3 border px-4 py-3 text-sm shadow-lg pointer-events-auto"
          [class.border-emerald-500]="toast.type === 'success'"
          [class.bg-emerald-950]="toast.type === 'success'"
          [class.text-emerald-100]="toast.type === 'success'"
          [class.border-red-500]="toast.type === 'error'"
          [class.bg-red-950]="toast.type === 'error'"
          [class.text-red-100]="toast.type === 'error'"
          role="alert"
        >
          <span class="mt-px shrink-0 text-base leading-none">
            {{ toast.type === 'success' ? '✓' : '✕' }}
          </span>
          <p class="min-w-0 flex-1 leading-5">{{ toast.message }}</p>
          <button
            type="button"
            class="shrink-0 opacity-60 hover:opacity-100 transition-opacity leading-none"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >×
          </button>
        </div>
      }
    </div>
  `,
})
export class CmsToastContainerComponent {
  protected readonly toastService = inject(CmsToastService);
}
