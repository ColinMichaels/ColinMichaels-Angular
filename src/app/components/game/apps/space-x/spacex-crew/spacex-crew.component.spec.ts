import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SpacexCrewComponent} from './spacex-crew.component';

describe('SpacexCrewComponent', () => {
  let component: SpacexCrewComponent;
  let fixture: ComponentFixture<SpacexCrewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacexCrewComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SpacexCrewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
