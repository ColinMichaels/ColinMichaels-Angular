import {AfterViewInit, Directive, ElementRef, HostListener, OnDestroy, inject, input, output} from '@angular/core';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

@Directive({
  selector: '[appDialogFocus]',
  host: {
    '(keydown)': 'handleKeydown($event)',
  },
})
export class DialogFocusDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly backgroundInertState: Array<{ element: Element; wasInert: boolean }> = [];

  readonly returnFocusTo = input<HTMLElement | null>(null, {alias: 'appDialogFocus'});
  readonly appDialogEscape = output<void>();

  ngAfterViewInit(): void {
    this.makeBackgroundInert();
    this.focusInitialElement();
  }

  ngOnDestroy(): void {
    const launchControl = this.returnFocusTo();
    const activeElement = document.activeElement;
    const ownedFocus = activeElement === document.body || this.host.nativeElement.contains(activeElement);

    this.restoreBackgroundInteractivity();

    if (ownedFocus && launchControl?.isConnected) {
      launchControl.focus();
    }
  }

  @HostListener('document:focusin', ['$event'])
  protected handleDocumentFocus(event: FocusEvent): void {
    const target = event.target;

    if (target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.focusInitialElement();
    }
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.appDialogEscape.emit();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = this.getFocusableElements();

    if (focusableElements.length === 0) {
      event.preventDefault();
      this.focusInitialElement();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1) ?? firstElement;
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === firstElement || !this.host.nativeElement.contains(activeElement))) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && (activeElement === lastElement || !this.host.nativeElement.contains(activeElement))) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  private focusInitialElement(): void {
    const initialFocus = this.host.nativeElement.querySelector<HTMLElement>('[data-dialog-initial-focus]')
      ?? this.getFocusableElements()[0]
      ?? this.host.nativeElement;
    initialFocus.focus();
  }

  private getFocusableElements(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(focusableSelector))
      .filter(element => element.getAttribute('aria-hidden') !== 'true' && element.closest('[inert]') === null);
  }

  private makeBackgroundInert(): void {
    let activeBranch: Element = this.host.nativeElement;
    let parent = activeBranch.parentElement;

    while (parent) {
      for (const sibling of Array.from(parent.children)) {
        if (sibling === activeBranch) {
          continue;
        }

        const wasInert = sibling.hasAttribute('inert');
        this.backgroundInertState.push({element: sibling, wasInert});
        sibling.setAttribute('inert', '');
      }

      if (parent === document.body) {
        break;
      }

      activeBranch = parent;
      parent = activeBranch.parentElement;
    }
  }

  private restoreBackgroundInteractivity(): void {
    for (const {element, wasInert} of this.backgroundInertState) {
      if (!wasInert) {
        element.removeAttribute('inert');
      }
    }

    this.backgroundInertState.length = 0;
  }
}
