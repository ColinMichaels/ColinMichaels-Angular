import { TestBed } from '@angular/core/testing';

import { TooltipLibService } from './tooltip-lib.service';

describe('TooltipLibService', () => {
  let service: TooltipLibService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TooltipLibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
