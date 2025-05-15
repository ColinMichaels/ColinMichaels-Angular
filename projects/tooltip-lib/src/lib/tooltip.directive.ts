import {
  Directive,
  ElementRef,
  Input,
  HostListener
} from '@angular/core';
import { TooltipService,TooltipPosition, TooltipSize } from './tooltip.service';

/**
 * TooltipDirective is a standalone directive that provides a customizable tooltip
 * for any DOM element when a user interacts with it (e.g., hover).
 * This directive utilizes the TooltipService to display and manage tooltip behavior.
 *
 * The tooltip display can be configured using various input properties such as text, style,
 * position, size, auto-dismiss behavior, and more.
 *
 * Usage:
 * Attach the appTooltip directive to an element and configure its properties
 * to customize tooltip appearance and behavior.
 *
 * Key Features:
 * - Allows dynamic text content using the appTooltip attribute.
 * - Configurable tooltip position, size, and CSS class.
 * - Supports auto-dismiss and delay functionalities for tooltip visibility.
 * - Option to show or hide an arrow pointing to the target element.
 *
 * Input Properties:
 * - tooltipText: String to define the tooltip content.
 * - tooltipClass: Custom CSS class applied to the tooltip for styling.
 * - tooltipPosition: Tooltip placement (e.g., 'top', 'bottom', 'left', 'right').
 * - tooltipSize: Size of the tooltip (e.g., 'sm', 'md', 'lg').
 * - tooltipAutoDismiss: Time in milliseconds after which the tooltip will auto-dismiss.
 * - tooltipHideDelay: Time in milliseconds to delay hiding the tooltip after leaving the host.
 * - tooltipShowArrow: Boolean value to toggle the arrow on the tooltip.
 *
 * Host Listeners:
 * - onMouseEnter(): Displays the tooltip when the user hovers over the host element.
 * - onMouseLeave(): Hides the tooltip when the user leaves the host element.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective {
  /**
   * A string variable used to store the text displayed within a tooltip.
   * This text is typically shown when a user hovers over or interacts with an element.
   * The value of this variable can be dynamically set based on the context or element requiring a tooltip.
   */
  @Input('appTooltip') tooltipText = '';
  /**
   * A CSS class name used to style or customize the appearance of a tooltip.
   * This class can be applied to the tooltip element to inherit specific
   * styling defined in a CSS stylesheet.
   *
   * The default value is an empty string, which implies no custom styling
   * unless explicitly assigned.
   */
  @Input() tooltipClass: string = '';
  /**
   * The position of the tooltip relative to the target element.
   *
   * This variable determines where the tooltip will appear in relation
   * to the target component. Possible values typically include
   * 'top', 'bottom', 'left', and 'right'.
   *
   * Default value: 'top'
   *
   * @type {TooltipPosition}
   */
  @Input() tooltipPosition: TooltipPosition = 'top';
  /**
   * Specifies the size of the tooltip.
   *
   * This variable determines the dimensions of the tooltip,
   * usually defining its width, height, or font-size based
   * on predefined size categories. The value is typically
   * chosen from a set of predefined size options, such as-
   * 'sm' (small), 'md' (medium), or 'lg' (large).
   *
   * Default value: 'md' (medium size).
   *
   * @type {TooltipSize}
   */
  @Input() tooltipSize: TooltipSize = 'md';
  /**
   * Specifies the auto-dismiss duration for a tooltip in milliseconds.
   * If set to a numeric value, the tooltip will automatically hide after the specified duration.
   * If set to null, the tooltip will not auto-dismiss and requires manual intervention to be closed.
   */
  @Input() tooltipAutoDismiss: number | null = null;
  /**
   * Specifies the delay in milliseconds before a tooltip is hidden after a triggering event.
   * If set to a number, the delay will determine the time to wait before hiding the tooltip.
   * If set to null, no delay is applied, and the tooltip will hide immediately upon the triggering event.
   */
  @Input() tooltipHideDelay: number | null = null;
  /**
   * Determines whether a directional arrow is displayed on the tooltip.
   *
   * If set to `true`, the tooltip will render with an arrow pointing
   * towards its target element, indicating the source of the tooltip.
   * If set to `false`, the arrow will not be displayed.
   *
   * Default value is `false`.
   */
  @Input() tooltipShowArrow: boolean = false;

  constructor(
    private el: ElementRef,
    private tooltipService: TooltipService
  ) {}

  /**
   * Event handler that is triggered when the mouse enters the host element.
   * Displays a tooltip using the provided tooltip service if a valid tooltip message is available.
   *
   * The tooltip can be customized using several properties such as `tooltipText`, `tooltipClass`,
   * `tooltipPosition`, `tooltipSize`, `tooltipAutoDismiss`, `tooltipHideDelay`, and `tooltipShowArrow`.
   *
   * @return {void} This method does not return a value.
   */
  @HostListener('mouseenter')
  onMouseEnter(): void {
    const text = this.tooltipText.trim();
    if (!text) return;
    this.tooltipService.show({
      host: this.el.nativeElement,
      text: this.tooltipText,
      cssClass: this.tooltipClass,
      position: this.tooltipPosition,
      size: this.tooltipSize,
      autoDismissDelay: this.tooltipAutoDismiss ?? undefined,
      hideDelay: this.tooltipHideDelay,
      showArrow: this.tooltipShowArrow ?? false
    });
  }

  /**
   * Handles the mouse leave event for the component.
   * Invokes the tooltip service to hide the tooltip with specified delay.
   *
   * @return {void} No return value.
   */
  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.tooltipService.hide(false, this.tooltipHideDelay);
  }

}
