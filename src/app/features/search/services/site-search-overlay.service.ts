import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SiteSearchOverlayService {
  private readonly isOpenSignal = signal(false);
  private readonly focusRequestSignal = signal(0);

  readonly isOpen = this.isOpenSignal.asReadonly();
  readonly focusRequest = this.focusRequestSignal.asReadonly();

  open(): void {
    this.isOpenSignal.set(true);
  }

  openAndFocus(): void {
    this.isOpenSignal.set(true);
    this.focusRequestSignal.update(value => value + 1);
  }

  close(): void {
    this.isOpenSignal.set(false);
  }
}
