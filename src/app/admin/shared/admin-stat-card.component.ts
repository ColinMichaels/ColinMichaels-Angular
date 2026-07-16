import {ChangeDetectionStrategy, Component, input} from '@angular/core';

export type AdminStatCardSize = 'compact' | 'large';

@Component({
  selector: 'app-admin-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
  template: `
    <section class="h-full border border-zinc-800 bg-zinc-900 p-4" [attr.aria-label]="label()">
      <p class="text-sm text-zinc-500">{{ label() }}</p>
      <p
        class="mt-2 font-semibold text-zinc-100"
        [class.text-2xl]="size() === 'compact'"
        [class.text-3xl]="size() === 'large'"
        [class.capitalize]="capitalize()"
      >
        {{ value() }}
      </p>
    </section>
  `,
})
export class AdminStatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly size = input<AdminStatCardSize>('large');
  readonly capitalize = input(false);
}
