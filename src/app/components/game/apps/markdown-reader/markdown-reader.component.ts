import { Component, Input } from '@angular/core';
import {MarkdownComponent} from 'ngx-markdown';

@Component({
  selector: 'app-markdown-reader',
  imports: [MarkdownComponent],
  styles: [
    `.markdown-body {
      @apply prose text-xs leading-5  mx-auto;
    }`,
  ],
  template: `
    <section class="bg-white">
      <article class="markdown-body">
        <markdown [src]="document"></markdown>
      </article>
    </section>`
})
export class MarkdownReaderComponent {
  docsPath = 'assets/docs/';
  document!: string;

  private _filename: string = 'gameplay.doc.md';

  @Input()
  set filename(value: string) {
    this._filename = value || 'gameplay.doc.md';
    this.document = this.docsPath + this._filename;
  }

  get filename() {
    return this._filename;
  }

  constructor() {
    this.document = this.docsPath + this._filename;
  }
}
