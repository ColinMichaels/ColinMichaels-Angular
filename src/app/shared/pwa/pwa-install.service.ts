import {DOCUMENT} from '@angular/common';
import {DestroyRef, Injectable, computed, inject, signal} from '@angular/core';

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'manual';

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;

  prompt(): Promise<void>;
}

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class PwaInstallService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browserWindow = this.document.defaultView;
  private readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
  private readonly standaloneState = signal(this.detectStandaloneMode());
  private readonly manualInstructionsState = signal(false);

  readonly canPrompt = computed(() => this.deferredPrompt() !== null);
  readonly isStandalone = this.standaloneState.asReadonly();
  readonly manualInstructionsVisible = this.manualInstructionsState.asReadonly();
  readonly shouldOfferInstall = computed(() => Boolean(this.browserWindow) && !this.standaloneState());

  constructor() {
    const browserWindow = this.browserWindow;

    if (!browserWindow) {
      return;
    }

    const standaloneQuery = typeof browserWindow.matchMedia === 'function'
      ? browserWindow.matchMedia('(display-mode: standalone)')
      : null;
    const handleDisplayModeChange = (): void => {
      this.standaloneState.set(this.detectStandaloneMode());
    };
    const handleInstallPrompt = (event: Event): void => {
      const installPrompt = event as BeforeInstallPromptEvent;
      installPrompt.preventDefault();
      this.deferredPrompt.set(installPrompt);
      this.manualInstructionsState.set(false);
    };
    const handleInstalled = (): void => {
      this.deferredPrompt.set(null);
      this.manualInstructionsState.set(false);
      this.standaloneState.set(true);
    };

    browserWindow.addEventListener('beforeinstallprompt', handleInstallPrompt);
    browserWindow.addEventListener('appinstalled', handleInstalled);
    standaloneQuery?.addEventListener('change', handleDisplayModeChange);

    this.destroyRef.onDestroy(() => {
      browserWindow.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      browserWindow.removeEventListener('appinstalled', handleInstalled);
      standaloneQuery?.removeEventListener('change', handleDisplayModeChange);
    });
  }

  async install(): Promise<PwaInstallOutcome> {
    const installPrompt = this.deferredPrompt();

    if (!installPrompt) {
      this.manualInstructionsState.update(isVisible => !isVisible);
      return 'manual';
    }

    this.manualInstructionsState.set(false);
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    this.deferredPrompt.set(null);

    return choice.outcome;
  }

  dismissManualInstructions(): void {
    this.manualInstructionsState.set(false);
  }

  private detectStandaloneMode(): boolean {
    const browserWindow = this.browserWindow;

    if (!browserWindow) {
      return false;
    }

    const navigator = browserWindow.navigator as StandaloneNavigator;
    return navigator.standalone === true
      || (typeof browserWindow.matchMedia === 'function'
        && browserWindow.matchMedia('(display-mode: standalone)').matches);
  }
}
