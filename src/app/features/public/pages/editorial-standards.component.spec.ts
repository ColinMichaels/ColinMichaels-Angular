import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {EditorialStandardsComponent} from './editorial-standards.component';

describe('EditorialStandardsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorialStandardsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('publishes one clear policy heading and evidence-boundary definitions', () => {
    const fixture = TestBed.createComponent(EditorialStandardsComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';

    expect(element.querySelectorAll('h1')).toHaveSize(1);
    expect(element.querySelector('h1')?.textContent).toContain('Editorial Standards & Corrections');
    expect(text).toContain('Hands-on or tested');
    expect(text).toContain('Researched or pre-buy analysis');
    expect(text).toContain('Manufacturer claim or demonstration');
    expect(text).toContain('Editorial illustration or synthetic media');
    expect(text).toContain('A media embed can provide context, but its destination does not automatically count as a citation.');
    expect(text).toContain('AI output is not treated as a source merely because it sounds confident.');
  });

  it('provides a concrete correction path and high-stakes boundaries', () => {
    const fixture = TestBed.createComponent(EditorialStandardsComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));
    const text = element.textContent ?? '';

    expect(links.some(link => link.getAttribute('href') === '/contact')).toBeTrue();
    expect(links.some(link => link.getAttribute('href') === 'mailto:colin@colinmichaels.com')).toBeTrue();
    expect(links.some(link => link.getAttribute('href') === '/authors/colin-michaels')).toBeTrue();
    expect(links.some(link => link.getAttribute('href') === '/privacy')).toBeTrue();
    expect(text).toContain('not medical advice');
    expect(text).toContain('A substantive revision keeps a visible Updated date.');
    expect(text).toContain('rather than silently rewriting history');
  });
});
