import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

import {SpacexCrewComponent} from './spacex-crew.component';

describe('SpacexCrewComponent', () => {
  let component: SpacexCrewComponent;
  let fixture: ComponentFixture<SpacexCrewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacexCrewComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
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
