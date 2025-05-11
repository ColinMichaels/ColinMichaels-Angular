import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinderAppComponent } from './finder-app.component';

describe('FinderAppComponent', () => {
  let component: FinderAppComponent;
  let fixture: ComponentFixture<FinderAppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinderAppComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinderAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
