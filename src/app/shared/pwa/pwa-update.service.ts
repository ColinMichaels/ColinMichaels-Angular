import {DOCUMENT} from '@angular/common';
import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import {SwUpdate} from '@angular/service-worker';
import {Subscription} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly swUpdate = inject(SwUpdate, {optional: true});
  private readonly updateReadyState = signal(false);
  private readonly unrecoverableReasonState = signal<string | null>(null);
  private readonly subscriptions = new Subscription();

  readonly updateReady = this.updateReadyState.asReadonly();
  readonly unrecoverableReason = this.unrecoverableReasonState.asReadonly();
  readonly enabled = Boolean(this.swUpdate?.isEnabled);

  constructor() {
    if (!this.swUpdate?.isEnabled) {
      return;
    }

    this.subscriptions.add(
      this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          this.updateReadyState.set(true);
        }
      })
    );
    this.subscriptions.add(
      this.swUpdate.unrecoverable.subscribe(event => {
        this.unrecoverableReasonState.set(event.reason || 'The cached app version can no longer be used.');
      })
    );
    this.destroyRef.onDestroy(() => this.subscriptions.unsubscribe());
  }

  async reload(): Promise<void> {
    if (this.updateReadyState()) {
      await this.swUpdate?.activateUpdate();
    }

    this.document.defaultView?.location.reload();
  }
}
