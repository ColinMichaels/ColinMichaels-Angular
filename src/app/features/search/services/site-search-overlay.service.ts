import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SiteSearchOverlayService {
  private readonly isOpenSignal = signal(false);
  private readonly focusRequestSignal = signal(0);
  private readonly attentionRequestSignal = signal(0);
  private readonly querySignal = signal('');

  readonly isOpen = this.isOpenSignal.asReadonly();
  readonly focusRequest = this.focusRequestSignal.asReadonly();
  readonly attentionRequest = this.attentionRequestSignal.asReadonly();
  readonly query = this.querySignal.asReadonly();

  open(): void {
    this.isOpenSignal.set(true);
  }

  openAndFocus(): void {
    this.isOpenSignal.set(true);
    this.focusRequestSignal.update(value => value + 1);
  }

  requestAttention(): void {
    this.attentionRequestSignal.update(value => value + 1);
  }

  setQuery(query: string): void {
    this.querySignal.set(query);
  }

  close(): void {
    this.isOpenSignal.set(false);
  }
}
