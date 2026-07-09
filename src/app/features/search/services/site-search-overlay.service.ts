import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SiteSearchOverlayService {
  private readonly isOpenSignal = signal(false);

  readonly isOpen = this.isOpenSignal.asReadonly();

  open(): void {
    this.isOpenSignal.set(true);
  }

  close(): void {
    this.isOpenSignal.set(false);
  }
}
