import {ChangeDetectionStrategy, Component, Input, computed, inject} from '@angular/core';

import {PwaInstallService} from './pwa-install.service';
import {PwaNativeControlsService} from './pwa-native-controls.service';
import {PwaPushService} from './pwa-push.service';
import {PwaStorageService} from './pwa-storage.service';

@Component({
  selector: 'app-pwa-native-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible() || surface === 'profile') {
      <section class="border-slate-200 px-1 pt-2 dark:border-zinc-800"
               [class.border-t]="surface === 'menu'"
               aria-labelledby="pwa-app-controls-title">
        <div class="flex items-center justify-between gap-2 px-2 pb-1.5">
          <h2 id="pwa-app-controls-title"
              class="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">
            App controls
          </h2>
          @if (install.isStandalone()) {
            <span
              class="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-emerald-700 dark:text-emerald-300">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
              Installed
            </span>
          }
        </div>

        @if (!visible()) {
          <p class="rounded-lg border border-dashed border-zinc-700 px-3 py-4 text-xs leading-5 text-zinc-400">
            This browser does not expose additional app or device controls.
          </p>
        }

        <div class="grid grid-cols-2 gap-1">
          @if (nativeControls.shareSupported()) {
            <button type="button" class="pwa-native-control" (click)="sharePage()">
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-[1.125rem] w-[1.125rem]" fill="none"
                   stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="2.5"></circle>
                <circle cx="6" cy="12" r="2.5"></circle>
                <circle cx="18" cy="19" r="2.5"></circle>
                <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"></path>
              </svg>
              <span>Share page</span>
            </button>
          }

          @if (nativeControls.fullscreenSupported()) {
            <button
              type="button"
              class="pwa-native-control"
              [attr.aria-pressed]="nativeControls.fullscreen()"
              (click)="toggleFullscreen()"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-[1.125rem] w-[1.125rem]" fill="none"
                   stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                @if (nativeControls.fullscreen()) {
                  <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"></path>
                } @else {
                  <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"></path>
                }
              </svg>
              <span>{{ nativeControls.fullscreen() ? 'Exit full screen' : 'Full screen' }}</span>
            </button>
          }

          @if (nativeControls.wakeLockSupported()) {
            <button
              type="button"
              class="pwa-native-control"
              [attr.aria-pressed]="nativeControls.keepAwakeRequested()"
              (click)="toggleWakeLock()"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-[1.125rem] w-[1.125rem]" fill="none"
                   stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18h6M10 21h4"></path>
                <path d="M8.2 14.5A6 6 0 1 1 15.8 14.5C14.7 15.2 14 16 14 17h-4c0-1-.7-1.8-1.8-2.5Z"></path>
              </svg>
              <span>{{ nativeControls.keepAwakeRequested() ? 'Allow sleep' : 'Keep awake' }}</span>
            </button>
          }

          @if (storage.persistenceSupported()) {
            <button
              type="button"
              class="pwa-native-control"
              [disabled]="storage.busy() || storage.persisted()"
              (click)="protectStorage()"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-[1.125rem] w-[1.125rem]" fill="none"
                   stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
              <span>{{ storage.persisted() ? 'Storage protected' : (storage.busy() ? 'Checking…' : 'Protect storage') }}</span>
            </button>
          }

          @if (push.available()) {
            <button
              type="button"
              class="pwa-native-control"
              [attr.aria-pressed]="push.subscribed()"
              [disabled]="push.busy()"
              (click)="toggleNotifications()"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-[1.125rem] w-[1.125rem]" fill="none"
                   stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                <path d="M10 21h4"></path>
              </svg>
              <span>{{ notificationLabel() }}</span>
            </button>
          }
        </div>

        @if (storageSummary()) {
          <p class="px-2 pb-0.5 pt-1.5 text-[0.7rem] leading-4 text-slate-500 dark:text-zinc-500">
            {{ storageSummary() }}
          </p>
        }

        @if (nativeControls.error()) {
          <p class="px-2 pb-1 pt-1 text-[0.7rem] leading-4 text-slate-600 dark:text-zinc-400" role="status"
             aria-live="polite">
            {{ nativeControls.error() }}
          </p>
        }

        @if (storage.statusMessage()) {
          <p class="px-2 pb-1 pt-1 text-[0.7rem] leading-4 text-slate-600 dark:text-zinc-400" role="status"
             aria-live="polite">
            {{ storage.statusMessage() }}
          </p>
        }

        @if (push.statusMessage()) {
          <p class="px-2 pb-1 pt-1 text-[0.7rem] leading-4 text-slate-600 dark:text-zinc-400" role="status"
             aria-live="polite">
            {{ push.statusMessage() }}
          </p>
        }
      </section>
    }
  `,
  styles: `
    .pwa-native-control {
      align-items: center;
      border: 1px solid transparent;
      border-radius: 0.5rem;
      color: rgb(51 65 85);
      display: inline-flex;
      font-size: 0.75rem;
      font-weight: 650;
      gap: 0.5rem;
      justify-content: flex-start;
      min-height: 2.75rem;
      padding: 0.5rem;
      text-align: left;
      transition: background-color 150ms, border-color 150ms, color 150ms;
    }

    .pwa-native-control:hover {
      background: rgb(236 254 255);
      border-color: rgb(103 232 249);
      color: rgb(14 116 144);
    }

    .pwa-native-control:focus-visible {
      outline: 2px solid rgb(6 182 212);
      outline-offset: 1px;
    }

    .pwa-native-control[aria-pressed='true'] {
      background: rgb(207 250 254);
      border-color: rgb(34 211 238);
      color: rgb(21 94 117);
    }

    .pwa-native-control:disabled {
      cursor: default;
      opacity: 0.72;
    }

    :host-context(.dark) .pwa-native-control {
      color: rgb(212 212 216);
    }

    :host-context(.dark) .pwa-native-control:hover,
    :host-context(.dark) .pwa-native-control[aria-pressed='true'] {
      background: rgb(24 24 27);
      border-color: rgb(103 232 249 / 0.55);
      color: rgb(165 243 252);
    }
  `,
})
export class PwaNativeControlsComponent {
  @Input() surface: 'menu' | 'profile' = 'menu';
  protected readonly install = inject(PwaInstallService);
  protected readonly nativeControls = inject(PwaNativeControlsService);
  protected readonly push = inject(PwaPushService);
  protected readonly storage = inject(PwaStorageService);
  protected readonly visible = computed(() => (
    this.install.isStandalone() || this.nativeControls.available() || this.storage.available() || this.push.available()
  ));
  protected readonly notificationLabel = computed(() => {
    if (this.push.busy()) {
      return 'Updating alerts…';
    }

    if (this.push.subscribed()) {
      return 'New-post alerts on';
    }

    if (!this.push.signedIn()) {
      return 'Sign in for alerts';
    }

    if (this.push.permission() === 'denied') {
      return 'Alerts blocked';
    }

    return 'Enable new-post alerts';
  });
  protected readonly storageSummary = computed(() => {
    const usage = this.storage.usage();
    const quota = this.storage.quota();

    if (usage === null || quota === null) {
      return null;
    }

    return `App storage: ${this.formatBytes(usage)} of ${this.formatBytes(quota)} used`;
  });

  protected sharePage(): void {
    void this.nativeControls.shareCurrentPage();
  }

  protected toggleFullscreen(): void {
    void this.nativeControls.toggleFullscreen();
  }

  protected toggleWakeLock(): void {
    void this.nativeControls.toggleWakeLock();
  }

  protected protectStorage(): void {
    void this.storage.requestPersistence();
  }

  protected toggleNotifications(): void {
    void this.push.toggleSubscription();
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)) - 1, units.length - 1);
    const value = bytes / Math.pow(1024, unitIndex + 1);

    return `${new Intl.NumberFormat(undefined, {maximumFractionDigits: value >= 10 ? 0 : 1}).format(value)} ${units[unitIndex]}`;
  }
}
