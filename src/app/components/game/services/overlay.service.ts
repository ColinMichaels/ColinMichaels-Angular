import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface OverlayState {
  imagePath: string;
  visible: boolean;
  zIndex?: number;
  opacity?: number;
  transition?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OverlayService {
  private defaultState: OverlayState = {
    imagePath: '',
    visible: false,
    zIndex: 9999,
    opacity: 1,
    transition: 'opacity 0.3s ease-in-out',
  };

  private overlayState$ = new BehaviorSubject<OverlayState>(this.defaultState);

  get state$() {
    return this.overlayState$.asObservable();
  }

  showOverlay(options: Partial<OverlayState>) {
    this.overlayState$.next({
      ...this.defaultState,
      ...options,
      visible: true,
    });
  }

  hideOverlay() {
    this.overlayState$.next({
      ...this.overlayState$.value,
      visible: false,
    });
  }

  showTemporaryOverlay(options: Partial<OverlayState>, durationMs: number = 1500) {
    this.showOverlay(options);
    setTimeout(() => this.hideOverlay(), durationMs);
  }
}
