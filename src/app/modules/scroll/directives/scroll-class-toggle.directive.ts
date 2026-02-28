import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
  AfterViewInit,
} from '@angular/core';

type ScrollDirection = 'left' | 'right' | 'top' | 'bottom';

/**
 * A directive that applies or removes specified CSS classes to an element based on the user's scroll position
 * relative to a defined scroll threshold. Supports additional animation effects for entry and exit behavior.
 *
 * The directive listens to the `window:scroll` event and evaluates whether to apply or remove classes based
 * on whether the scroll position has passed the configured threshold.
 *
 * Features:
 * - Customize classes to apply when the scroll position surpasses the threshold or falls below it.
 * - Add optional animation presets for the element's initial appearance (`flyIn`) and exit transition (`leaveTo`).
 *
 * Inputs:
 * @property scrollThreshold A number defining the vertical scroll pixel value at which the classes toggle. The default value is 100.
 * @property enterClasses A space-delimited string of CSS classes to apply when the `scrollThreshold` is exceeded.
 * @property exitClasses A space-delimited string of CSS classes to apply when the scroll position is below the `scrollThreshold`.
 * @property flyIn A preset string ('left', 'right', 'top', 'bottom') to define initial animation styles for entry.
 * @property leaveTo A preset string ('left', 'right', 'top', 'bottom') to define exit animation styles when scrolling out of the threshold.
 *
 * Methods:
 * @method onWindowScroll A `HostListener` method that observes the `window:scroll` event, determines if the active state changes
 *                  based on the current scroll position, and toggles the configured CSS classes accordingly.
 *
 * Private Utilities:
 * @method applyClasses Adds a list of space-delimited CSS classes to the directive's host element.
 * @method getLeaveToPreset Removes a list of space-delimited CSS classes from the directive's host element.
 * @method getFlyInPreset Returns a CSS class string describing entry animation styles based on the given `flyIn` direction.
 * @method getLeaveToPreset Returns a CSS class string describing exit animation styles based on the given `leaveTo` direction.
 *
 * Example Usage:
 * <div appScrollClassToggle
 *   [scrollThreshold]="200"
 *   enterClasses="bg-black text-white translate-y-0 opacity-100"
 *   exitClasses="bg-white text-black"
 *   flyIn="top"
 *   leaveTo="bottom"
 *   class="transition-all duration-500 ease-in-out transform opacity-0 translate-y-full p-4 fixed top-0 w-full z-50"
 * >
 *   I animate in and out based on scroll
 * </div>
 */
@Directive({
  selector: '[appScrollClassToggle]',
  standalone: false
})
export class ScrollClassToggleDirective implements AfterViewInit {
  @Input() scrollThreshold = 100;
  @Input() applyTransition = true;
  @Input() duration = 'duration-500';

  private _enterClasses = '';
  @Input()
  set enterClasses(value: string) {
    this._enterClasses = value ?? '';
    this.enterClassList = this.toClassList(this._enterClasses);
  }

  get enterClasses(): string {
    return this._enterClasses;
  }

  private _exitClasses = '';
  @Input()
  set exitClasses(value: string) {
    this._exitClasses = value ?? '';
    this.exitClassList = this.toClassList(this._exitClasses);
  }

  get exitClasses(): string {
    return this._exitClasses;
  }

  private _flyIn: ScrollDirection | null = null;
  @Input()
  set flyIn(value: ScrollDirection | null) {
    this._flyIn = value;
    this.flyInClassList = value ? this.toClassList(this.getFlyInPreset(value)) : [];
  }

  get flyIn(): ScrollDirection | null {
    return this._flyIn;
  }

  private _leaveTo: ScrollDirection | null = null;
  @Input()
  set leaveTo(value: ScrollDirection | null) {
    this._leaveTo = value;
    this.leaveToClassList = value ? this.toClassList(this.getLeaveToPreset(value)) : [];
  }

  get leaveTo(): ScrollDirection | null {
    return this._leaveTo;
  }

  private hasEntered = false;
  private scrollTicking = false;
  private enterClassList: string[] = [];
  private exitClassList: string[] = [];
  private flyInClassList: string[] = [];
  private leaveToClassList: string[] = [];

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2) {
  }

  ngAfterViewInit(): void {
    // Ensure transition classes are present
    if (this.applyTransition) {
      this.addIfMissing(this.duration);
      this.addIfMissing('transition-all');
      this.addIfMissing('ease-in-out');
    }

    this.initializeState();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (this.scrollTicking) {
      return;
    }

    this.scrollTicking = true;
    requestAnimationFrame(() => {
      this.scrollTicking = false;
      this.updateStateFromScroll();
    });
  }

  private addIfMissing(className: string): void {
    const el = this.el.nativeElement;
    if (!el.classList.contains(className)) {
      this.renderer.addClass(el, className);
    }
  }

  private initializeState(): void {
    if (this.isThresholdPassed()) {
      this.applyEnteredState();
      this.hasEntered = true;
      return;
    }

    this.addClasses(this.exitClassList);
    this.addClasses(this.flyInClassList);
  }

  private updateStateFromScroll(): void {
    const passedThreshold = this.isThresholdPassed();
    if (passedThreshold === this.hasEntered) {
      return;
    }

    if (passedThreshold) {
      this.applyEnteredState();
    } else {
      this.applyExitedState();
    }
    this.hasEntered = passedThreshold;
  }

  private applyEnteredState(): void {
    this.addClasses(this.enterClassList);
    this.removeClasses(this.exitClassList);
    this.removeClasses(this.flyInClassList);
    this.removeClasses(this.leaveToClassList);
  }

  private applyExitedState(): void {
    this.addClasses(this.exitClassList);
    this.removeClasses(this.enterClassList);
    this.addClasses(this.leaveToClassList);
  }

  private addClasses(classes: string[]): void {
    classes.forEach((cssClass) => this.renderer.addClass(this.el.nativeElement, cssClass));
  }

  private removeClasses(classes: string[]): void {
    classes.forEach((cssClass) => this.renderer.removeClass(this.el.nativeElement, cssClass));
  }

  private toClassList(classString: string): string[] {
    return classString.split(/\s+/).filter(Boolean);
  }

  private isThresholdPassed(): boolean {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    return scrollTop > this.scrollThreshold;
  }

  private getFlyInPreset(direction: ScrollDirection): string {
    switch (direction) {
      case 'left':
        return '-translate-x-full opacity-0';
      case 'right':
        return 'translate-x-full opacity-0';
      case 'top':
        return '-translate-y-full opacity-0';
      case 'bottom':
        return 'translate-y-full opacity-0';
      default:
        return '';
    }
  }

  private getLeaveToPreset(direction: ScrollDirection): string {
    return this.getFlyInPreset(direction);
  }
}
