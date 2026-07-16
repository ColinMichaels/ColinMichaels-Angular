import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AdminEditorActionBarComponent} from './admin-editor-action-bar.component';

@Component({
  imports: [AdminEditorActionBarComponent],
  template: `
    <app-admin-editor-action-bar status="Saving topic..." [busy]="true" [panel]="true">
      <div adminEditorActions class="contents">
        <button type="button">Delete</button>
        <button type="submit">Save Topic</button>
      </div>
    </app-admin-editor-action-bar>
  `,
})
class AdminEditorActionBarHostComponent {}

describe('AdminEditorActionBarComponent', () => {
  let fixture: ComponentFixture<AdminEditorActionBarHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [AdminEditorActionBarHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(AdminEditorActionBarHostComponent);
    fixture.detectChanges();
  });

  it('announces status, exposes busy state, and projects editor actions', () => {
    const element = fixture.nativeElement as HTMLElement;
    const footer = element.querySelector('footer');

    expect(footer?.getAttribute('aria-busy')).toBe('true');
    expect(footer?.classList).toContain('bg-zinc-900/70');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Saving topic...');
    expect(Array.from(element.querySelectorAll('button')).map(button => button.textContent?.trim()))
      .toEqual(['Delete', 'Save Topic']);
  });
});
