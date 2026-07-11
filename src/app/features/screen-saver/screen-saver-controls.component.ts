import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

import {
  SCREEN_SAVER_KEN_BURNS_SPEED_LABELS,
  SCREEN_SAVER_KEN_BURNS_SPEED_MAX,
  SCREEN_SAVER_KEN_BURNS_SPEED_MIN,
  SCREEN_SAVER_SLIDESHOW_SECONDS_MAX,
  SCREEN_SAVER_SLIDESHOW_SECONDS_MIN,
  ScreenSaverModuleId,
} from './screen-saver.model';

@Component({
  selector: 'app-screen-saver-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="studio-toolbar" aria-label="Screen saver studio controls">
      <div class="module-switch" role="group" aria-label="Screen saver module">
        <button
          type="button"
          class="module-button"
          [class.is-selected]="moduleId() === 'hero'"
          [attr.aria-pressed]="moduleId() === 'hero'"
          (click)="moduleSelected.emit('hero')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="m3.5 18.5 5.75-9 3.35 5 2.2-3 5.7 7H3.5Z"></path>
          </svg>
          <span>Hero</span>
        </button>
        <button
          type="button"
          class="module-button"
          [class.is-selected]="moduleId() === 'local'"
          [attr.aria-pressed]="moduleId() === 'local'"
          [attr.aria-label]="'My Images, ' + localImageCount() + ' saved'"
          (click)="selectLocalModule(fileInput)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3.5" y="4.5" width="17" height="15" rx="2"></rect>
            <circle cx="9" cy="9.5" r="1.5"></circle>
            <path d="m5.5 17 4.25-4 3 2.75 2.25-2 3.5 3.25"></path>
          </svg>
          <span>My Images</span>
        </button>
      </div>

      <div class="toolbar-divider" aria-hidden="true"></div>

      <div class="tuning-control ken-burns-control">
        <div class="control-heading">
          <span>Ken Burns</span>
          <button
            type="button"
            class="motion-toggle"
            [class.is-active]="kenBurnsEnabled()"
            [attr.aria-pressed]="kenBurnsEnabled()"
            [attr.aria-label]="kenBurnsEnabled() ? 'Disable Ken Burns motion' : 'Enable Ken Burns motion'"
            (click)="kenBurnsToggled.emit(!kenBurnsEnabled())"
          >
            <span></span>
          </button>
        </div>
        <label class="range-row">
          <span class="sr-only">Ken Burns speed</span>
          <input
            type="range"
            [min]="kenBurnsSpeedMin"
            [max]="kenBurnsSpeedMax"
            step="1"
            [value]="kenBurnsSpeed()"
            [style.--range-progress]="kenBurnsProgress()"
            [disabled]="!kenBurnsEnabled()"
            (input)="handleKenBurnsSpeed($event)"
          >
          <span class="range-value">{{ kenBurnsSpeedLabel() }}</span>
        </label>
      </div>

      <div class="toolbar-divider tuning-divider" aria-hidden="true"></div>

      <label class="tuning-control slideshow-control">
        <span class="control-heading">Slideshow</span>
        <span class="range-row">
          <span class="sr-only">Seconds between slides</span>
          <input
            type="range"
            [min]="slideshowSecondsMin"
            [max]="slideshowSecondsMax"
            step="1"
            [value]="slideshowIntervalSeconds()"
            [style.--range-progress]="slideshowProgress()"
            (input)="handleSlideshowInterval($event)"
          >
          <span class="range-value">{{ slideshowIntervalSeconds() }} sec</span>
        </span>
      </label>

      <div class="toolbar-divider upload-divider" aria-hidden="true"></div>

      <button
        type="button"
        class="upload-button"
        [disabled]="localStorageBusy() || !localStorageSupported()"
        [attr.title]="localStorageError() || 'Store images in this browser'"
        (click)="fileInput.click()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 16V4"></path>
          <path d="m7.5 8.5 4.5-4.5 4.5 4.5"></path>
          <path d="M5 14.5v3.25A2.25 2.25 0 0 0 7.25 20h9.5A2.25 2.25 0 0 0 19 17.75V14.5"></path>
        </svg>
        <span>{{ localStorageBusy() ? 'Saving' : 'Add images' }}</span>
      </button>
      <input
        #fileInput
        class="file-input"
        type="file"
        accept="image/*"
        multiple
        (change)="handleFileInput($event)"
      >

      <span class="sr-only" aria-live="polite">{{ localStorageError() }}</span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: min(91vw, 88rem);
      pointer-events: auto;
    }

    .studio-toolbar {
      display: grid;
      grid-template-columns: auto 1px minmax(15rem, 1fr) 1px minmax(14rem, 0.9fr) 1px auto;
      align-items: center;
      gap: 1.25rem;
      min-height: 5.5rem;
      padding: 0.8rem 1.1rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 999px;
      background: rgba(9, 10, 13, 0.76);
      box-shadow: 0 24px 54px rgba(0, 0, 0, 0.34);
      color: rgba(255, 255, 255, 0.92);
      font: 650 0.72rem/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      backdrop-filter: blur(22px) saturate(1.2);
      -webkit-backdrop-filter: blur(22px) saturate(1.2);
    }

    .module-switch {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.03);
    }

    button {
      font: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
    }

    .module-button,
    .upload-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      min-height: 2.8rem;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: rgba(255, 255, 255, 0.72);
      cursor: pointer;
      transition: border-color 180ms ease, background 180ms ease, color 180ms ease, box-shadow 180ms ease;
    }

    .module-button {
      min-width: 8.5rem;
      padding: 0.65rem 1rem;
    }

    .module-button.is-selected {
      border-color: #67e8f9;
      background: rgba(103, 232, 249, 0.1);
      box-shadow: 0 0 1.25rem rgba(103, 232, 249, 0.22), inset 0 0 0.65rem rgba(103, 232, 249, 0.08);
      color: #fff;
    }

    .module-button:hover,
    .module-button:focus-visible,
    .upload-button:hover:not(:disabled),
    .upload-button:focus-visible {
      color: #fff;
      border-color: rgba(103, 232, 249, 0.75);
    }

    button:focus-visible,
    input:focus-visible {
      outline: 2px solid #67e8f9;
      outline-offset: 3px;
    }

    svg {
      width: 1.2rem;
      height: 1.2rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.7;
      flex: 0 0 auto;
    }

    .toolbar-divider {
      align-self: stretch;
      width: 1px;
      min-height: 3.2rem;
      background: rgba(255, 255, 255, 0.2);
    }

    .tuning-control {
      display: grid;
      grid-template-columns: auto minmax(8rem, 1fr);
      align-items: center;
      gap: 1rem;
      min-width: 0;
    }

    .control-heading {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      white-space: nowrap;
    }

    .motion-toggle {
      position: relative;
      width: 3rem;
      height: 1.6rem;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: border-color 180ms ease, background 180ms ease;
    }

    .motion-toggle span {
      position: absolute;
      top: 0.2rem;
      left: 0.22rem;
      width: 1.05rem;
      height: 1.05rem;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.72);
      transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), background 180ms ease;
    }

    .motion-toggle.is-active {
      border-color: rgba(103, 232, 249, 0.7);
      background: rgba(103, 232, 249, 0.15);
    }

    .motion-toggle.is-active span {
      background: #67e8f9;
      transform: translateX(1.42rem);
    }

    .range-row {
      display: grid;
      grid-template-columns: minmax(6rem, 1fr) 4.2rem;
      align-items: center;
      gap: 0.8rem;
      min-width: 0;
    }

    input[type='range'] {
      width: 100%;
      height: 1.25rem;
      margin: 0;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      cursor: pointer;
    }

    input[type='range']::-webkit-slider-runnable-track {
      height: 0.22rem;
      border-radius: 999px;
      background: linear-gradient(
        90deg,
        #67e8f9 0 var(--range-progress),
        rgba(255, 255, 255, 0.25) var(--range-progress) 100%
      );
    }

    input[type='range']::-moz-range-track {
      height: 0.22rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.25);
    }

    input[type='range']::-moz-range-progress {
      height: 0.22rem;
      border-radius: 999px;
      background: #67e8f9;
    }

    input[type='range']::-webkit-slider-thumb {
      width: 1rem;
      height: 1rem;
      margin-top: -0.39rem;
      appearance: none;
      -webkit-appearance: none;
      border: 2px solid rgba(255, 255, 255, 0.88);
      border-radius: 50%;
      background: #67e8f9;
      box-shadow: 0 0 0.75rem rgba(103, 232, 249, 0.3);
    }

    input[type='range']::-moz-range-thumb {
      width: 0.8rem;
      height: 0.8rem;
      border: 2px solid rgba(255, 255, 255, 0.88);
      border-radius: 50%;
      background: #67e8f9;
    }

    input[type='range']:disabled {
      cursor: not-allowed;
      opacity: 0.35;
    }

    .range-value {
      color: rgba(255, 255, 255, 0.62);
      font-size: 0.66rem;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.08em;
      white-space: nowrap;
    }

    .upload-button {
      min-width: 10.5rem;
      padding: 0.65rem 1.15rem;
      border-color: #67e8f9;
      color: #fff;
    }

    .upload-button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .file-input,
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 1050px) {
      :host {
        width: min(94vw, 54rem);
      }

      .studio-toolbar {
        grid-template-columns: minmax(0, 1fr) 1px auto;
        gap: 0.9rem 1rem;
        border-radius: 2rem;
      }

      .module-switch {
        justify-self: start;
      }

      .tuning-control {
        grid-column: span 1;
      }

      .tuning-divider {
        display: none;
      }

      .ken-burns-control {
        grid-column: 1;
      }

      .slideshow-control {
        grid-column: 3;
      }

      .upload-divider {
        display: none;
      }

      .upload-button {
        grid-column: 3;
        grid-row: 1;
      }
    }

    @media (max-width: 700px) {
      :host {
        width: calc(100vw - 1.5rem);
      }

      .studio-toolbar {
        grid-template-columns: 1fr;
        gap: 0.8rem;
        padding: 0.85rem;
        border-radius: 1.5rem;
      }

      .module-switch {
        width: 100%;
      }

      .module-button {
        flex: 1 1 0;
        min-width: 0;
      }

      .toolbar-divider {
        display: none;
      }

      .tuning-control,
      .ken-burns-control,
      .slideshow-control,
      .upload-button {
        grid-column: 1;
        grid-row: auto;
      }

      .tuning-control {
        grid-template-columns: 7.5rem minmax(0, 1fr);
      }

      .upload-button {
        width: 100%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .module-button,
      .upload-button,
      .motion-toggle,
      .motion-toggle span {
        transition: none;
      }
    }
  `],
})
export class ScreenSaverControlsComponent {
  readonly moduleId = input.required<ScreenSaverModuleId>();
  readonly localImageCount = input(0);
  readonly kenBurnsEnabled = input.required<boolean>();
  readonly kenBurnsSpeed = input.required<number>();
  readonly slideshowIntervalSeconds = input.required<number>();
  readonly localStorageSupported = input(true);
  readonly localStorageBusy = input(false);
  readonly localStorageError = input<string | null>(null);

  readonly moduleSelected = output<ScreenSaverModuleId>();
  readonly kenBurnsToggled = output<boolean>();
  readonly kenBurnsSpeedChanged = output<number>();
  readonly slideshowIntervalChanged = output<number>();
  readonly filesSelected = output<readonly File[]>();

  protected readonly kenBurnsSpeedMin = SCREEN_SAVER_KEN_BURNS_SPEED_MIN;
  protected readonly kenBurnsSpeedMax = SCREEN_SAVER_KEN_BURNS_SPEED_MAX;
  protected readonly slideshowSecondsMin = SCREEN_SAVER_SLIDESHOW_SECONDS_MIN;
  protected readonly slideshowSecondsMax = SCREEN_SAVER_SLIDESHOW_SECONDS_MAX;

  protected kenBurnsSpeedLabel(): string {
    return SCREEN_SAVER_KEN_BURNS_SPEED_LABELS[this.kenBurnsSpeed()] ?? 'Medium';
  }

  protected kenBurnsProgress(): string {
    return toRangeProgress(
      this.kenBurnsSpeed(),
      SCREEN_SAVER_KEN_BURNS_SPEED_MIN,
      SCREEN_SAVER_KEN_BURNS_SPEED_MAX
    );
  }

  protected slideshowProgress(): string {
    return toRangeProgress(
      this.slideshowIntervalSeconds(),
      SCREEN_SAVER_SLIDESHOW_SECONDS_MIN,
      SCREEN_SAVER_SLIDESHOW_SECONDS_MAX
    );
  }

  protected selectLocalModule(fileInput: HTMLInputElement): void {
    if (this.localImageCount() === 0) {
      fileInput.click();
      return;
    }

    this.moduleSelected.emit('local');
  }

  protected handleKenBurnsSpeed(event: Event): void {
    this.kenBurnsSpeedChanged.emit(readRangeValue(event));
  }

  protected handleSlideshowInterval(event: Event): void {
    this.slideshowIntervalChanged.emit(readRangeValue(event));
  }

  protected handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (files.length > 0) {
      this.filesSelected.emit(files);
    }

    input.value = '';
  }
}

function readRangeValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

function toRangeProgress(value: number, minimum: number, maximum: number): string {
  const normalized = (value - minimum) / (maximum - minimum);
  return `${Math.min(100, Math.max(0, normalized * 100))}%`;
}
