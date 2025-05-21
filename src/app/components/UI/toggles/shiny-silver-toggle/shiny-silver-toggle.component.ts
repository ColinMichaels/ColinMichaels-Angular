import {Component, EventEmitter, Input, Output, ViewEncapsulation} from '@angular/core';
import {FormControl, FormsModule} from '@angular/forms';

@Component({
  selector: 'app-shiny-silver-toggle',
  imports: [
    FormsModule
  ],
  encapsulation: ViewEncapsulation.ShadowDom,
  template: `
    <div>
      <input id="inputElement" [(ngModel)]="toggle" type="checkbox">
      <label class="toggleSwitch" for="inputElement">
      </label>
    </div>`,
  styles: `

    #inputElement {
      @apply hidden;
      &:checked {
        & + .toggleSwitch {
          @apply bg-green-500/50;
          &::after {
            @apply translate-x-full;
          }
        }
      }
    }

    .toggleSwitch {
      @apply
      cursor-pointer
      relative
      flex items-center justify-center
      w-10
      h-5
      rounded-xl
      bg-white/90;
    }

    .toggleSwitch::after {
      @apply
      content-['']
      absolute
      left-0
      top-0
      w-4 h-4
      duration-300
      rounded-full
      shadow-lg
      bg-[conic-gradient(rgb(104,104,104), white,rgb(104,104,104), white,rgb(104,104,104))];
    }
  `
})
export class ShinySilverToggleComponent {
  toggle!: FormControl;
  @Input() checked = false;

  @Output() checkedChange = new EventEmitter<boolean>();

  constructor() {
    this.toggle = new FormControl(this.checked);
    this.toggle.valueChanges.subscribe(value => {
      this.checkedChange.emit(value);
    });
  }
}
