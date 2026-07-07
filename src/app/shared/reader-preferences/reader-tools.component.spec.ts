import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ReaderToolsComponent} from './reader-tools.component';

const READER_STORAGE_KEY = 'colinmichaels-reader-preferences-v1';

describe('ReaderToolsComponent', () => {
  const originalMatchMedia = window.matchMedia;
  let fixture: ComponentFixture<ReaderToolsComponent>;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    window.localStorage.removeItem(READER_STORAGE_KEY);
    window.matchMedia = jasmine.createSpy('matchMedia').and.returnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener'),
      addListener: jasmine.createSpy('addListener'),
      removeListener: jasmine.createSpy('removeListener'),
      dispatchEvent: jasmine.createSpy('dispatchEvent'),
    });

    await TestBed.configureTestingModule({
      imports: [ReaderToolsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReaderToolsComponent);
    nativeElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    window.localStorage.removeItem(READER_STORAGE_KEY);
    window.matchMedia = originalMatchMedia;
    TestBed.resetTestingModule();
  });

  it('adds tooltip descriptions to the reader controls', () => {
    const toggle = nativeElement.querySelector<HTMLButtonElement>('.reader-tools-toggle');

    expect(toggle?.getAttribute('data-reader-tooltip')).toContain('Open reading tools');

    toggle?.click();
    fixture.detectChanges();

    const increaseButton = nativeElement.querySelector<HTMLButtonElement>('button[aria-label="Increase text size"]');
    const spacingButton = nativeElement.querySelector<HTMLButtonElement>('button[aria-label="Cycle text spacing"]');
    const contrastButton = nativeElement.querySelector<HTMLButtonElement>('button[aria-label="Toggle high contrast"]');
    const resetButton = nativeElement.querySelector<HTMLButtonElement>('button[aria-label="Reset reading preferences"]');
    const helpText = nativeElement.querySelector('#reader-tools-help');

    expect(increaseButton?.getAttribute('data-reader-tooltip')).toBe('Make page text larger.');
    expect(increaseButton?.getAttribute('aria-describedby')).toBe('reader-tools-help');
    expect(spacingButton?.getAttribute('data-reader-tooltip')).toBe(
      'Adjust line and paragraph spacing. Current setting: Normal.',
    );
    expect(contrastButton?.getAttribute('data-reader-tooltip')).toBe(
      'Turn on stronger foreground and background contrast.',
    );
    expect(resetButton?.getAttribute('data-reader-tooltip')).toContain('Reset text size');
    expect(helpText?.textContent?.trim()).toBe('Assistance Tools.');

    increaseButton?.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(helpText?.textContent?.trim()).toBe('Make page text larger.');
  });

  it('closes the panel when the user clicks outside the control surface', () => {
    nativeElement.querySelector<HTMLButtonElement>('.reader-tools-toggle')?.click();
    fixture.detectChanges();

    expect(nativeElement.querySelector('.reader-tools-panel')).not.toBeNull();

    document.body.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    fixture.detectChanges();

    expect(nativeElement.querySelector('.reader-tools-panel')).toBeNull();
  });

  it('keeps the panel open when the user clicks inside the control surface', () => {
    nativeElement.querySelector<HTMLButtonElement>('.reader-tools-toggle')?.click();
    fixture.detectChanges();

    nativeElement
      .querySelector<HTMLButtonElement>('button[aria-label="Increase text size"]')
      ?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    fixture.detectChanges();

    expect(nativeElement.querySelector('.reader-tools-panel')).not.toBeNull();
  });
});
