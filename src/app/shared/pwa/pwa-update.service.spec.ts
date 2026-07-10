import {TestBed} from '@angular/core/testing';
import {SwUpdate, UnrecoverableStateEvent, VersionEvent} from '@angular/service-worker';
import {Subject} from 'rxjs';

import {PwaUpdateService} from './pwa-update.service';

describe('PwaUpdateService', () => {
  let versionUpdates: Subject<VersionEvent>;
  let unrecoverable: Subject<UnrecoverableStateEvent>;
  let activateUpdate: jasmine.Spy;

  beforeEach(() => {
    versionUpdates = new Subject<VersionEvent>();
    unrecoverable = new Subject<UnrecoverableStateEvent>();
    activateUpdate = jasmine.createSpy('activateUpdate').and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates,
            unrecoverable,
            activateUpdate,
          },
        },
      ],
    });
  });

  it('reports when a new app version is ready', () => {
    const service = TestBed.inject(PwaUpdateService);

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: {hash: 'current'},
      latestVersion: {hash: 'latest'},
    });

    expect(service.updateReady()).toBeTrue();
  });

  it('reports an unrecoverable cached app state', () => {
    const service = TestBed.inject(PwaUpdateService);

    unrecoverable.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'A required asset is missing.',
    });

    expect(service.unrecoverableReason()).toBe('A required asset is missing.');
  });
});
