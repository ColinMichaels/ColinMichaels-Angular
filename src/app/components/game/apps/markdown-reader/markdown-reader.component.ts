import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {MarkdownComponent} from 'ngx-markdown';
import {ApplicationManagerService} from '../../services/application-manager.service';

@Component({
  selector: 'app-markdown-reader',
  imports: [MarkdownComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: [
    `.markdown-body {
      @apply prose text-xs leading-5  mx-auto ;
    }`,
  ],
  template: `
    <section class="bg-white h-screen overflow-y-auto py-4">
      <article class="markdown-body">
        <markdown [src]="document"></markdown>
      </article>
    </section>`
})
export class MarkdownReaderComponent {
  docsPath = 'assets/docs/';
  document!: string;

  private _filename: string = 'gameplay.doc.md';

  @Input() params: any;

  @Input()
  set filename(value: string) {
    this._filename = value || 'gameplay.doc.md';
    this.document = this.docsPath + this._filename;
  }

  get filename() {
    return this._filename;
  }

  constructor(private readonly appManager: ApplicationManagerService) {


    const currentApp = this.appManager.getCurrentApp();

    this.filename = currentApp?.params?.file;
    console.warn('FILE', this.filename);
    this.document = this.docsPath + this.filename;
  }


}
