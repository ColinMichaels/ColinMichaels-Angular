import { ComponentFixture, TestBed } from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

import { FinderAppComponent } from './finder-app.component';

describe('FinderAppComponent', () => {
  let component: FinderAppComponent;
  let fixture: ComponentFixture<FinderAppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinderAppComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
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
