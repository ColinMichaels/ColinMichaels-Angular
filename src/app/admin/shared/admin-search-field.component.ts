import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

@Component({
  selector: 'app-admin-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
  template: `
    <label class="space-y-2">
      <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">{{ label() }}</span>
      <input
        type="search"
        [value]="value()"
        [placeholder]="placeholder()"
        class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
        (input)="emitValue($event)"
      >
    </label>
  `,
})
export class AdminSearchFieldComponent {
  readonly label = input.required<string>();
  readonly placeholder = input.required<string>();
  readonly value = input('');
  readonly valueChange = output<string>();

  protected emitValue(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement | null)?.value ?? '');
  }
}
