import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AdminSearchFieldComponent} from './admin-search-field.component';

@Component({
  imports: [AdminSearchFieldComponent],
  template: `
    <app-admin-search-field
      label="Search topics"
      placeholder="Search title, slug, terms..."
      [value]="searchTerm"
      (valueChange)="searchTerm = $event"
    ></app-admin-search-field>
    <span data-search-term>{{ searchTerm }}</span>
  `,
})
class AdminSearchFieldHostComponent {
  protected searchTerm = 'angular';
}

describe('AdminSearchFieldComponent', () => {
  let fixture: ComponentFixture<AdminSearchFieldHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [AdminSearchFieldHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(AdminSearchFieldHostComponent);
    fixture.detectChanges();
  });

  it('renders the configured search control and emits input changes', () => {
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input');

    expect(element.querySelector('label')?.textContent).toContain('Search topics');
    expect(input?.type).toBe('search');
    expect(input?.placeholder).toBe('Search title, slug, terms...');
    expect(input?.value).toBe('angular');

    if (!input) {
      fail('Expected the shared search input to render.');
      return;
    }

    input.value = 'firebase';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.querySelector('[data-search-term]')?.textContent).toBe('firebase');
  });
});
