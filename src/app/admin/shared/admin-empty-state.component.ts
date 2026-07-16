import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
  selector: 'app-admin-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
  template: `
    <div
      class="border border-dashed border-zinc-700 p-4 text-sm leading-6 text-zinc-400"
      role="status"
      aria-live="polite"
    >
      {{ message() }}
    </div>
  `,
})
export class AdminEmptyStateComponent {
  readonly message = input.required<string>();
}
