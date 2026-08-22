import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {MarkdownComponent, provideMarkdown} from 'ngx-markdown';
import {ApplicationManagerService} from '@core-os/app-registry/application-manager.service';

@Component({
  selector: 'app-markdown-reader',
  imports: [MarkdownComponent],
  providers: [provideMarkdown()],
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

  @Input() params: unknown;

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
    const params = currentApp?.params;
    if (params && typeof params === 'object' && 'file' in params && typeof params.file === 'string') {
      this.filename = params.file;
    }
    console.warn('FILE', this.filename);
    this.document = this.docsPath + this.filename;
  }


}
