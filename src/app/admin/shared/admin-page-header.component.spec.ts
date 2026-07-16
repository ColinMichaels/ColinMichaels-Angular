import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AdminPageHeaderComponent} from './admin-page-header.component';

@Component({
  imports: [AdminPageHeaderComponent],
  template: `
    <app-admin-page-header
      eyebrow="Site Content"
      title="Topics"
      description="Manage public topic landing pages."
    >
      <button type="button" adminPageHeaderActions>New Topic</button>
    </app-admin-page-header>
  `,
})
class AdminPageHeaderHostComponent {}

describe('AdminPageHeaderComponent', () => {
  let fixture: ComponentFixture<AdminPageHeaderHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [AdminPageHeaderHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(AdminPageHeaderHostComponent);
    fixture.detectChanges();
  });

  it('renders the shared page identity and projected actions', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('header')).not.toBeNull();
    expect(element.querySelector('h1')?.textContent).toContain('Topics');
    expect(element.textContent).toContain('Site Content');
    expect(element.textContent).toContain('Manage public topic landing pages.');
    expect(element.querySelector('button')?.textContent).toContain('New Topic');
  });
});
