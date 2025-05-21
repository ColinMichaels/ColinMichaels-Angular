// tailwind-preview.component.ts
import {Component} from '@angular/core';
import {TailwindClassGeneratorService, TailwindVariant} from '../../services/tailwind-class-generator.service';
import {NgClass, NgForOf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Clipboard} from '@angular/cdk/clipboard';
import {faCopy} from '@fortawesome/free-solid-svg-icons';
import {NotificationService} from '../../services/notification.service';

@Component({
  selector: 'app-tailwind-preview',
  imports: [
    NgClass,
    FormsModule,
    NgForOf
  ],
  template: `
    <div class="p-8 space-y-4 bg-gray-200 dark:bg-gray-900 h-full overflow-y-auto">
      <div class="grid grid-cols-2 gap-x-2 transition-all duration-500">
        <div [class]="bgColorClass + ' relative p-4 rounded w-full text-sm text-center border border-white/30 '+ textColorClass"
        [ngClass]="[selectedVariant ? textClass + ' ' + bgClass : '']">
          {{ bgColorClass }}
          <button class="copy-button" (click)="copy(bgColorClass)">Copy</button>
        </div>
        <div [class]="' relative p-4 rounded w-full text-sm text-center bg-zinc-800  border border-white/30 '+ textColorClass"
             [ngClass]="[selectedVariant ? textClass + ' ' + bgClass : '']">
          {{ textColorClass }}
          <button class="copy-button" (click)="copy(textColorClass)">Copy</button>
        </div>
      </div>
      <div class="flex justify-between items-center gap-x-2">
        <div class="form-field">
          <label for="selTCol" class="block mb-2">Text Color:</label>
          <select id="selTCol" [(ngModel)]="selectedTextColor" class="form-select text-white/90 bg-zinc-800">
            <option *ngFor="let v of colors" [value]="v">{{ v || 'None' }}</option>
          </select>
        </div>
        <div class="form-field">
          <label for="selTSat" class="block mb-2">Text Saturation: </label>
          <select id="selTSat" [(ngModel)]="selectedTextSaturation" class="form-select text-white/90 bg-zinc-800">
            <option *ngFor="let v of saturations" [value]="v">{{ v || 'None' }}</option>
          </select>
        </div>
        <div class="form-field">
          <label for="selBgCol" class="block mb-2">Bg Color:</label>
          <select id="selBgCol" [(ngModel)]="selectedBgColor" class="form-select text-white/90 bg-zinc-800">
            <option *ngFor="let v of colors" [value]="v">{{ v || 'None' }}</option>
          </select>
        </div>
        <div class="form-field">
          <label for="selBgSat" class="block mb-2">Bg Saturation: </label>
          <select id="selBgSat" [(ngModel)]="selectedBgSaturation" class="form-select text-white/90 bg-zinc-800">
            <option *ngFor="let v of saturations" [value]="v">{{ v || 'None' }}</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 text-sm gap-x-2 text-center">
        <section class="text-xs space-y-2">
          <label>Random Text & Background</label>
          <div [ngClass]="[textClass, bgClass, 'relative p-4 rounded transition-all duration-500 w-full text-sm text-center border border-white/30']">
            <div (click)="refreshTextAndBg()" class="bg-zinc-800/90 text-white/90 p-4 rounded text-wrap truncate">
              <pre class="text-xs">{{ textClass + ' ' + bgClass }}</pre>
            </div>
            <button class="copy-button" (click)="copy(textClass + ' ' + bgClass)">Copy</button>
          </div>
        </section>
        <section class="text-xs space-y-2">
          <label class="mb-1">Random Gradient Background</label>
          <div [ngClass]="[gradientClass, 'relative p-4 rounded text-white transition-all duration-500 w-full text-sm text-center border border-white/30']">
            <div (click)="refreshGradient()" class=" bg-zinc-800/90 text-white/90 p-4 rounded text-wrap truncate">
              <pre class="text-xs">{{ gradientClass }}</pre>
            </div>
            <button class="copy-button" (click)="copy(gradientClass)">Copy</button>
          </div>
        </section>
      </div>

      <div class="flex gap-4">
        <div class="form-field">
          <label for="selVar" class="block mb-2">Variant:</label>
          <select id="selVar" [(ngModel)]="selectedVariant" class="form-select text-white/90 bg-zinc-800">
            <option *ngFor="let v of variants" [value]="v">{{ v || 'None' }}</option>
          </select>
        </div>
        <button (click)="refreshTextAndBg()" class="mac-button">New Text/BG</button>
        <button (click)="refreshGradient()" class="mac-button">New Gradient</button>
        <button (click)="refreshAll()" class="mac-button">Refresh All</button>
      </div>
    </div>
  `,
  styles: `
  .form-field{
    @apply w-full text-xs;
      select{ @apply w-full text-xs; }
  }
  .copy-button{
    @apply absolute -top-3 -right-2 text-[8px] p-1 bg-zinc-800 rounded-full pointer-events-auto
    text-white/90 border border-zinc-200 hover:bg-red-700 transition-all duration-500;
  }`
})
export class TailwindPreviewComponent {
  textClass = '';
  bgClass = '';
  gradientClass = '';
  selectedVariant: TailwindVariant = '';
  variants: TailwindVariant[] = ['', 'hover', 'focus', 'active'];
  selectedTextColor: string = 'stone';
  selectedTextSaturation: string = '400';
  selectedBgColor: string = 'stone';
  selectedBgSaturation: string = '800';

  constructor(
    private tw: TailwindClassGeneratorService,
    private notify: NotificationService,
    private clipboard: Clipboard) {
    this.refreshAll();
  }

  get colors() {
      return this.tw.colors;
  }

  get saturations() {
      return this.tw.saturations;
  }

  refreshTextAndBg(): void {
    const { text, bg } = this.tw.generateRandomTextAndBg(this.selectedVariant);

    const textColor = text.split('-')[1];
    const bgColor = bg.split('-')[1];
    const textSaturation = text.split('-')[2];
    const bgSaturation = bg.split('-')[2];

    this.selectedTextColor = textColor;
    this.selectedTextSaturation = textSaturation;
    this.selectedBgColor = bgColor;
    this.selectedBgSaturation = bgSaturation;
    this.textClass = text;
    this.bgClass = bg;
  }

  refreshGradient(): void {
    this.gradientClass = this.tw.generateRandomGradient(this.selectedVariant);
  }

  get textColorClass() {
    return 'text-' + this.selectedTextColor + '-' + this.selectedTextSaturation;
  }

  get bgColorClass() {
    return 'bg-' + this.selectedBgColor + '-' + this.selectedBgSaturation;
  }

  refreshAll(): void {
    this.refreshTextAndBg();
    this.refreshGradient();
  }

  copy(text: string) {
    const type = text.split('-')[0];
    const sat = text.split('-')[2];
    const inverseSat = Number(sat) > 500 ? 400 : 800;
    const classList = type === 'bg' ?  `${text} text-zinc-${inverseSat}`: `${text} bg-zinc-${inverseSat}`;
    this.notify.show({
      title: 'Copied',
      message: `<span class='p-2 bg-zinc-800 truncate'>${text}</span>`,
      classList: classList,
      media: {
        id: '',
        title: 'Copied',
        content: {
          type: 'icon',
          data: {
            name: 'copy',
            type: "fontawesome",
            svgPath: faCopy
          }
        }
      }
    })
    this.clipboard.copy(text);
  }
}
