import {TestBed} from '@angular/core/testing';

import {PwaNetworkService} from './pwa-network.service';

describe('PwaNetworkService', () => {
  it('tracks browser offline and online events', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(PwaNetworkService);

    window.dispatchEvent(new Event('offline'));
    expect(service.offline()).toBeTrue();
    expect(service.online()).toBeFalse();

    window.dispatchEvent(new Event('online'));
    expect(service.online()).toBeTrue();
    expect(service.offline()).toBeFalse();
  });
});
