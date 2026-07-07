import {ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faAlignLeft,
  faBan,
  faCircleHalfStroke,
  faMinus,
  faPlus,
  faRotateLeft,
  faTextHeight,
  faUniversalAccess,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import {ReaderPreferencesService} from './reader-preferences.service';

@Component({
  selector: 'app-reader-tools',
  imports: [FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reader-tools" [class.reader-tools-open]="isOpen()">
      @if (isOpen()) {
        <section class="reader-tools-panel" role="dialog" aria-label="Reading assistance tools">
          <div class="reader-tools-header">
            <span class="reader-tools-header-icon" aria-hidden="true">
              <fa-icon [icon]="faUniversalAccess"></fa-icon>
            </span>
            <span class="reader-tools-status" aria-live="polite">
              {{ reader.fontScaleLabel() }} / {{ reader.spacingLabel() }}
            </span>
            <button
              type="button"
              class="reader-tools-icon-button"
              aria-label="Close reading assistance tools"
              aria-describedby="reader-tools-help"
              data-reader-tooltip="Close the reading tools panel."
              title="Close"
              (focus)="describe(closeTooltip)"
              (mouseenter)="describe(closeTooltip)"
              (click)="close()"
            >
              <fa-icon [icon]="faXmark"></fa-icon>
            </button>
          </div>

          <p id="reader-tools-help" class="reader-tools-description" aria-live="polite">
            {{ activeHelpText() }}
          </p>

          <div class="reader-tools-font-row" aria-label="Text size controls">
            <button
              type="button"
              class="reader-tools-icon-button"
              aria-label="Decrease text size"
              aria-describedby="reader-tools-help"
              data-reader-tooltip="Make page text smaller."
              title="Decrease text size"
              [disabled]="!reader.canDecreaseFont()"
              (focus)="describe(decreaseTooltip)"
              (mouseenter)="describe(decreaseTooltip)"
              (click)="describe(decreaseTooltip); reader.decreaseFontScale()"
            >
              <fa-icon [icon]="faMinus"></fa-icon>
            </button>
            <span class="reader-tools-font-indicator" aria-hidden="true">
              <fa-icon [icon]="faTextHeight"></fa-icon>
            </span>
            <button
              type="button"
              class="reader-tools-icon-button"
              aria-label="Increase text size"
              aria-describedby="reader-tools-help"
              data-reader-tooltip="Make page text larger."
              title="Increase text size"
              [disabled]="!reader.canIncreaseFont()"
              (focus)="describe(increaseTooltip)"
              (mouseenter)="describe(increaseTooltip)"
              (click)="describe(increaseTooltip); reader.increaseFontScale()"
            >
              <fa-icon [icon]="faPlus"></fa-icon>
            </button>
          </div>

          <div class="reader-tools-grid" aria-label="Reading display controls">
            <button
              type="button"
              class="reader-tools-icon-button"
              aria-label="Cycle text spacing"
              aria-describedby="reader-tools-help"
              [attr.data-reader-tooltip]="spacingTooltip()"
              [title]="spacingTooltip()"
              (focus)="describe(spacingTooltip())"
              (mouseenter)="describe(spacingTooltip())"
              (click)="reader.cycleSpacing(); describe(spacingTooltip())"
            >
              <fa-icon [icon]="faAlignLeft"></fa-icon>
            </button>
            <button
              type="button"
              class="reader-tools-icon-button"
              [class.reader-tools-active]="reader.preferences().highContrast"
              [attr.aria-pressed]="reader.preferences().highContrast"
              aria-label="Toggle high contrast"
              aria-describedby="reader-tools-help"
              [attr.data-reader-tooltip]="contrastTooltip()"
              [title]="contrastTooltip()"
              (focus)="describe(contrastTooltip())"
              (mouseenter)="describe(contrastTooltip())"
              (click)="reader.toggleHighContrast(); describe(contrastTooltip())"
            >
              <fa-icon [icon]="faCircleHalfStroke"></fa-icon>
            </button>
            <button
              type="button"
              class="reader-tools-icon-button"
              [class.reader-tools-active]="reader.preferences().reduceMotion"
              [attr.aria-pressed]="reader.preferences().reduceMotion"
              aria-label="Toggle reduced motion"
              aria-describedby="reader-tools-help"
              [attr.data-reader-tooltip]="motionTooltip()"
              [title]="motionTooltip()"
              (focus)="describe(motionTooltip())"
              (mouseenter)="describe(motionTooltip())"
              (click)="reader.toggleReducedMotion(); describe(motionTooltip())"
            >
              <fa-icon [icon]="faBan"></fa-icon>
            </button>
            <button
              type="button"
              class="reader-tools-icon-button"
              aria-label="Reset reading preferences"
              aria-describedby="reader-tools-help"
              data-reader-tooltip="Reset text size, spacing, contrast, and motion settings."
              title="Reset"
              (focus)="describe(resetTooltip)"
              (mouseenter)="describe(resetTooltip)"
              (click)="describe(resetTooltip); reader.reset()"
            >
              <fa-icon [icon]="faRotateLeft"></fa-icon>
            </button>
          </div>
        </section>
      }

      <button
        type="button"
        class="reader-tools-toggle"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="dialog"
        aria-label="Open reading assistance tools"
        data-reader-tooltip="Open reading tools for text size, spacing, contrast, and motion."
        title="Reading assistance"
        (click)="toggle()"
      >
        <fa-icon [icon]="faUniversalAccess"></fa-icon>
      </button>
    </div>
  `,
  styles: [`
    .reader-tools {
      bottom: calc(1rem + env(safe-area-inset-bottom));
      display: grid;
      gap: .65rem;
      justify-items: end;
      pointer-events: none;
      position: fixed;
      right: 1rem;
      z-index: 70;
    }

    .reader-tools > * {
      pointer-events: auto;
    }

    .reader-tools-panel {
      background: color-mix(in srgb, var(--site-panel) 94%, transparent);
      border: 1px solid var(--site-border);
      border-radius: .5rem;
      box-shadow: 0 18px 45px rgb(2 6 23 / .28);
      color: var(--site-text);
      display: grid;
      gap: .65rem;
      max-width: min(22rem, calc(100vw - 2rem));
      padding: .7rem;
      width: max-content;
    }

    .reader-tools-header,
    .reader-tools-font-row,
    .reader-tools-grid {
      align-items: center;
      display: grid;
      gap: .5rem;
    }

    .reader-tools-header {
      grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
    }

    .reader-tools-font-row {
      grid-template-columns: 3rem minmax(4.5rem, 1fr) 3rem;
    }

    .reader-tools-grid {
      grid-template-columns: repeat(4, 3rem);
    }

    .reader-tools-status {
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: .82rem;
      font-weight: 700;
      letter-spacing: .08em;
      overflow: hidden;
      text-align: center;
      text-transform: uppercase;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .reader-tools-description {
      color: var(--site-muted);
      font-size: .86rem;
      font-weight: 650;
      line-height: 1.4;
      margin: 0;
      max-width: 20rem;
    }

    .reader-tools-toggle,
    .reader-tools-icon-button,
    .reader-tools-header-icon,
    .reader-tools-font-indicator {
      align-items: center;
      border-radius: .5rem;
      display: inline-flex;
      justify-content: center;
    }

    .reader-tools-toggle,
    .reader-tools-icon-button {
      position: relative;
    }

    .reader-tools-toggle::after,
    .reader-tools-icon-button::after {
      background: var(--site-heading);
      border: 1px solid var(--site-border);
      border-radius: .35rem;
      bottom: calc(100% + .45rem);
      box-shadow: 0 12px 28px rgb(2 6 23 / .26);
      color: var(--site-bg);
      content: attr(data-reader-tooltip);
      font-family: var(--font-body);
      font-size: .82rem;
      font-weight: 700;
      left: 50%;
      line-height: 1.35;
      max-width: min(15rem, calc(100vw - 2rem));
      opacity: 0;
      padding: .45rem .6rem;
      pointer-events: none;
      position: absolute;
      text-align: center;
      transform: translate(-50%, .25rem);
      transition: opacity 150ms ease, transform 150ms ease;
      visibility: hidden;
      width: max-content;
      z-index: 3;
    }

    .reader-tools-toggle::after {
      left: auto;
      right: 0;
      transform: translateY(.25rem);
    }

    .reader-tools:not(.reader-tools-open) .reader-tools-toggle:hover::after,
    .reader-tools:not(.reader-tools-open) .reader-tools-toggle:focus-visible::after {
      opacity: 1;
      transform: translateY(0);
      visibility: visible;
    }

    .reader-tools-icon-button:hover::after,
    .reader-tools-icon-button:focus::after,
    .reader-tools-icon-button:focus-visible::after {
      opacity: 1;
      transform: translate(-50%, 0);
      visibility: visible;
    }

    .reader-tools-toggle,
    .reader-tools-icon-button {
      border: 1px solid var(--site-border);
      color: var(--site-text);
      min-height: 3rem;
      min-width: 3rem;
      transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
    }

    .reader-tools-toggle {
      background: var(--site-accent);
      border-color: var(--site-accent);
      box-shadow: 0 12px 28px rgb(var(--site-accent-rgb) / .24);
      color: #020617;
      font-size: 1.1rem;
    }

    .reader-tools-toggle:hover,
    .reader-tools-toggle:focus-visible {
      background: var(--site-accent-strong);
      border-color: var(--site-accent-strong);
      transform: translateY(-1px);
    }

    .reader-tools-icon-button {
      background: color-mix(in srgb, var(--site-bg) 62%, transparent);
      font-size: .95rem;
    }

    .reader-tools-icon-button:hover,
    .reader-tools-icon-button:focus-visible,
    .reader-tools-active {
      background: var(--site-accent-soft);
      border-color: var(--site-accent);
      color: var(--site-accent-strong);
    }

    .reader-tools-icon-button:disabled {
      cursor: not-allowed;
      opacity: .45;
      transform: none;
    }

    .reader-tools-header-icon,
    .reader-tools-font-indicator {
      background: var(--site-accent-soft);
      color: var(--site-accent-strong);
      min-height: 2.75rem;
      min-width: 2.75rem;
    }

    .reader-tools-font-indicator {
      justify-self: stretch;
    }

    @media (max-width: 640px) {
      .reader-tools {
        bottom: calc(.75rem + env(safe-area-inset-bottom));
        left: .75rem;
        right: .75rem;
      }

      .reader-tools-panel {
        width: 100%;
        max-width: none;
      }

      .reader-tools-toggle {
        justify-self: end;
      }

      .reader-tools-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .reader-tools-toggle::after,
      .reader-tools-icon-button::after {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .reader-tools-toggle,
      .reader-tools-icon-button {
        transition: none;
      }

      .reader-tools-toggle::after,
      .reader-tools-icon-button::after {
        transition: none;
      }
    }
  `],
})
export class ReaderToolsComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly closeTooltip = 'Close the reading tools panel.';
  protected readonly decreaseTooltip = 'Make page text smaller.';
  protected readonly increaseTooltip = 'Make page text larger.';
  protected readonly resetTooltip = 'Reset text size, spacing, contrast, and motion settings.';
  protected readonly reader = inject(ReaderPreferencesService);
  protected readonly isOpen = signal(false);
  protected readonly activeHelpText = signal('Assistance Tools.');
  protected readonly faAlignLeft = faAlignLeft;
  protected readonly faBan = faBan;
  protected readonly faCircleHalfStroke = faCircleHalfStroke;
  protected readonly faMinus = faMinus;
  protected readonly faPlus = faPlus;
  protected readonly faRotateLeft = faRotateLeft;
  protected readonly faTextHeight = faTextHeight;
  protected readonly faUniversalAccess = faUniversalAccess;
  protected readonly faXmark = faXmark;

  protected toggle(): void {
    this.isOpen.update(isOpen => !isOpen);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected describe(helpText: string): void {
    this.activeHelpText.set(helpText);
  }

  protected spacingTooltip(): string {
    return `Adjust line and paragraph spacing. Current setting: ${this.reader.spacingLabel()}.`;
  }

  protected contrastTooltip(): string {
    return this.reader.preferences().highContrast
      ? 'Turn off high contrast reading colors.'
      : 'Turn on stronger foreground and background contrast.';
  }

  protected motionTooltip(): string {
    return this.reader.preferences().reduceMotion
      ? 'Allow regular animations and smooth scrolling.'
      : 'Reduce animations and smooth scrolling.';
  }

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: Event): void {
    if (!this.isOpen()) {
      return;
    }

    const target = event.target;

    if (target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    this.close();
  }
}
