import { Component, Input, ElementRef, OnInit, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {TooltipPosition, TooltipSize, TooltipOptions} from '../../services/tooltip.service';

@Component({
  selector: 'app-tooltip-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Position the outer wrapper absolutely -->
    <div class="absolute z-50" [style.top.px]="coords.top" [style.left.px]="coords.left">
      <!-- Tooltip box, relatively positioned to hold the arrow -->
      <!-- Todo: add option to show bg blur or adjust animations -->
      <div #tooltipRef
           class="relative z-50 pointer-events-none
            rounded px-2 py-1 shadow-lg opacity-0 scale-95
             backdrop-blur-md backdrop-saturate-150
            transform transition-opacity duration-300 ease-in-out truncate w-auto max-w-xs"
           [class.opacity-100]="ready"
           [class.scale-100]="ready"
           [class]="toolTipClass"
           [ngClass]="[sizeClass]"
           [style.visibility]="ready ? 'visible' : 'hidden'">

        <div [innerHTML]="text"></div>


      </div>
      <!-- Arrow pointing to host -->
      <div *ngIf="showArrow"
           [class.opacity-100]="ready"
           [class]="toolTipClass"
           class="absolute w-2 h-2  opacity-0  transition-opacity transform rotate-45"
           [ngClass]="[arrowClass]"></div>
    </div>
  `,
  styles: []
})
export class TooltipOverlayComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() text = '';
  @Input() toolTipClass = '';
  @Input() position: TooltipPosition = 'top';
  @Input() size: TooltipSize = 'md';
  @Input() hostEl!: HTMLElement;
  @Input() autoDismissDelay: number | null = null;
  @Input() showArrow = false;
  @ViewChild('tooltipRef') tooltipRef!: ElementRef;

  coords = { top: -9999, left: -9999 };
  ready = false;
  private dismissTimeout?: ReturnType<typeof setTimeout>;

  get sizeClass(): string {
    const validSizes: Record<TooltipSize, string> = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };
    return validSizes[this.size];
  }

  get arrowClass(): string {
    switch (this.position) {
      case 'top': return 'top-full left-1/2 -translate-x-1/2 -translate-y-1';
      case 'bottom': return 'bottom-full left-1/2 -translate-x-1/2 translate-y-1';
      case 'left': return 'right-0 top-1/2 -translate-y-1/2 translate-x-1';
      case 'right': return 'left-0 top-1/2 -translate-y-1/2 -translate-x-1';
    }
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
