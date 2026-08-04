import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {PwaInstallService} from './pwa-install.service';

@Component({
  selector: 'app-pwa-install-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (install.shouldOfferInstall()) {
      <div class="border-t border-slate-200 pt-1.5 dark:border-zinc-800">
        <button
          type="button"
          class="site-menu-link w-full text-left"
          [attr.aria-expanded]="install.manualInstructionsVisible()"
          aria-controls="pwa-install-instructions"
          (click)="requestInstall()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v11"></path>
            <path d="m8 10 4 4 4-4"></path>
            <path d="M5 17v3h14v-3"></path>
          </svg>
          <span class="min-w-0">
            <span class="block">Install app</span>
            <span class="block text-xs font-normal text-slate-500 dark:text-zinc-500">
              {{ install.canPrompt() ? 'Add to this device' : 'View device instructions' }}
            </span>
          </span>
        </button>

        @if (install.manualInstructionsVisible()) {
          <div
            id="pwa-install-instructions"
            class="mx-2 mb-1 mt-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs leading-5 text-slate-700 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-zinc-300"
            role="status"
          >
            On iPhone or iPad, open Share and choose Add to Home Screen. In other browsers, use the Install or Add to
            Home Screen command in the browser menu.
          </div>
        }
      </div>
    }
  `,
})
export class PwaInstallControlComponent {
  protected readonly install = inject(PwaInstallService);

  protected requestInstall(): void {
    void this.install.install();
  }
}
