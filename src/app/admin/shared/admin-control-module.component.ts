import {ChangeDetectionStrategy, Component, model, input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown} from '@fortawesome/free-solid-svg-icons';

let controlModuleId = 0;

@Component({
  selector: 'app-admin-control-module',
  imports: [FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        class="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-zinc-900 focus-visible:bg-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-400"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="contentId"
        (click)="expanded.set(!expanded())"
      >
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold text-zinc-100">{{ title() }}</span>
          @if (summary()) {
            <span class="mt-0.5 block truncate text-xs text-zinc-500">{{ summary() }}</span>
          }
        </span>
        <span class="flex shrink-0 items-center gap-2">
          <ng-content select="[adminControlModuleStatus]"></ng-content>
          <fa-icon
            [icon]="faChevronDown"
            class="text-xs text-zinc-500 transition-transform duration-200"
            [class.rotate-180]="expanded()"
            aria-hidden="true"
          ></fa-icon>
        </span>
      </button>

      <div
        [id]="contentId"
        class="border-t border-zinc-800 p-3"
        [hidden]="!expanded()"
      >
        @if (description()) {
          <p class="mb-3 text-xs leading-5 text-zinc-500">{{ description() }}</p>
        }
        <ng-content></ng-content>
      </div>
    </section>
  `,
})
export class AdminControlModuleComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly summary = input('');
  readonly expanded = model(false);

  protected readonly contentId = `admin-control-module-${++controlModuleId}`;
  protected readonly faChevronDown = faChevronDown;
}
