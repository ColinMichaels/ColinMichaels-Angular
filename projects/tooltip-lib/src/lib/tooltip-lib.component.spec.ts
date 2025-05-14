import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TooltipLibComponent } from './tooltip-lib.component';

describe('TooltipLibComponent', () => {
  let component: TooltipLibComponent;
  let fixture: ComponentFixture<TooltipLibComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipLibComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TooltipLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
