import {Component, Input, ViewEncapsulation} from '@angular/core';
import {SafeHtml} from '@angular/platform-browser';
import {Observable} from 'rxjs';
import {AsyncPipe} from '@angular/common';

@Component({
  selector: 'svg-icon',
  standalone: true,
  encapsulation: ViewEncapsulation.ShadowDom,
  imports: [
    AsyncPipe
  ],
  template: `
    <div class="w-full h-auto" [class]="cssClass" [innerHTML]="icon | async"></div>`
})
export class SvgIconComponent  {
  @Input() icon!: Observable<SafeHtml>;
  @Input() cssClass!: string;
}
