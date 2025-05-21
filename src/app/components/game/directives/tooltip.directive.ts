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
  @Input({
    transform: (value: string | string[]): string => {
      if(typeof value === 'string'){
        return value ? value : 'text-white bg-black/50';
      }
      else {
        return value.join(',');
      }
    }
  }) toolTipClass: string = '';
  @Input() tooltipPosition: TooltipPosition = 'top';
  @Input() tooltipSize: TooltipSize = 'md';
  @Input() tooltipfadeDuration: number | null = null;
  @Input() tooltipShowArrow: boolean = false;
  @Input() tooltipCssClass: string = '';
  @Input() tooltipAutoDismiss = 2000; // Default 2 seconds
  @Input() tooltipFadeDuration = 200; // Default 200ms fade


  constructor(
    private el: ElementRef,
    private tooltipService: TooltipService
  ) {}

  @HostListener('mouseenter')
  onMouseEnter() {
    const text = this.tooltipText.trim();
    if (!text) return;

    this.tooltipService.show({
      hostElement: this.el.nativeElement,
      toolTipClass: this.toolTipClass,
      text: this.tooltipText,
      cssClass: this.tooltipCssClass,
      position: this.tooltipPosition,
      size: this.tooltipSize,
      autoDismissDelay: this.tooltipAutoDismiss ?? undefined,
      fadeDuration: this.tooltipfadeDuration,
      showArrow: this.tooltipShowArrow ?? false
    });
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.tooltipService.hide(false, this.tooltipfadeDuration ?? 0);
  }
}
