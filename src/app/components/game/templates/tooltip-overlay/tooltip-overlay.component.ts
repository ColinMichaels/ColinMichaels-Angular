import {
  Component,
  Input,
  ElementRef,
  AfterViewInit,
  ViewChild,
  OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TooltipPosition, TooltipService, TooltipSize} from '../../services/tooltip.service';

const DEFAULT_TOOLTIP_CLASS = 'text-white bg-black/50';

@Component({
  selector: 'app-tooltip-overlay',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #tooltipRef class="absolute z-50" [ngStyle]="tooltipStyle">
      <div
        class="relative z-50 pointer-events-none
            truncate w-auto max-w-xs
            rounded px-2 py-1  scale-95
            transform-gpu transition-opacity duration-300 ease-in-out "
        [class.opacity-100]="ready"
        [ngClass]="[sizeClass, toolTipClass]"
        [style.visibility]="ready ? 'visible' : 'hidden'">

        <div [innerHTML]="text"></div>
      </div>
      <!-- Arrow pointing to host -->
      <div *ngIf="showArrow"
           [class.opacity-100]="ready"
           class="absolute w-2 h-2  opacity-0 rotate-45"
           [ngClass]="[arrowClass, toolTipClass]">
      </div>
    </div>
  `,
  styles: []
})
export class TooltipOverlayComponent implements AfterViewInit, OnDestroy {

  @Input() text = '';
  @Input({
    transform: (value: string | string[]): string => {
      if (typeof value === 'string') {
        return value ? value : DEFAULT_TOOLTIP_CLASS;
      } else {
        return value.join(',');
      }
    }
  }) toolTipClass: string = '';
  @Input() position: TooltipPosition = 'top';
  @Input() size: TooltipSize = 'md';
  @Input() hostElement!: HTMLElement;
  @Input() autoDismissDelay: number | null = null;
  @Input() showArrow = true;
  @Input() showBlur: boolean = true;
  @ViewChild('tooltipRef') tooltipRef!: ElementRef;

  coords = {top: 20, left: 20};
  ready = true;
  private dismissTimeout?: ReturnType<typeof setTimeout>;

  constructor(private tooltipService: TooltipService) {
  }

  ngAfterViewInit(): void {
    this.tooltipService.positionTooltip(
      this.hostElement,
      this.tooltipRef.nativeElement,
      this.position
    );
  }

  get sizeClass(): string {
    const validSizes: Record<TooltipSize, string> = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };
    return validSizes[this.size];
  }

  get tooltipStyle() {
    return {
      top: `${this.coords.top}px`,
      left: `${this.coords.left}px`
    };
  }


  get arrowClass(): string {
    switch (this.position) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 -translate-y-1';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 translate-y-1';
      case 'left':
        return 'right-0 top-1/2 -translate-y-1/2 translate-x-1';
      case 'right':
        return 'left-0 top-1/2 -translate-y-1/2 -translate-x-1';
    }
  }

  ngOnDestroy(): void {
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }
    this.tooltipService.hide(true);
  }
}
