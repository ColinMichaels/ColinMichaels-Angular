import { Component, Input } from '@angular/core';
import {MarkdownComponent} from 'ngx-markdown';

@Component({
  selector: 'app-markdown-reader',
  imports: [MarkdownComponent],
  templateUrl: './markdown-reader.component.html',
  styles: [
    `.markdown-body {
      @apply prose text-xs leading-5 max-w-4xl mx-auto;
    }`,
  ],
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
    console.warn('MarkdownReaderComponent initialized', this.document, this.filename);
  }
}
