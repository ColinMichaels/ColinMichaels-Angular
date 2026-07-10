import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {PwaNetworkService} from './pwa-network.service';
import {PwaUpdateService} from './pwa-update.service';

@Component({
  selector: 'app-pwa-status',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pointer-events-none fixed left-3 right-3 z-[100] flex justify-end sm:left-auto sm:w-[24rem]',
  },
  template: `
    @if (updates.unrecoverableReason()) {
      <section
        class="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-950 shadow-xl shadow-slate-950/15 dark:border-red-400/40 dark:bg-red-950 dark:text-red-100"
        aria-live="assertive">
        <p class="min-w-0">Refresh required to restore the app.</p>
        <button type="button"
                class="shrink-0 rounded-md border border-red-400 px-2.5 py-1.5 font-semibold hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-900"
                (click)="reload()">
          Refresh
        </button>
      </section>
    } @else if (updates.updateReady()) {
      <section
        class="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2.5 text-sm text-slate-950 shadow-xl shadow-slate-950/15 dark:border-cyan-300/40 dark:bg-neutral-950 dark:text-zinc-100"
        aria-live="polite">
        <p class="min-w-0">A new version is ready.</p>
        <button type="button"
                class="shrink-0 rounded-md bg-cyan-600 px-2.5 py-1.5 font-semibold text-white hover:bg-cyan-700 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                (click)="reload()">
          Update
        </button>
      </section>
    } @else if (network.offline()) {
      <section
        class="pointer-events-auto flex w-full items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 shadow-xl shadow-slate-950/15 dark:border-amber-300/35 dark:bg-amber-950 dark:text-amber-100"
        role="status" aria-live="polite">
        <span class="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true"></span>
        <p>You're offline. Live content may be unavailable.</p>
      </section>
    }
  `,
  styles: `
    :host {
      top: calc(4.75rem + env(safe-area-inset-top));
    }
  `,
})
export class PwaStatusComponent {
  protected readonly network = inject(PwaNetworkService);
  protected readonly updates = inject(PwaUpdateService);

  protected reload(): void {
    void this.updates.reload();
  }
}
