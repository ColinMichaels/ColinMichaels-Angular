import {Component, Input, ElementRef, OnInit, AfterViewInit, ViewChild, OnDestroy, Inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import {TooltipPosition, TooltipService, TooltipSize} from '../tooltip.service';

/**
 * The `TooltipOverlayComponent` is an Angular component used to display a contextual tooltip
 * near its respective host element. The component supports features such as customizable position,
 * size, optional arrow indicator, and auto-dismiss functionality.
 *
 * The component allows developers to define various properties to style and position the tooltip
 * based on their requirements.
 *
 * Inputs:
 * - `text`: The content to display inside the tooltip. Defaults to an empty string.
 * - `toolTipClass`: Additional custom CSS classes for styling the tooltip.
 * - `position`: Specifies the position of the tooltip relative to the host (`top`, `bottom`, `left`, `right`).
 *               Defaults to `top`.
 * - `size`: Controls the size of the tooltip (`sm`, `md`, `lg`). Defaults to `md`.
 * - `hostEl`: A reference to the host HTML element where the tooltip will be anchored.
 * - `autoDismissDelay`: Optional delay in milliseconds after which the tooltip will automatically dismiss.
 *                       Defaults to `null`, meaning no auto-dismiss.
 * - `showArrow`: Boolean to control if an arrow pointing to the target element should be displayed.
 *                Defaults to `false`.
 *
 * Lifecycle Methods:
 * - `ngOnInit`: Initializes the component.
 * - `ngAfterViewInit`: Executes positioning logic after the view is initialized and binds event listeners.
 * - `ngOnDestroy`: Handles cleanup tasks, such as clearing timeouts.
 *
 * Internal Behavior:
 * - The tooltip is positioned using absolute coordinates based on the dimensions
 *   of both the host element and the tooltip itself.
 * - During initialization, the component calculates the coordinates to position the tooltip
 *   according to the specified `position` property.
 * - The tooltip provides fade-in and scale animations controlled by the `ready` state.
 * - When `autoDismissDelay` is specified, the tooltip is automatically hidden after the delay.
 *
 * Outputs:
 * N/A
 */
@Component({
  selector: 'app-tooltip-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Position the outer wrapper absolutely -->
    <div class="absolute z-50" [style.top.px]="coords.top" [style.left.px]="coords.left">
      <!-- Tooltip box, relatively positioned to hold the arrow -->
      <div #tooltipRef
           class="relative z-50 pointer-events-none bg-zinc-900/70 text-zinc-200
            rounded px-2 py-1 shadow-lg opacity-0 scale-95
             backdrop-blur-md backdrop-saturate-150
            transform transition-opacity duration-300 ease-in-out truncate w-auto max-w-xs"
           [class.opacity-100]="ready"
           [class.scale-100]="ready"
           [ngClass]="[toolTipClass, sizeClass]"
           [style.visibility]="ready ? 'visible' : 'hidden'">

        <div [innerHTML]="text"></div>


      </div>
      <!-- Arrow pointing to host -->
      <div *ngIf="showArrow"
           [class.opacity-100]="ready"
           class="absolute w-2 h-2 bg-zinc-900/70 opacity-0  transition-opacity transform rotate-45"
           [ngClass]="[arrowClass]"></div>
    </div>
  `,
  styles: []
})
export class TooltipOverlayComponent implements OnInit, AfterViewInit, OnDestroy {

  /**
   * Represents a text variable, which is intended to store a string value.
   * Initially set as an empty string.
   */
  @Input() text = '';
  /**
   * Represents the CSS class name(s) applied to the tooltip element for styling purposes.
   * This variable is typically used to define or update the class of the tooltip dynamically.
   * It should contain a string with valid CSS class name(s).
   */
  @Input() toolTipClass = '';

  /**
   * Represents the position of a tooltip in the user interface.
   * This determines where the tooltip will be displayed relative to the target element.
   *
   * Possible values:
   * - 'top': The tooltip is displayed above the target element.
   * - 'right': The tooltip is displayed to the right of the target element.
   * - 'bottom': The tooltip is displayed below the target element.
   * - 'left': The tooltip is displayed to the left of the target element.
   */
  @Input() position: TooltipPosition = 'top';
  /**
   * Represents the size of a tooltip.
   *
   * The `size` variable determines the dimensions of the tooltip.
   * It accepts predefined size values, with 'md' being the default size.
   *
   * Possible values:
   * - 'sm' for small size
   * - 'md' for medium size
   * - 'lg' for large size
   *
   * Default value: 'md'
   */
  @Input() size: TooltipSize = 'md';
  /**
   * Represents a reference to a host HTML element.
   * This variable is used to store an HTMLElement object
   * that acts as the primary container or anchor point
   * within the DOM for certain operations or rendering logic.
   *
   * The `hostEl` is expected to be assigned an HTML element
   * and is marked as a non-null assertion (!), indicating that it
   * will always hold a valid HTMLElement during runtime.
   *
   * @type {HTMLElement}
   */
  @Input() hostEl!: HTMLElement;
  /**
   * Represents the delay in milliseconds before a dismissible element is automatically closed.
   *
   * If set to a number, the element will automatically dismiss after the specified delay time.
   * If set to null, auto-dismissal is disabled, requiring manual interaction to close the element.
   */
  @Input() autoDismissDelay: number | null = null;
  /**
   * Indicates whether an arrow should be displayed.
   *
   * This boolean variable is used to control the visibility of an arrow in the user interface.
   * It is typically set to `true` to show the arrow, or `false` to hide it.
   *
   * Default value: `false`.
   */
  @Input() showArrow = false;
  /**
   * A reference to the tooltip element in the DOM.
   * This is used to directly interact with the tooltip element, allowing
   * for manipulation of its properties, styles, or behaviors.
   * Typically injected as an Angular ElementRef.
   */
  @ViewChild('tooltipRef') tooltipRef!: ElementRef;

  coords = { top: -9999, left: -9999 };
  ready = false;
  private dismissTimeout?: ReturnType<typeof setTimeout>;

  constructor(private tooltipService: TooltipService) {
  }

  get sizeClass(): string {
    return this.tooltipService.getSizeClass(this.size);
  }

  get arrowClass(): string {
    return this.tooltipService.getArrowClass(this.position);
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      const hostRect = this.hostEl.getBoundingClientRect();
      const tooltipRect = this.tooltipRef.nativeElement.getBoundingClientRect();
      const offset = 8;

      switch (this.position) {
        case 'top':
          this.coords = {
            top: hostRect.top - tooltipRect.height - offset,
            left: hostRect.left + (hostRect.width / 2) - (tooltipRect.width / 2)
          };
          break;
        case 'bottom':
          this.coords = {
            top: hostRect.bottom + offset,
            left: hostRect.left + (hostRect.width / 2) - (tooltipRect.width / 2)
          };
          break;
        case 'left':
          this.coords = {
            top: hostRect.top + (hostRect.height / 2) - (tooltipRect.height / 2),
            left: hostRect.left - tooltipRect.width - offset
          };
          break;
        case 'right':
          this.coords = {
            top: hostRect.top + (hostRect.height / 2) - (tooltipRect.height / 2),
            left: hostRect.right + offset
          };
          break;
      }

      this.ready = true;

      const delay = this.autoDismissDelay ?? 3000;
      if (delay > 0) {
        this.dismissTimeout = setTimeout(() => {
          this.ready = false;
        }, delay);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }
  }
}
