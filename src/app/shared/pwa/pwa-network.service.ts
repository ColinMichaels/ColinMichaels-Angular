import {DOCUMENT} from '@angular/common';
import {DestroyRef, Injectable, computed, inject, signal} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PwaNetworkService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly onlineState = signal(this.document.defaultView?.navigator.onLine ?? true);

  readonly online = this.onlineState.asReadonly();
  readonly offline = computed(() => !this.onlineState());

  constructor() {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    const markOnline = (): void => this.onlineState.set(true);
    const markOffline = (): void => this.onlineState.set(false);

    browserWindow.addEventListener('online', markOnline);
    browserWindow.addEventListener('offline', markOffline);

    this.destroyRef.onDestroy(() => {
      browserWindow.removeEventListener('online', markOnline);
      browserWindow.removeEventListener('offline', markOffline);
    });
  }
}
