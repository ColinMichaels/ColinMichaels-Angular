import {
  ApplicationRef,
  ComponentRef,
  Injectable,
  Injector, createComponent, Renderer2, RendererFactory2
} from '@angular/core';
import {
  TooltipOverlayComponent
} from '../templates/tooltip-overlay/tooltip-overlay.component';

export interface TooltipOptions {
  hostElement: HTMLElement;
  text: string;
  cssClass?: string;
  position?: TooltipPosition;
  size?: TooltipSize;
  autoDismissDelay?: number | null;
  fadeDuration?: number | null;
  showArrow?: boolean;
  toolTipClass?: string;
}

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipSize = 'sm' | 'md' | 'lg';

@Injectable({providedIn: 'root'})
export class TooltipService {
  private tooltipComponentRef: ComponentRef<TooltipOverlayComponent> | null = null;
  private renderer: Renderer2; // Store a Renderer2 instance
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private readonly debounceDelay = 100; // ms

  constructor(
    private injector: Injector,
    private appRef: ApplicationRef,
    private rendererFactory: RendererFactory2
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  show(options: TooltipOptions) {
    // If a tooltip already exists, hide it first
    this.hide();

    if (!options.hostElement) {
      throw new Error('TooltipOptions must include a valid hostElement.');
    }
    // Dynamically create the tooltip component
    this.tooltipComponentRef = createComponent(TooltipOverlayComponent, {
      environmentInjector: this.appRef.injector, // or use appropriate EnvironmentInjector
      elementInjector: this.injector, // Use only if local dependencies differ
    });


    // Pass options to the created component instance
    this.tooltipComponentRef.instance.text = options.text;
    this.tooltipComponentRef.instance.toolTipClass = options.cssClass ?? '';
    this.tooltipComponentRef.instance.position = options.position ?? 'top';
    this.tooltipComponentRef.instance.size = options.size ?? 'sm';
    this.tooltipComponentRef.instance.showArrow = options.showArrow ?? true;
    this.tooltipComponentRef.instance.hostElement = options.hostElement;

    // Attach the component to the app and apply positioning
    this.appRef.attachView(this.tooltipComponentRef.hostView);

    const domElem = (this.tooltipComponentRef.hostView as any).rootNodes[0];
    this.renderer.appendChild(document.body, domElem);

    this.positionTooltip(options.hostElement, domElem, options.position || 'top');

    // Auto-dismiss if needed
    if (options.autoDismissDelay) {
      window.setTimeout(() => this.hide(), options.autoDismissDelay);
    }
  }


  hide(force = false, fadeDuration = 0) {
    // todo: add back in force and hide delay
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    if (this.tooltipComponentRef) {
      const domElem = (this.tooltipComponentRef.hostView as any).rootNodes[0];
      this.renderer.removeChild(document.body, domElem);
      this.appRef.detachView(this.tooltipComponentRef.hostView);
      this.tooltipComponentRef.destroy();
      this.tooltipComponentRef = null;
    }

  }


   positionTooltip(host: HTMLElement, tooltip: HTMLElement, position: TooltipPosition) {
    const hostRect = host.getBoundingClientRect();

    // Adjust the tooltip position based on the selected direction
    if (position === 'top') {
      tooltip.style.top = `${hostRect.top - tooltip.offsetHeight}px`;
      tooltip.style.left = `${hostRect.left + (host.offsetWidth - tooltip.offsetWidth) / 2}px`;
    } else if (position === 'bottom') {
      tooltip.style.top = `${hostRect.bottom}px`;
      tooltip.style.left = `${hostRect.left + (host.offsetWidth - tooltip.offsetWidth) / 2}px`;
    } else if (position === 'left') {
      tooltip.style.top = `${hostRect.top + (host.offsetHeight - tooltip.offsetHeight) / 2}px`;
      tooltip.style.left = `${hostRect.left - tooltip.offsetWidth}px`;
    } else if (position === 'right') {
      tooltip.style.top = `${hostRect.top + (host.offsetHeight - tooltip.offsetHeight) / 2}px`;
      tooltip.style.left = `${hostRect.right}px`;
    }
  }


}
