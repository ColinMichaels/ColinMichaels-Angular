import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
} from '@angular/core';

import {TooltipService} from './tooltip.service';
import {
  TooltipPosition,
  TooltipSize,
  normalizeTooltipClass,
} from './tooltip.models';

@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  private static readonly handledFocusEvents = new WeakSet<FocusEvent>();
  private static readonly hoveredOwners = new Set<TooltipDirective>();
  private static activeFocusOwner: TooltipDirective | null = null;

  @Input('appTooltip') tooltipText = '';
  @Input({transform: normalizeTooltipClass}) toolTipClass = '';
  @Input() tooltipPosition: TooltipPosition = 'top';
  @Input() tooltipSize: TooltipSize = 'md';
  @Input() tooltipfadeDuration: number | null = null;
  @Input() tooltipShowArrow = false;
  @Input() tooltipCssClass = '';
  @Input() tooltipAutoDismiss = 2000;
  @Input() tooltipFadeDuration = 200;

  private hovered = false;
  private focused = false;
  private tooltipId: string | null = null;
  private descriptionElement: HTMLElement | null = null;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly tooltipService: TooltipService,
  ) {
  }

  @HostListener('mouseenter')
  protected onMouseEnter(): void {
    this.hovered = true;
    TooltipDirective.hoveredOwners.add(this);

    const focusOwner = TooltipDirective.activeFocusOwner;
    if (focusOwner && focusOwner !== this && focusOwner.tooltipId) {
      return;
    }

    const hostElement = this.elementRef.nativeElement;
    this.showTooltip(hostElement, hostElement);
  }

  @HostListener('mouseleave')
  protected onMouseLeave(): void {
    this.hovered = false;
    TooltipDirective.hoveredOwners.delete(this);
    this.hideWhenInactive();

    if (!TooltipDirective.activeFocusOwner) {
      TooltipDirective.restoreHoveredTooltip();
    }
  }

  @HostListener('focusin', ['$event'])
  protected onFocusIn(event: FocusEvent): void {
    if (TooltipDirective.handledFocusEvents.has(event)) {
      return;
    }

    const focusTarget = event.target;
    if (!(focusTarget instanceof HTMLElement)) {
      return;
    }

    // The nearest tooltip host owns keyboard focus. This keeps a tooltip on a
    // nested link from being replaced by a tooltip on an ancestor wrapper.
    TooltipDirective.handledFocusEvents.add(event);
    TooltipDirective.activeFocusOwner = this;
    this.focused = true;
    this.showTooltip(focusTarget, focusTarget);
  }

  @HostListener('focusout', ['$event'])
  protected onFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && this.elementRef.nativeElement.contains(nextTarget)) {
      return;
    }

    const releasedFocusOwnership = TooltipDirective.activeFocusOwner === this;
    if (releasedFocusOwnership) {
      TooltipDirective.activeFocusOwner = null;
    }
    this.focused = false;
    this.hideWhenInactive();

    if (releasedFocusOwnership) {
      TooltipDirective.restoreHoveredTooltip();
    }
  }

  @HostListener('keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    if (!this.tooltipId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.hideTooltip();
  }

  ngOnDestroy(): void {
    const releasedFocusOwnership = TooltipDirective.activeFocusOwner === this;
    TooltipDirective.hoveredOwners.delete(this);
    if (releasedFocusOwnership) {
      TooltipDirective.activeFocusOwner = null;
    }
    this.hideTooltip();

    if (releasedFocusOwnership) {
      TooltipDirective.restoreHoveredTooltip();
    }
  }

  private showTooltip(hostElement: HTMLElement, descriptionElement: HTMLElement): void {
    const text = this.tooltipText.trim();
    if (!text) {
      return;
    }

    if (this.tooltipId) {
      this.moveTooltipDescription(this.tooltipId, descriptionElement);
      return;
    }

    const tooltipId = this.tooltipService.show({
      hostElement,
      toolTipClass: this.toolTipClass,
      text,
      cssClass: this.tooltipCssClass,
      position: this.tooltipPosition,
      size: this.tooltipSize,
      // Directive tooltips stay available while their hover/focus trigger is
      // active. The service-level timer remains available to programmatic use.
      autoDismissDelay: 0,
      fadeDuration: this.tooltipfadeDuration ?? this.tooltipFadeDuration,
      showArrow: this.tooltipShowArrow,
      onHidden: () => this.clearTooltipDescription(tooltipId),
    });

    this.tooltipId = tooltipId;
    this.descriptionElement = descriptionElement;
    this.addTooltipDescription(descriptionElement, tooltipId);
  }

  private hideWhenInactive(): void {
    if (!this.hovered && !this.focused) {
      this.hideTooltip();
    }
  }

  private hideTooltip(): void {
    const tooltipId = this.tooltipId;
    if (!tooltipId) {
      return;
    }

    this.tooltipService.hide(tooltipId);
    this.clearTooltipDescription(tooltipId);
  }

  private addTooltipDescription(element: HTMLElement, tooltipId: string): void {
    const descriptionIds = new Set((element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
    descriptionIds.add(tooltipId);
    element.setAttribute('aria-describedby', [...descriptionIds].join(' '));
  }

  private clearTooltipDescription(tooltipId: string): void {
    const element = this.descriptionElement;
    this.descriptionElement = null;
    this.tooltipId = this.tooltipId === tooltipId ? null : this.tooltipId;

    if (!element) {
      return;
    }

    const descriptionIds = (element.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(id => id && id !== tooltipId);

    if (descriptionIds.length > 0) {
      element.setAttribute('aria-describedby', descriptionIds.join(' '));
    } else {
      element.removeAttribute('aria-describedby');
    }
  }

  private moveTooltipDescription(tooltipId: string, nextElement: HTMLElement): void {
    if (this.descriptionElement === nextElement) {
      return;
    }

    const previousElement = this.descriptionElement;
    if (previousElement) {
      const descriptionIds = (previousElement.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter(id => id && id !== tooltipId);

      if (descriptionIds.length > 0) {
        previousElement.setAttribute('aria-describedby', descriptionIds.join(' '));
      } else {
        previousElement.removeAttribute('aria-describedby');
      }
    }

    this.descriptionElement = nextElement;
    this.addTooltipDescription(nextElement, tooltipId);
  }

  private static restoreHoveredTooltip(): void {
    const hoveredOwner = [...TooltipDirective.hoveredOwners]
      .reverse()
      .find(owner => owner.hovered);
    if (!hoveredOwner) {
      return;
    }

    const hostElement = hoveredOwner.elementRef.nativeElement;
    hoveredOwner.showTooltip(hostElement, hostElement);
  }
}
