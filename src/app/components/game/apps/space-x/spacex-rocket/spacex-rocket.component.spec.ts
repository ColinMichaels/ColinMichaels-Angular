import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SpacexRocketComponent} from './spacex-rocket.component';

describe('SpacexRocketComponent', () => {
  let component: SpacexRocketComponent;
  let fixture: ComponentFixture<SpacexRocketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacexRocketComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SpacexRocketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
