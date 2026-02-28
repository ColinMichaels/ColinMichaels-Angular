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
    component.hostElement = document.createElement('div');
    spyOn(component.hostElement, 'getBoundingClientRect').and.returnValue({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
