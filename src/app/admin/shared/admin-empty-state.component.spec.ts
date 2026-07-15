import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AdminEmptyStateComponent} from './admin-empty-state.component';

@Component({
  imports: [AdminEmptyStateComponent],
  template: `<app-admin-empty-state message="No topics found."></app-admin-empty-state>`,
})
class AdminEmptyStateHostComponent {}

describe('AdminEmptyStateComponent', () => {
  let fixture: ComponentFixture<AdminEmptyStateHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [AdminEmptyStateHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(AdminEmptyStateHostComponent);
    fixture.detectChanges();
  });

  it('politely announces the configured empty-list message', () => {
    const status = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');

    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.textContent).toContain('No topics found.');
  });
});
