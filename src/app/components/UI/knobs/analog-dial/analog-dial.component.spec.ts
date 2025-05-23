import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AnalogDialComponent} from './analog-dial.component';

describe('AnalogDialComponent', () => {
  let component: AnalogDialComponent;
  let fixture: ComponentFixture<AnalogDialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalogDialComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AnalogDialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
