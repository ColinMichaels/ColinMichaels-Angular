import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SleepScreenComponent} from './sleep-screen.component';

describe('SleepScreenComponent', () => {
  let component: SleepScreenComponent;
  let fixture: ComponentFixture<SleepScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SleepScreenComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SleepScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
