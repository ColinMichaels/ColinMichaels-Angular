export const DEFAULT_TOOLTIP_CLASS = 'bg-black/80 text-white';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipSize = 'sm' | 'md' | 'lg';

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
  onHidden?: () => void;
}

export function normalizeTooltipClass(value: string | readonly string[]): string {
  const normalized = typeof value === 'string' ? value.trim() : value.join(' ').trim();
  return normalized || DEFAULT_TOOLTIP_CLASS;
}
