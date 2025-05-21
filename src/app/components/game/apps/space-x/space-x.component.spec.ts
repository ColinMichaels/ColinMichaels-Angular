import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SpaceXComponent} from './space-x.component';

describe('SpaceXComponent', () => {
  let component: SpaceXComponent;
  let fixture: ComponentFixture<SpaceXComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpaceXComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SpaceXComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
