import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';

import {AdminControlModuleComponent} from './admin-control-module.component';

@Component({
  imports: [AdminControlModuleComponent, ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <app-admin-control-module title="Publishing" summary="Draft" [(expanded)]="expanded">
        <input formControlName="slug">
      </app-admin-control-module>
    </form>
  `,
})
class TestHostComponent {
  readonly form = new FormGroup({slug: new FormControl('first-slug', {nonNullable: true})});
  expanded = false;
}

describe('AdminControlModuleComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('toggles a compact module without destroying projected form controls', () => {
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector<HTMLButtonElement>('button[aria-expanded="false"]');
    const input = element.querySelector<HTMLInputElement>('input');

    expect(button).not.toBeNull();
    expect(input?.closest('div')?.hidden).toBeTrue();

    button?.click();
    fixture.detectChanges();
    input?.dispatchEvent(new Event('input'));
    fixture.componentInstance.form.controls.slug.setValue('updated-slug');

    expect(element.querySelector('button')?.getAttribute('aria-expanded')).toBe('true');

    element.querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLInputElement>('input')).toBe(input);
    expect(fixture.componentInstance.form.controls.slug.value).toBe('updated-slug');
  });
});
