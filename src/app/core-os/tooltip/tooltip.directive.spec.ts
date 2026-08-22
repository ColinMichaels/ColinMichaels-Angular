import {Component, signal} from '@angular/core';
import {ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {TooltipDirective} from './tooltip.directive';
import {TooltipService} from './tooltip.service';

@Component({
  imports: [TooltipDirective],
  template: `
    <p id="existing-description">Existing description</p>
    <button
      type="button"
      aria-describedby="existing-description"
      [appTooltip]="tooltipText"
      [tooltipAutoDismiss]="autoDismissDelay()"
    >
      Details
    </button>
    <div id="wrapper" appTooltip="Wrapped control tooltip">
      <button id="wrapped-button" type="button">Wrapped control</button>
    </div>
    <div id="ancestor-tooltip" appTooltip="Ancestor tooltip">
      <a id="nested-tooltip" href="#nested" appTooltip="Nested link tooltip">Nested link</a>
    </div>
    <button id="other-button" type="button" appTooltip="Other tooltip">Other</button>
  `,
})
class TooltipDirectiveTestHostComponent {
  tooltipText = 'Literal <EMAIL> tooltip';
  readonly autoDismissDelay = signal(2000);
}

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<TooltipDirectiveTestHostComponent>;
  let button: HTMLButtonElement;
  let service: TooltipService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipDirectiveTestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TooltipDirectiveTestHostComponent);
    fixture.detectChanges();
    button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    service = TestBed.inject(TooltipService);
  });

  afterEach(() => service.hide());

  it('shows one described tooltip across hover and keyboard focus', () => {
    button.dispatchEvent(new MouseEvent('mouseenter'));

    const tooltipId = button.getAttribute('aria-describedby')?.split(' ').at(-1);
    expect(button.getAttribute('aria-describedby')).toContain('existing-description');
    expect(tooltipId).toMatch(/^core-os-tooltip-/);
    expect(document.getElementById(tooltipId!)?.textContent).toContain('Literal <EMAIL> tooltip');
    expect(document.querySelectorAll('[role="tooltip"]').length).toBe(1);

    button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    button.dispatchEvent(new MouseEvent('mouseleave'));

    expect(document.getElementById(tooltipId!)).not.toBeNull();
    expect(document.querySelectorAll('[role="tooltip"]').length).toBe(1);

    button.dispatchEvent(new FocusEvent('focusout', {bubbles: true}));

    expect(document.getElementById(tooltipId!)).toBeNull();
    expect(button.getAttribute('aria-describedby')).toBe('existing-description');
  });

  it('dismisses the current tooltip with Escape without removing other descriptions', () => {
    button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    const tooltipId = button.getAttribute('aria-describedby')?.split(' ').at(-1);
    const escapeEvent = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});

    button.dispatchEvent(escapeEvent);

    expect(escapeEvent.defaultPrevented).toBeTrue();
    expect(document.getElementById(tooltipId!)).toBeNull();
    expect(button.getAttribute('aria-describedby')).toBe('existing-description');
  });

  it('keeps a focus-triggered tooltip available past the legacy auto-dismiss delay', fakeAsync(() => {
    fixture.componentInstance.autoDismissDelay.set(25);
    fixture.detectChanges();
    const directive = fixture.debugElement.query(By.directive(TooltipDirective)).injector.get(TooltipDirective);
    expect(directive.tooltipAutoDismiss).toBe(25);
    button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    const tooltipId = button.getAttribute('aria-describedby')?.split(' ').at(-1);

    tick(25);

    expect(document.getElementById(tooltipId!)).not.toBeNull();
    expect(button.getAttribute('aria-describedby')).toContain(tooltipId!);

    button.dispatchEvent(new FocusEvent('focusout', {bubbles: true}));

    expect(document.getElementById(tooltipId!)).toBeNull();
    expect(button.getAttribute('aria-describedby')).toBe('existing-description');
  }));

  it('describes the focused descendant when the tooltip is on a wrapper', () => {
    const wrapper = fixture.nativeElement.querySelector('#wrapper') as HTMLDivElement;
    const wrappedButton = fixture.nativeElement.querySelector('#wrapped-button') as HTMLButtonElement;

    wrappedButton.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));

    const tooltipId = wrappedButton.getAttribute('aria-describedby');
    expect(tooltipId).toMatch(/^core-os-tooltip-/);
    expect(document.getElementById(tooltipId!)?.textContent).toContain('Wrapped control tooltip');
    expect(wrapper.hasAttribute('aria-describedby')).toBeFalse();

    wrappedButton.dispatchEvent(new FocusEvent('focusout', {bubbles: true}));

    expect(document.getElementById(tooltipId!)).toBeNull();
    expect(wrappedButton.hasAttribute('aria-describedby')).toBeFalse();
  });

  it('lets the nearest nested tooltip own the focused link', () => {
    const ancestor = fixture.nativeElement.querySelector('#ancestor-tooltip') as HTMLDivElement;
    const nestedLink = fixture.nativeElement.querySelector('#nested-tooltip') as HTMLAnchorElement;

    nestedLink.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));

    const tooltipId = nestedLink.getAttribute('aria-describedby');
    expect(tooltipId).toMatch(/^core-os-tooltip-/);
    expect(document.getElementById(tooltipId!)?.textContent).toContain('Nested link tooltip');
    expect(document.getElementById(tooltipId!)?.textContent).not.toContain('Ancestor tooltip');
    expect(ancestor.hasAttribute('aria-describedby')).toBeFalse();
    expect(document.querySelectorAll('[role="tooltip"]').length).toBe(1);
  });

  it('does not let pointer hover evict a tooltip from a still-focused control', () => {
    const otherButton = fixture.nativeElement.querySelector('#other-button') as HTMLButtonElement;
    button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    const focusedTooltipId = button.getAttribute('aria-describedby')?.split(' ').at(-1);

    otherButton.dispatchEvent(new MouseEvent('mouseenter'));

    expect(document.getElementById(focusedTooltipId!)).not.toBeNull();
    expect(otherButton.hasAttribute('aria-describedby')).toBeFalse();
    expect(document.querySelectorAll('[role="tooltip"]').length).toBe(1);

    otherButton.dispatchEvent(new MouseEvent('mouseleave'));

    expect(document.getElementById(focusedTooltipId!)).not.toBeNull();
    expect(button.getAttribute('aria-describedby')).toContain(focusedTooltipId!);
  });

  it('restores the hovered tooltip after the focus owner releases it', () => {
    const otherButton = fixture.nativeElement.querySelector('#other-button') as HTMLButtonElement;
    button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    otherButton.dispatchEvent(new MouseEvent('mouseenter'));

    button.dispatchEvent(new FocusEvent('focusout', {bubbles: true}));

    const hoverTooltipId = otherButton.getAttribute('aria-describedby');
    expect(hoverTooltipId).toMatch(/^core-os-tooltip-/);
    expect(document.getElementById(hoverTooltipId!)?.textContent).toContain('Other tooltip');
    expect(document.querySelectorAll('[role="tooltip"]').length).toBe(1);
  });

  it('restores a hovered ancestor after leaving its nested tooltip', fakeAsync(() => {
    const ancestor = fixture.nativeElement.querySelector('#ancestor-tooltip') as HTMLDivElement;
    const nestedLink = fixture.nativeElement.querySelector('#nested-tooltip') as HTMLAnchorElement;
    ancestor.dispatchEvent(new MouseEvent('mouseenter'));
    const firstAncestorId = ancestor.getAttribute('aria-describedby');

    nestedLink.dispatchEvent(new MouseEvent('mouseenter'));
    flushMicrotasks();
    const nestedId = nestedLink.getAttribute('aria-describedby');

    expect(document.getElementById(firstAncestorId!)).toBeNull();
    expect(document.getElementById(nestedId!)?.textContent).toContain('Nested link tooltip');

    nestedLink.dispatchEvent(new MouseEvent('mouseleave'));

    const restoredAncestorId = ancestor.getAttribute('aria-describedby');
    expect(restoredAncestorId).toMatch(/^core-os-tooltip-/);
    expect(restoredAncestorId).not.toBe(firstAncestorId);
    expect(document.getElementById(restoredAncestorId!)?.textContent).toContain('Ancestor tooltip');
    expect(document.querySelectorAll('[role="tooltip"]').length).toBe(1);
  }));
});
