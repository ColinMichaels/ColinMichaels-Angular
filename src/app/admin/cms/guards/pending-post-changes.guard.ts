import {CanDeactivateFn} from '@angular/router';

interface PendingPostChangesAware {
  canDeactivate(): boolean;
}

export const pendingPostChangesGuard: CanDeactivateFn<PendingPostChangesAware> = component => (
  component.canDeactivate()
);
