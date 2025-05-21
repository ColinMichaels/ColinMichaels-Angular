import {ComponentFixture, TestBed} from '@angular/core/testing';

import {TaskAppComponent} from './task-app.component';

describe('TaskAppComponent', () => {
  let component: TaskAppComponent;
  let fixture: ComponentFixture<TaskAppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskAppComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TaskAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
