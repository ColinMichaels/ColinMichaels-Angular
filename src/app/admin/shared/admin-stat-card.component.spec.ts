import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AdminStatCardComponent} from './admin-stat-card.component';

@Component({
  imports: [AdminStatCardComponent],
  template: `
    <app-admin-stat-card
      label="Hero Status"
      value="published"
      size="compact"
      [capitalize]="true"
    ></app-admin-stat-card>
  `,
})
class AdminStatCardHostComponent {}

describe('AdminStatCardComponent', () => {
  let fixture: ComponentFixture<AdminStatCardHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [AdminStatCardHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(AdminStatCardHostComponent);
    fixture.detectChanges();
  });

  it('renders the configured label, value, and emphasis', () => {
    const element = fixture.nativeElement as HTMLElement;
    const value = element.querySelector('p:last-child');

    expect(element.querySelector('section')?.getAttribute('aria-label')).toBe('Hero Status');
    expect(element.textContent).toContain('published');
    expect(value?.classList).toContain('text-2xl');
    expect(value?.classList).toContain('capitalize');
  });
});
