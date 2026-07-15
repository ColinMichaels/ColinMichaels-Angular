import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
  selector: 'app-admin-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="grid gap-5 border-b border-zinc-800 pb-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div class="min-w-0 space-y-3">
        <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">{{ eyebrow() }}</p>
        <h1 class="text-4xl font-semibold text-zinc-50">{{ title() }}</h1>
        <p class="max-w-3xl text-zinc-400">{{ description() }}</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <ng-content select="[adminPageHeaderActions]"></ng-content>
      </div>
    </header>
  `,
})
export class AdminPageHeaderComponent {
  readonly eyebrow = input('CMS');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
