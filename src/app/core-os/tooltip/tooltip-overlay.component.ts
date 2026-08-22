import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import {CommonModule} from '@angular/common';

import {TooltipService} from './tooltip.service';
import {
  DEFAULT_TOOLTIP_CLASS,
  TooltipPosition,
  TooltipSize,
  normalizeTooltipClass,
} from './tooltip.models';

@Component({
  selector: 'app-tooltip-overlay',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #tooltipRef
      role="tooltip"
      [id]="tooltipId"
      class="pointer-events-none fixed z-50"
    >
      <div
        class="relative z-50 w-auto max-w-xs truncate rounded px-2 py-1 transition-opacity ease-in-out"
        [class.opacity-100]="ready"
        [ngClass]="[sizeClass, toolTipClass]"
        [style.transition-duration.ms]="fadeDuration"
        [style.visibility]="ready ? 'visible' : 'hidden'"
      >
        {{ text }}
      </div>
      @if (showArrow) {
        <div
          aria-hidden="true"
          class="absolute h-2 w-2 rotate-45 opacity-0"
          [class.opacity-100]="ready"
          [ngClass]="[arrowClass, toolTipClass]"
        ></div>
      }
    </div>
  `,
})
export class TooltipOverlayComponent implements AfterViewInit {
  @Input() tooltipId = '';
  @Input() text = '';
  @Input({transform: normalizeTooltipClass}) toolTipClass = DEFAULT_TOOLTIP_CLASS;
  @Input() position: TooltipPosition = 'top';
  @Input() size: TooltipSize = 'md';
  @Input() hostElement!: HTMLElement;
  @Input() showArrow = true;
  @Input() fadeDuration = 200;
  @ViewChild('tooltipRef') tooltipRef!: ElementRef<HTMLElement>;

  protected readonly ready = true;

  constructor(private readonly tooltipService: TooltipService) {
  }

  ngAfterViewInit(): void {
    this.tooltipService.positionTooltip(
      this.hostElement,
      this.tooltipRef.nativeElement,
      this.position,
    );
  }

  protected get sizeClass(): string {
    const validSizes: Record<TooltipSize, string> = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };
    return validSizes[this.size];
  }

  protected get arrowClass(): string {
    switch (this.position) {
      case 'top':
        return 'left-1/2 top-full -translate-x-1/2 -translate-y-1';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 translate-y-1';
      case 'left':
        return 'right-0 top-1/2 -translate-y-1/2 translate-x-1';
      case 'right':
        return 'left-0 top-1/2 -translate-x-1 -translate-y-1/2';
    }
  }
}
