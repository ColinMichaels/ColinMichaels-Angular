import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JokeTrayComponent } from './joke-tray.component';

describe('JokeTrayComponent', () => {
  let component: JokeTrayComponent;
  let fixture: ComponentFixture<JokeTrayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JokeTrayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JokeTrayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
