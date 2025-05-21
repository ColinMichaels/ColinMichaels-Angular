import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SpacexSubPanelComponent} from './spacex-sub-panel.component';

describe('SpacexSubPanelComponent', () => {
  let component: SpacexSubPanelComponent;
  let fixture: ComponentFixture<SpacexSubPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacexSubPanelComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SpacexSubPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
