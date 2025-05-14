import {
  Directive,
  ElementRef,
  Input,
  HostListener
} from '@angular/core';
import { TooltipService,TooltipPosition, TooltipSize } from '../services/tooltip.service';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective {
  @Input('appTooltip') tooltipText = '';
  @Input() tooltipClass: string = '';
  @Input() tooltipPosition: TooltipPosition = 'top';
  @Input() tooltipSize: TooltipSize = 'md';
  @Input() tooltipAutoDismiss: number | null = null;
  @Input() tooltipHideDelay: number | null = null;
  @Input() tooltipShowArrow: boolean = false;

  constructor(
    private el: ElementRef,
    private tooltipService: TooltipService
  ) {}

  @HostListener('mouseenter')
  onMouseEnter() {
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

  @HostListener('mouseleave')
  onMouseLeave() {
    this.tooltipService.hide(false, this.tooltipHideDelay);
  }
}
