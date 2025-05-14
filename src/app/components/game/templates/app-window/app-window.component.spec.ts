import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppWindowComponent } from './app-window.component';

describe('TerminalWindowComponent', () => {
  let component: AppWindowComponent;
  let fixture: ComponentFixture<AppWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppWindowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
