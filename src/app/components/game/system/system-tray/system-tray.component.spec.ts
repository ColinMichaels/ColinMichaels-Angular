import { ComponentFixture, TestBed } from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

import { SystemTrayComponent } from './system-tray.component';

describe('SystemTrayComponent', () => {
  let component: SystemTrayComponent;
  let fixture: ComponentFixture<SystemTrayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemTrayComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemTrayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
