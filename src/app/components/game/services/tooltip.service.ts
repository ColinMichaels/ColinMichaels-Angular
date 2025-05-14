import {
  ApplicationRef,
  ComponentRef,
  Injectable,
  Renderer2,
  RendererFactory2,
  inject
} from '@angular/core';
import {
  TooltipOverlayComponent
} from '../templates/tooltip-overlay/tooltip-overlay.component';

export interface TooltipOptions {
  text: string;
  cssClass?: string;
  position?: TooltipPosition;
  size?: TooltipSize;
  autoDismissDelay?: number | null;
  hideDelay?: number | null;
  showArrow?: boolean;
  toolTipClass?: string;
}

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipSize = 'sm' | 'md' | 'lg';

@Injectable({providedIn: 'root'})
export class TooltipService {
  private static currentRef?: ComponentRef<TooltipOverlayComponent>;
  private appRef = inject(ApplicationRef);
  private renderer: Renderer2;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private readonly debounceDelay = 100; // ms

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  show({
         host,
         text,
         cssClass,
         position,
         size,
         autoDismissDelay,
         showArrow,
         toolTipClass,
         hideDelay
       }: {
    host: HTMLElement,
    text: string,
    cssClass?: string,
    position?: TooltipPosition,
    size?: TooltipSize,
    autoDismissDelay?: number | null,
    hideDelay?: number | null,
    showArrow?: boolean,
    toolTipClass?: string,
  }) {
    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.hide(true); // force immediate

      const container = this.renderer.createElement('div');
      this.renderer.appendChild(document.body, container);

      const ref = this.appRef.bootstrap(TooltipOverlayComponent, container);
      ref.instance.text = text;
      ref.instance.toolTipClass = cssClass || 'bg-zinc-900/50 text-white';
      ref.instance.position = position ?? 'top';
      ref.instance.size = size ?? 'md';
      ref.instance.hostEl = host;
      ref.instance.autoDismissDelay = autoDismissDelay ?? null;
      ref.instance.showArrow = showArrow ?? false;

      TooltipService.currentRef = ref;
    }, this.debounceDelay);
  }

  hide(force = false, delay: number | null = null): void {
    clearTimeout(this.hideTimer);

    if (force || !delay) {
      this._destroyTooltip();
    } else {
      this.hideTimer = setTimeout(() => {
        this._destroyTooltip();
      }, delay);
    }
  }

  private _destroyTooltip(): void {
    if (TooltipService.currentRef) {
      const element = TooltipService.currentRef.location.nativeElement;
      this.appRef.detachView(TooltipService.currentRef.hostView);
      TooltipService.currentRef.destroy();
      this.renderer.removeChild(document.body, element);
      TooltipService.currentRef = undefined;
    }
  }
}
