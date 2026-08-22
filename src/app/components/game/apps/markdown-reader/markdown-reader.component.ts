import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {MarkdownComponent, provideMarkdown} from 'ngx-markdown';
import {
  ApplicationFileDescriptor,
  isApplicationFileOpenParams,
} from '@core-os/app-registry/application-manager.models';

const BUNDLED_DOCUMENTS = new Set([
  'cipher.md',
  'colinos-demo.doc.md',
  'gameplay.doc.md',
  'tooltip.doc.md',
]);

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
    @if (finderFile) {
      <section class="h-full overflow-y-auto bg-zinc-950 p-6 text-zinc-100" [attr.aria-labelledby]="finderFileTitleId">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Virtual file</p>
        <h1 [id]="finderFileTitleId" class="mt-2 break-words text-xl font-semibold">{{ finderFile.name }}</h1>
        <dl class="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt class="text-zinc-400">Kind</dt><dd>{{ finderFile.mimeType || finderFile.type }}</dd>
          <dt class="text-zinc-400">Location</dt><dd class="break-all">{{ finderFile.virtualPath }}</dd>
          @if (finderFile.size !== undefined) {
            <dt class="text-zinc-400">Size</dt><dd>{{ finderFile.size }} bytes</dd>
          }
        </dl>
        <p class="mt-6 max-w-prose rounded-lg border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          Finder stores metadata for this virtual item, but no readable file contents. A future local-folder connection must be explicitly approved before this app can read files from the device.
        </p>
      </section>
    } @else {
    <section class="bg-white h-full min-h-screen overflow-y-auto py-4">
      <article class="markdown-body">
        <markdown [src]="document"></markdown>
      </article>
    </section>
    }`
})
export class MarkdownReaderComponent {
  private static nextInstanceId = 0;

  docsPath = 'assets/docs/';
  document = `${this.docsPath}gameplay.doc.md`;
  finderFile?: ApplicationFileDescriptor;
  readonly finderFileTitleId = `finder-file-title-${++MarkdownReaderComponent.nextInstanceId}`;

  private _filename: string = 'gameplay.doc.md';
  private _params: unknown;

  @Input()
  set params(value: unknown) {
    this._params = value;
    if (isApplicationFileOpenParams(value)) {
      this.finderFile = {...value.file};
      return;
    }
    this.finderFile = undefined;
    if (value && typeof value === 'object') {
      const candidate = value as {file?: unknown; filename?: unknown};
      const requestedFilename = typeof candidate.file === 'string'
        ? candidate.file
        : typeof candidate.filename === 'string' ? candidate.filename : undefined;
      if (requestedFilename) {
        this.filename = requestedFilename;
      }
    }
  }

  get params(): unknown {
    return this._params;
  }

  @Input()
  set filename(value: string) {
    this._filename = this.safeDocumentName(value) ?? 'gameplay.doc.md';
    this.finderFile = undefined;
    this.document = this.docsPath + this._filename;
  }

  get filename() {
    return this._filename;
  }

  private safeDocumentName(value: string): string | undefined {
    const normalized = value.trim();
    return BUNDLED_DOCUMENTS.has(normalized) ? normalized : undefined;
  }
}
