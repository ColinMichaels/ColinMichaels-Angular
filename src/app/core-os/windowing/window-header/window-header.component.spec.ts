import {ComponentFixture, TestBed} from '@angular/core/testing';

import {WindowHeaderComponent} from './window-header.component';

describe('WindowHeaderComponent', () => {
  let fixture: ComponentFixture<WindowHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WindowHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WindowHeaderComponent);
  });

  it('renders the supplied title', () => {
    fixture.componentRef.setInput('title', 'Component Lab');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.title')?.textContent.trim()).toBe('Component Lab');
  });

  it('reveals and hides the window controls with pointer hover', () => {
    fixture.detectChanges();
    const controls = fixture.nativeElement.querySelector('.cursor-pointer') as HTMLElement;
    const closeIcon = controls.querySelector('fa-icon:nth-of-type(2)') as HTMLElement;

    expect(closeIcon.classList).toContain('hidden');

    controls.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    expect(closeIcon.classList).not.toContain('hidden');

    controls.dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();
    expect(closeIcon.classList).toContain('hidden');
  });
});
