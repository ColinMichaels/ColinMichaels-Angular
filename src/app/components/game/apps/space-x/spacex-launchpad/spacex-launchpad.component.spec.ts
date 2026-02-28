import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

import {SpacexLaunchpadComponent} from './spacex-launchpad.component';

describe('SpacexLaunchpadComponent', () => {
  let component: SpacexLaunchpadComponent;
  let fixture: ComponentFixture<SpacexLaunchpadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacexLaunchpadComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SpacexLaunchpadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
