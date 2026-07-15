import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
  selector: 'app-admin-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
  template: `
    <section
      class="border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100"
      role="alert"
      aria-live="assertive"
    >
      {{ message() }}
    </section>
  `,
})
export class AdminAlertComponent {
  readonly message = input.required<string>();
}
