import {DOCUMENT} from '@angular/common';
import {DestroyRef, Injectable, computed, inject, signal} from '@angular/core';

export type PwaShareOutcome = 'shared' | 'dismissed' | 'unsupported' | 'failed';

@Injectable({
  providedIn: 'root',
})
export class PwaNativeControlsService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browserWindow = this.document.defaultView;
  private readonly fullscreenState = signal(Boolean(this.document.fullscreenElement));
  private readonly wakeLockActiveState = signal(false);
  private readonly keepAwakeRequestedState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private wakeLockSentinel: WakeLockSentinel | null = null;

  readonly shareSupported = signal(Boolean(
    this.browserWindow && typeof this.browserWindow.navigator.share === 'function'
  )).asReadonly();
  readonly fullscreenSupported = signal(Boolean(
    this.browserWindow
    && this.document.fullscreenEnabled
    && typeof this.document.documentElement.requestFullscreen === 'function'
  )).asReadonly();
  readonly wakeLockSupported = signal(Boolean(
    this.browserWindow && typeof this.browserWindow.navigator.wakeLock?.request === 'function'
  )).asReadonly();
  readonly fullscreen = this.fullscreenState.asReadonly();
  readonly wakeLockActive = this.wakeLockActiveState.asReadonly();
  readonly keepAwakeRequested = this.keepAwakeRequestedState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly available = computed(() => (
    this.shareSupported() || this.fullscreenSupported() || this.wakeLockSupported()
  ));

  constructor() {
    const browserWindow = this.browserWindow;

    if (!browserWindow) {
      return;
    }

    const handleFullscreenChange = (): void => {
      this.fullscreenState.set(Boolean(this.document.fullscreenElement));
    };
    const handleVisibilityChange = (): void => {
      if (
        this.document.visibilityState === 'visible'
        && this.keepAwakeRequestedState()
        && !this.wakeLockActiveState()
      ) {
        void this.acquireWakeLock();
      }
    };
    const handlePageHide = (): void => {
      this.keepAwakeRequestedState.set(false);
      void this.releaseWakeLock();
    };

    this.document.addEventListener('fullscreenchange', handleFullscreenChange);
    this.document.addEventListener('visibilitychange', handleVisibilityChange);
    browserWindow.addEventListener('pagehide', handlePageHide);

    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('fullscreenchange', handleFullscreenChange);
      this.document.removeEventListener('visibilitychange', handleVisibilityChange);
      browserWindow.removeEventListener('pagehide', handlePageHide);
      this.keepAwakeRequestedState.set(false);
      void this.releaseWakeLock();
    });
  }

  async shareCurrentPage(): Promise<PwaShareOutcome> {
    const browserWindow = this.browserWindow;
    const navigator = browserWindow?.navigator;

    if (!navigator || typeof navigator.share !== 'function') {
      return 'unsupported';
    }

    this.errorState.set(null);
    const description = this.document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content.trim();
    const canonicalUrl = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    const shareData: ShareData = {
      title: this.document.title,
      url: canonicalUrl || browserWindow.location.href,
      ...(description ? {text: description} : {}),
    };

    try {
      if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
        const basicShareData: ShareData = {title: shareData.title, url: shareData.url};

        if (!navigator.canShare(basicShareData)) {
          this.errorState.set('This page cannot be shared by the current browser.');
          return 'unsupported';
        }

        await navigator.share(basicShareData);
      } else {
        await navigator.share(shareData);
      }

      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'dismissed';
      }

      this.errorState.set('The system share menu could not be opened.');
      return 'failed';
    }
  }

  async toggleFullscreen(): Promise<boolean> {
    if (!this.fullscreenSupported()) {
      return false;
    }

    this.errorState.set(null);

    try {
      if (this.document.fullscreenElement) {
        await this.document.exitFullscreen();
      } else {
        await this.document.documentElement.requestFullscreen({navigationUI: 'hide'});
      }

      this.fullscreenState.set(Boolean(this.document.fullscreenElement));
      return true;
    } catch {
      this.errorState.set('Full screen is unavailable in the current browser window.');
      return false;
    }
  }

  async toggleWakeLock(): Promise<boolean> {
    if (!this.wakeLockSupported()) {
      return false;
    }

    this.errorState.set(null);

    if (this.keepAwakeRequestedState()) {
      this.keepAwakeRequestedState.set(false);
      await this.releaseWakeLock();
      return true;
    }

    this.keepAwakeRequestedState.set(true);
    return this.acquireWakeLock();
  }

  private async acquireWakeLock(): Promise<boolean> {
    const wakeLock = this.browserWindow?.navigator.wakeLock;

    if (!wakeLock || this.document.visibilityState !== 'visible') {
      return false;
    }

    try {
      const sentinel = await wakeLock.request('screen');
      this.wakeLockSentinel = sentinel;
      this.wakeLockActiveState.set(true);
      sentinel.addEventListener('release', () => {
        if (this.wakeLockSentinel === sentinel) {
          this.wakeLockSentinel = null;
          this.wakeLockActiveState.set(false);
        }
      });
      return true;
    } catch {
      this.keepAwakeRequestedState.set(false);
      this.wakeLockActiveState.set(false);
      this.errorState.set('The browser did not allow the screen to stay awake.');
      return false;
    }
  }

  private async releaseWakeLock(): Promise<void> {
    const sentinel = this.wakeLockSentinel;
    this.wakeLockSentinel = null;
    this.wakeLockActiveState.set(false);

    if (sentinel && !sentinel.released) {
      await sentinel.release();
    }
  }
}
