import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinderWindowComponent } from './finder-window.component';

describe('FinderWindowComponent', () => {
  let component: FinderWindowComponent;
  let fixture: ComponentFixture<FinderWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinderWindowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinderWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
