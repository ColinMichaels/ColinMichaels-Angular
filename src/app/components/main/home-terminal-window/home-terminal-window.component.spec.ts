import {ComponentFixture, TestBed} from '@angular/core/testing';

import {HomeTerminalWindowComponent} from './home-terminal-window.component';

describe('HomeTerminalWindowComponent', () => {
  let component: HomeTerminalWindowComponent;
  let fixture: ComponentFixture<HomeTerminalWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeTerminalWindowComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(HomeTerminalWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
