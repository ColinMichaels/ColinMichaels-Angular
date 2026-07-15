import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AdminAlertComponent} from './admin-alert.component';

@Component({
  imports: [AdminAlertComponent],
  template: `<app-admin-alert message="Unable to load topics."></app-admin-alert>`,
})
class AdminAlertHostComponent {}

describe('AdminAlertComponent', () => {
  let fixture: ComponentFixture<AdminAlertHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [AdminAlertHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(AdminAlertHostComponent);
    fixture.detectChanges();
  });

  it('announces the configured error message', () => {
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');

    expect(alert?.getAttribute('aria-live')).toBe('assertive');
    expect(alert?.textContent).toContain('Unable to load topics.');
  });
});
