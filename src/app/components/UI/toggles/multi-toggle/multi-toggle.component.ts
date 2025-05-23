import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-multi-toggle',
  imports: [
    FormsModule,
    NgForOf
  ],
  styles: `
    .toggle-container {
      @apply relative flex items-center  rounded-full bg-white text-black overflow-hidden border border-white/40;
    }

    .toggle-options {
      @apply flex w-full relative;
    }

    .option-label {
      @apply flex-1 text-center py-2 cursor-pointer z-10 relative;
    }

    .selection {
      @apply absolute h-full z-0 left-0 top-0 transition-transform duration-150 ease-in bg-blue-600;
      width: calc(100% / var(--option-count));
    }

    input[type="radio"] {
      @apply sr-only;
    }

    input[type="radio"]:checked:nth-of-type(1) ~ .selection {
      transform: translateX(0);
    }

    input[type="radio"]:checked:nth-of-type(2) ~ .selection {
      transform: translateX(100%);
    }

    input[type="radio"]:checked:nth-of-type(3) ~ .selection {
      transform: translateX(200%);
    }

    input[type="radio"]:checked:nth-of-type(4) ~ .selection {
      transform: translateX(300%);
    }
  `,
  template: `
    <div class="toggle-container" [style.--option-count]="options.length">
      <div class="toggle-options">
        <input *ngFor="let option of options; let i = index"
               type="radio"
               [id]="'option' + i"
               [name]="'toggle-group'"
               [value]="option"
               [checked]="option === selectedOption"
               (change)="onOptionChange(option)">
        <label *ngFor="let option of options; let i = index"
               [for]="'option' + i"
               class="option-label">
          {{ option }}
        </label>
        <div class="selection"></div>
      </div>
    </div>
  `
})
export class MultiToggleComponent {
  @Input() options: string[] = ['Off', 'On'];
  @Input() checked = false;
  @Output() selectedChange = new EventEmitter<string>();

  selectedOption = this.options[0];

  onOptionChange(value: string): void {
    this.selectedOption = value;
    this.selectedChange.emit(value);
  }
}
