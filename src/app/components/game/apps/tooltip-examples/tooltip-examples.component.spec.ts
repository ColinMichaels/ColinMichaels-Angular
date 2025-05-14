import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TooltipExamplesComponent } from './tooltip-examples.component';

describe('TooltipExamplesComponent', () => {
  let component: TooltipExamplesComponent;
  let fixture: ComponentFixture<TooltipExamplesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipExamplesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TooltipExamplesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
