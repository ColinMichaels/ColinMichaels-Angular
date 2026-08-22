import {
  ApplicationRef,
  ComponentRef,
  EmbeddedViewRef,
  Injectable,
  Injector,
  OnDestroy,
  Renderer2,
  RendererFactory2,
  createComponent,
} from '@angular/core';

import {TooltipOverlayComponent} from './tooltip-overlay.component';
import {
  DEFAULT_TOOLTIP_CLASS,
  TooltipOptions,
  TooltipPosition,
} from './tooltip.models';

@Injectable({providedIn: 'root'})
export class TooltipService implements OnDestroy {
  private tooltipComponentRef: ComponentRef<TooltipOverlayComponent> | null = null;
  private readonly renderer: Renderer2;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private currentTooltipId: string | null = null;
  private onHidden?: () => void;
  private tooltipSequence = 0;

  constructor(
    private readonly injector: Injector,
    private readonly appRef: ApplicationRef,
    rendererFactory: RendererFactory2,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  show(options: TooltipOptions): string {
    if (!options.hostElement) {
      throw new Error('TooltipOptions must include a valid hostElement.');
    }

    const replacedTooltipCallback = this.disposeCurrentTooltip();

    const tooltipId = `core-os-tooltip-${++this.tooltipSequence}`;
    const componentRef = createComponent(TooltipOverlayComponent, {
      environmentInjector: this.appRef.injector,
      elementInjector: this.injector,
    });
    const tooltipClasses = [options.toolTipClass, options.cssClass]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(' ')
      || DEFAULT_TOOLTIP_CLASS;

    this.tooltipComponentRef = componentRef;
    this.currentTooltipId = tooltipId;
    this.onHidden = options.onHidden;

    componentRef.instance.tooltipId = tooltipId;
    componentRef.instance.text = options.text;
    componentRef.instance.toolTipClass = tooltipClasses;
    componentRef.instance.position = options.position ?? 'top';
    componentRef.instance.size = options.size ?? 'sm';
    componentRef.instance.showArrow = options.showArrow ?? true;
    componentRef.instance.hostElement = options.hostElement;
    componentRef.instance.fadeDuration = options.fadeDuration ?? 200;

    this.appRef.attachView(componentRef.hostView);
    this.renderer.appendChild(document.body, this.getTooltipHostElement(componentRef));
    componentRef.changeDetectorRef.detectChanges();

    if (options.autoDismissDelay && options.autoDismissDelay > 0) {
      this.hideTimer = setTimeout(() => this.hide(tooltipId), options.autoDismissDelay);
    }

    // Replacement callbacks run after the new tooltip is fully attached. This
    // prevents a callback that calls show() from orphaning either component.
    if (replacedTooltipCallback) {
      queueMicrotask(replacedTooltipCallback);
    }

    return tooltipId;
  }

  hide(tooltipId?: string): void {
    if (tooltipId && tooltipId !== this.currentTooltipId) {
      return;
    }

    this.disposeCurrentTooltip()?.();
  }

  positionTooltip(host: HTMLElement, tooltip: HTMLElement, position: TooltipPosition): void {
    const hostRect = host.getBoundingClientRect();

    switch (position) {
      case 'top':
        tooltip.style.top = `${hostRect.top - tooltip.offsetHeight}px`;
        tooltip.style.left = `${hostRect.left + (host.offsetWidth - tooltip.offsetWidth) / 2}px`;
        break;
      case 'bottom':
        tooltip.style.top = `${hostRect.bottom}px`;
        tooltip.style.left = `${hostRect.left + (host.offsetWidth - tooltip.offsetWidth) / 2}px`;
        break;
      case 'left':
        tooltip.style.top = `${hostRect.top + (host.offsetHeight - tooltip.offsetHeight) / 2}px`;
        tooltip.style.left = `${hostRect.left - tooltip.offsetWidth}px`;
        break;
      case 'right':
        tooltip.style.top = `${hostRect.top + (host.offsetHeight - tooltip.offsetHeight) / 2}px`;
        tooltip.style.left = `${hostRect.right}px`;
        break;
    }
  }

  ngOnDestroy(): void {
    this.hide();
  }

  private getTooltipHostElement(componentRef: ComponentRef<TooltipOverlayComponent>): HTMLElement {
    const [rootNode] = (componentRef.hostView as EmbeddedViewRef<unknown>).rootNodes;
    if (!(rootNode instanceof HTMLElement)) {
      throw new Error('Tooltip root node is not an HTML element.');
    }

    return rootNode;
  }

  private disposeCurrentTooltip(): (() => void) | undefined {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }

    const componentRef = this.tooltipComponentRef;
    const hiddenCallback = this.onHidden;

    this.tooltipComponentRef = null;
    this.currentTooltipId = null;
    this.onHidden = undefined;

    if (componentRef) {
      const hostElement = this.getTooltipHostElement(componentRef);
      if (hostElement.parentNode) {
        this.renderer.removeChild(hostElement.parentNode, hostElement);
      }
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
    }

    return hiddenCallback;
  }
}
