import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
  AfterViewInit,
} from '@angular/core';

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
/**
 * TODO: need to test more and fix
 */
export class ScrollClassToggleDirective implements AfterViewInit {
  @Input() scrollThreshold = 100;
  @Input() enterClasses = ''; // class names to add when the threshold passed
  @Input() exitClasses = '';  // class names to add when below the threshold
  @Input() applyTransition = true;
  @Input() duration = 'duration-500';
  @Input() flyIn: 'left' | 'right' | 'top' | 'bottom' | null = null;
  @Input() leaveTo: 'left' | 'right' | 'top' | 'bottom' | null = null;

  private hasEntered = false;

  constructor(
    private readonly el: ElementRef,
    private readonly renderer: Renderer2) {
  }

  ngAfterViewInit(): void {
    // Apply initial state
    this.applyClasses(this.exitClasses);
    if (this.flyIn) {
      this.applyClasses(this.getFlyInPreset(this.flyIn));
    }
    // Ensure transition classes are present
    if (this.applyTransition) {
      this.addIfMissing(this.duration);
      this.addIfMissing('transition-all');
      this.addIfMissing('ease-in-out');
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const passedThreshold = scrollTop > this.scrollThreshold;

    const enterClassList = this.enterClasses.split(' ').filter(c => c);
    const exitClassList = this.exitClasses.split(' ').filter(c => c);

    if (passedThreshold && !this.hasEntered) {
      // Add enter classes, remove exit
      enterClassList.forEach(cls => this.renderer.addClass(this.el.nativeElement, cls));
      exitClassList.forEach(cls => this.renderer.removeClass(this.el.nativeElement, cls));
      if (this.flyIn) {
        this.getFlyInPreset(this.flyIn).split(' ').forEach(cls =>
          this.renderer.removeClass(this.el.nativeElement, cls)
        );
      }
      this.hasEntered = true;
    } else if (!passedThreshold && this.hasEntered) {
      // Revert to exit classes
      exitClassList.forEach(cls => this.renderer.addClass(this.el.nativeElement, cls));
      enterClassList.forEach(cls => this.renderer.removeClass(this.el.nativeElement, cls));
      if (this.leaveTo) {
        this.getLeaveToPreset(this.leaveTo).split(' ').forEach(cls =>
          this.renderer.addClass(this.el.nativeElement, cls)
        );
      }
      this.hasEntered = false;
    }
  }

  private addIfMissing(className: string) {
    const el = this.el.nativeElement;
    if (!el.classList.contains(className)) {
      this.renderer.addClass(el, className);
    }
  }

  private applyClasses(classString: string) {
    classString.split(' ').filter(c => c).forEach(cls =>
      this.renderer.addClass(this.el.nativeElement, cls)
    );
  }

  private getFlyInPreset(direction: string): string {
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

  private getLeaveToPreset(direction: string): string {
    return this.getFlyInPreset(direction);
  }
}
