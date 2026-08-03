import {pendingPostChangesGuard} from './pending-post-changes.guard';

describe('pendingPostChangesGuard', () => {
  it('delegates route-leave authority to the active editor', () => {
    const component = {canDeactivate: jasmine.createSpy('canDeactivate').and.returnValue(false)};

    expect(pendingPostChangesGuard(component, {} as never, {} as never, {} as never)).toBeFalse();
    expect(component.canDeactivate).toHaveBeenCalledOnceWith();
  });
});
