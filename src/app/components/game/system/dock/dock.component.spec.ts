import { ComponentFixture, TestBed } from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

import { DockComponent } from './dock.component';

describe('DockComponent', () => {
  let component: DockComponent;
  let fixture: ComponentFixture<DockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DockComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
