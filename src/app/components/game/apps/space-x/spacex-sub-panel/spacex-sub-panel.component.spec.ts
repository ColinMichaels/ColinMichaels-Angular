import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

import {SpacexSubPanelComponent} from './spacex-sub-panel.component';

describe('SpacexSubPanelComponent', () => {
  let component: SpacexSubPanelComponent;
  let fixture: ComponentFixture<SpacexSubPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacexSubPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
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
