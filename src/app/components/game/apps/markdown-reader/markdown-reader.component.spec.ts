import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MarkdownReaderComponent} from './markdown-reader.component';

describe('MarkdownReaderComponent', () => {
  let component: MarkdownReaderComponent;
  let fixture: ComponentFixture<MarkdownReaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [MarkdownReaderComponent]}).compileComponents();
    fixture = TestBed.createComponent(MarkdownReaderComponent);
    component = fixture.componentInstance;
  });

  it('renders Finder metadata without fetching virtual file contents', () => {
    component.params = {
      source: 'finder',
      content: {kind: 'metadata-only'},
      file: {
        id: 'notes',
        name: 'Release Notes.md',
        virtualPath: '/Documents/Release Notes.md',
        type: 'document',
        mimeType: 'text/markdown',
        size: 512,
      },
    };
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(component.finderFile?.id).toBe('notes');
    expect(element.querySelector('markdown')).toBeNull();
    expect(element.textContent).toContain('Release Notes.md');
    expect(element.textContent).toContain('no readable file contents');
  });

  it('keeps trusted bundled-document params separate and rejects path traversal', () => {
    component.params = {file: 'colinos-demo.doc.md'};
    expect(component.finderFile).toBeUndefined();
    expect(component.document).toBe('assets/docs/colinos-demo.doc.md');

    component.params = {file: '../private.md'};
    expect(component.document).toBe('assets/docs/gameplay.doc.md');

    component.params = {file: 'missing.md'};
    expect(component.document).toBe('assets/docs/gameplay.doc.md');
  });

  it('uses a unique accessible title for each supported reader instance', () => {
    component.params = {
      source: 'finder',
      content: {kind: 'metadata-only'},
      file: {id: 'first', name: 'First.md', virtualPath: '/First.md', type: 'document'},
    };
    fixture.detectChanges();
    const secondFixture = TestBed.createComponent(MarkdownReaderComponent);
    secondFixture.componentInstance.params = {
      source: 'finder',
      content: {kind: 'metadata-only'},
      file: {id: 'second', name: 'Second.md', virtualPath: '/Second.md', type: 'document'},
    };
    secondFixture.detectChanges();

    expect(component.finderFileTitleId).not.toBe(secondFixture.componentInstance.finderFileTitleId);
    expect((fixture.nativeElement as HTMLElement).querySelector('section')?.getAttribute('aria-labelledby'))
      .toBe(component.finderFileTitleId);
    secondFixture.destroy();
  });
});
