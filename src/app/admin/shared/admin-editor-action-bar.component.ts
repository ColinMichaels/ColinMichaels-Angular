import {NgClass} from '@angular/common';
import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
  selector: 'app-admin-editor-action-bar',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
  template: `
    <footer
      class="flex flex-wrap items-center justify-between gap-3 border-zinc-800"
      [ngClass]="panel() ? 'border bg-zinc-900/70 p-5' : 'border-t pt-5'"
      [attr.aria-busy]="busy()"
    >
      <p class="text-sm text-zinc-500" role="status" aria-live="polite">{{ status() }}</p>
      <div class="flex flex-wrap gap-3">
        <ng-content select="[adminEditorActions]"></ng-content>
      </div>
    </footer>
  `,
})
export class AdminEditorActionBarComponent {
  readonly status = input.required<string>();
  readonly busy = input(false);
  readonly panel = input(false);
}
