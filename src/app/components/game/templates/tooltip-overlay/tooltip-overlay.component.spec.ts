import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TooltipOverlayComponent } from './tooltip-overlay.component';

describe('TooltipOverlayComponent', () => {
  let component: TooltipOverlayComponent;
  let fixture: ComponentFixture<TooltipOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TooltipOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
