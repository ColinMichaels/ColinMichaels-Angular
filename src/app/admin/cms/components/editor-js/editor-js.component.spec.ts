import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';

import {MediaLibraryItem} from '../../../media-library/models/media-library.models';
import {MediaLibraryService} from '../../../media-library/services/media-library.service';
import {EditorJsComponent} from './editor-js.component';

const existingInlineImage: MediaLibraryItem = {
  id: 'existing-inline-image',
  displayName: 'Existing inline image',
  originalFileName: 'existing-inline.webp',
  fileName: 'existing-inline.webp',
  extension: 'webp',
  mediaType: 'image',
  mimeType: 'image/webp',
  thumbnailUrl: 'https://cdn.example.com/existing-inline-thumbnail.webp',
  previewUrl: 'https://cdn.example.com/existing-inline-preview.webp',
  originalUrl: 'https://cdn.example.com/existing-inline.webp',
  downloadUrl: 'https://cdn.example.com/existing-inline-download.webp',
  width: 1920,
  height: 1080,
  sizeBytes: 120000,
  folderId: null,
  folderPath: 'Blog / Existing',
  tags: ['blog', 'inline-image'],
  favorite: false,
  rating: null,
  colorLabel: null,
  notes: null,
  altText: 'A saved inline image',
  description: 'Existing image caption.',
  status: 'ready',
  processingError: null,
  uploadedAt: '2026-07-11T12:00:00.000Z',
};

async function waitForEditorLoad(fixture: ComponentFixture<EditorJsComponent>): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 5000) {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    if (!element.textContent?.includes('Loading editor...')) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error('Timed out waiting for Editor.js to initialize.');
}

describe('EditorJsComponent', () => {
  let fixture: ComponentFixture<EditorJsComponent>;

  beforeEach(async () => {
    const mediaLibraryService = {
      listenToMediaItems: jasmine.createSpy('listenToMediaItems').and.returnValue(of([existingInlineImage])),
      listenToFolders: jasmine.createSpy('listenToFolders').and.returnValue(of([])),
    } satisfies Pick<MediaLibraryService, 'listenToMediaItems' | 'listenToFolders'>;

    await TestBed.configureTestingModule({
      imports: [EditorJsComponent],
      providers: [
        {provide: MediaLibraryService, useValue: mediaLibraryService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorJsComponent);
  });

  it('initializes with the YouTube embed tool registered', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [
        {
          id: 'youtube-embed',
          type: 'youtubeEmbed',
          data: {
            url: 'https://www.youtube.com/watch?v=L229QDxDakU',
          },
        },
      ],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toContain('Cannot read properties of undefined');
    expect(element.textContent).not.toContain('Unable to load YouTube Embed Editor.js tool.');
    expect(element.querySelector('iframe')?.getAttribute('src')).toContain('https://www.youtube.com/embed/L229QDxDakU');
  });

  it('initializes saved Suno blocks with the dedicated song tool', async () => {
    const songId = '44cd6eab-d6d7-4cb9-bea7-af398776556e';
    fixture.componentRef.setInput('initialData', {
      blocks: [
        {
          id: 'suno-embed',
          type: 'sunoEmbed',
          data: {
            url: `https://suno.com/song/${songId}`,
            caption: 'Some Memories Never Stop Playing',
          },
        },
      ],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLInputElement>('[data-suno-embed-url]')?.value)
      .toBe(`https://suno.com/song/${songId}`);
    expect(element.querySelector('iframe')?.getAttribute('src')).toBe(`https://suno.com/embed/${songId}`);
  });

  it('initializes saved Markdown blocks with the custom source editor', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{
        id: 'markdown-block',
        type: 'markdown',
        data: {markdown: '## Existing Markdown\n\nPreserve **this source**.'},
      }],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);

    const textarea = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLTextAreaElement>('[data-markdown-text]');

    expect(textarea).not.toBeNull();
    expect(textarea?.value).toContain('## Existing Markdown');
    expect(textarea?.value).toContain('**this source**');
  });

  it('renders the existing List tool with the bounded Steps presentation tune', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{
        id: 'steps-list',
        type: 'list',
        data: {
          style: 'ordered',
          meta: {},
          items: [
            {content: 'Draft the article', meta: {}, items: []},
            {content: 'Review the preview', meta: {}, items: []},
          ],
        },
        tunes: {listPresentation: {presentation: 'steps'}},
      }],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);

    const element = fixture.nativeElement as HTMLElement;
    const presentation = element.querySelector<HTMLElement>(
      '.cms-list-presentation[data-list-presentation="steps"]'
    );

    expect(presentation).not.toBeNull();
    expect(presentation?.querySelector('.cdx-list-ordered')).not.toBeNull();
    expect(presentation?.textContent).toContain('Draft the article');
    expect(presentation?.textContent).toContain('Review the preview');
  });

  it('warns authors about a repeated title heading and Markdown headings outside the contents rail', async () => {
    fixture.componentRef.setInput('previewTitle', 'One Clear Article Title');
    fixture.componentRef.setInput('initialData', {
      blocks: [
        {
          id: 'repeated-title',
          type: 'header',
          data: {text: 'One <em>Clear</em> Article Title', level: 2},
        },
        {
          id: 'markdown-heading',
          type: 'markdown',
          data: {markdown: '## Hidden from generated contents\n\nBody copy.'},
        },
      ],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);

    const element = fixture.nativeElement as HTMLElement;
    const warning = element.querySelector<HTMLElement>('[role="status"]');

    expect(warning?.textContent).toContain('repeats the post title');
    expect(warning?.textContent).toContain('not included in the article table of contents');

    clickButtonByText(fixture, 'JSON');
    await waitForSelectorState(fixture, '[data-editor-json]', true);

    expect(element.textContent).toContain('Valid JSON · 2 blocks · 2 warnings');
  });

  it('initializes the reusable Cat Corner unlock tool without image configuration', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{
        id: 'cat-corner-unlock',
        type: 'catCornerUnlock',
        data: {},
      }],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);

    const element = fixture.nativeElement as HTMLElement;
    const document = await fixture.componentInstance.getDocument();

    expect(element.querySelector('[data-cat-corner-unlock]')).not.toBeNull();
    expect(document.blocks[0]).toEqual(jasmine.objectContaining({
      type: 'catCornerUnlock',
      data: {},
    }));
  });

  it('fills the current inline image block from the existing media library', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{
        id: 'inline-image-block',
        type: 'image',
        data: {},
      }],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);

    clickButtonByText(fixture, 'Choose Existing');
    fixture.detectChanges();
    const sizeSelect = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLSelectElement>('[data-testid="cms-image-size"]');

    if (sizeSelect) {
      sizeSelect.value = 'wide';
      sizeSelect.dispatchEvent(new Event('change'));
    }

    clickButtonByText(fixture, 'Existing inline image');
    fixture.detectChanges();
    clickButtonByText(fixture, 'Use Selected Image');
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    const document = await fixture.componentInstance.getDocument();
    const imageBlocks = document.blocks.filter(block => block.type === 'image');

    expect(imageBlocks.length).toBe(1);
    expect(imageBlocks[0].data).toEqual(jasmine.objectContaining({
      url: existingInlineImage.originalUrl,
      alt: existingInlineImage.altText,
      caption: existingInlineImage.description,
      width: existingInlineImage.width,
      height: existingInlineImage.height,
      imageLayout: 'contained',
      imageSize: 'wide',
      stretched: false,
    }));
    expect(imageBlocks[0].data['file']).toEqual(jasmine.objectContaining({
      url: existingInlineImage.originalUrl,
      alt: existingInlineImage.altText,
      width: existingInlineImage.width,
      height: existingInlineImage.height,
    }));
  });

  it('round trips raw JSON edits back into the WYSIWYG editor', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{
        id: 'original-paragraph',
        type: 'paragraph',
        data: {text: 'Original visual content.'},
      }],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);
    clickButtonByText(fixture, 'JSON');
    await fixture.whenStable();
    fixture.detectChanges();

    const textarea = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLTextAreaElement>('[data-editor-json]');
    const editedDocument = {
      time: 1784918400000,
      blocks: [{
        id: 'edited-paragraph',
        type: 'paragraph',
        data: {text: 'Edited through raw JSON.'},
      }],
      version: '2.31.6',
    };

    expect(textarea).not.toBeNull();
    expect(textarea?.value).toContain('Original visual content.');

    if (textarea) {
      textarea.value = JSON.stringify(editedDocument, null, 2);
      textarea.dispatchEvent(new Event('input'));
    }

    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Valid JSON · 1 block');

    clickButtonByText(fixture, 'WYSIWYG');
    await waitForSelectorState(fixture, '[data-editor-json]', false);

    const document = await fixture.componentInstance.getDocument();
    const renderedParagraph = (fixture.nativeElement as HTMLElement).querySelector('.ce-paragraph');

    expect(document).toEqual(jasmine.objectContaining({
      blocks: editedDocument.blocks,
      version: editedDocument.version,
    }));
    expect(document.time).toEqual(jasmine.any(Number));
    expect(renderedParagraph?.textContent).toContain('Edited through raw JSON.');
  });

  it('renders the current unsaved document through Production Preview and keeps it synchronized with JSON', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{
        id: 'preview-paragraph',
        type: 'paragraph',
        data: {text: 'Unsaved visual preview content.'},
      }],
    });
    fixture.componentRef.setInput('previewTitle', 'Current unsaved title');
    fixture.componentRef.setInput('previewExcerpt', 'Current unsaved excerpt.');
    fixture.componentRef.setInput('previewPostId', 'preview-post');
    fixture.componentRef.setInput('previewPostSlug', 'preview-post');
    fixture.detectChanges();
    await waitForEditorLoad(fixture);

    clickButtonByText(fixture, 'Production Preview');
    await waitForSelectorState(fixture, '[data-testid="cms-production-preview"]', true);

    let element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Current unsaved title');
    expect(element.textContent).toContain('Current unsaved excerpt.');
    expect(element.textContent).toContain('Unsaved visual preview content.');
    expect(element.querySelector('app-blog-block-renderer')).not.toBeNull();

    clickButtonByText(fixture, 'JSON');
    await waitForSelectorState(fixture, '[data-editor-json]', true);
    const textarea = element.querySelector<HTMLTextAreaElement>('[data-editor-json]');

    if (textarea) {
      textarea.value = JSON.stringify({
        blocks: [{id: 'json-preview', type: 'paragraph', data: {text: 'Unsaved JSON preview content.'}}],
      }, null, 2);
      textarea.dispatchEvent(new Event('input'));
    }

    clickButtonByText(fixture, 'Production Preview');
    await waitForSelectorState(fixture, '[data-testid="cms-production-preview"]', true);
    element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Unsaved JSON preview content.');
    expect((await fixture.componentInstance.getDocument()).blocks[0].id).toBe('json-preview');
  });

  it('refuses Production Preview when the current JSON source is invalid', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{id: 'safe', type: 'paragraph', data: {text: 'Safe content.'}}],
    });
    fixture.detectChanges();
    await waitForEditorLoad(fixture);
    clickButtonByText(fixture, 'JSON');
    await waitForSelectorState(fixture, '[data-editor-json]', true);

    const textarea = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('[data-editor-json]');

    if (textarea) {
      textarea.value = '{"blocks": [';
      textarea.dispatchEvent(new Event('input'));
    }

    clickButtonByText(fixture, 'Production Preview');
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-editor-json]')).not.toBeNull();
    expect(element.querySelector('[data-testid="cms-production-preview"]')).toBeNull();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Invalid JSON:');
  });

  it('supports arrow, Home, and End keyboard navigation across Article Content modes', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{id: 'keyboard', type: 'paragraph', data: {text: 'Keyboard preview.'}}],
    });
    fixture.detectChanges();
    await waitForEditorLoad(fixture);

    const element = fixture.nativeElement as HTMLElement;
    const visualTab = element.querySelector<HTMLButtonElement>('#editor-view-tab-visual');
    visualTab?.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    await waitForSelectorState(fixture, '[data-testid="cms-production-preview"]', true);

    const previewTab = element.querySelector<HTMLButtonElement>('#editor-view-tab-preview');
    expect(previewTab?.getAttribute('aria-selected')).toBe('true');
    previewTab?.dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true}));
    await waitForSelectorState(fixture, '[data-editor-json]', true);

    const jsonTab = element.querySelector<HTMLButtonElement>('#editor-view-tab-json');
    expect(jsonTab?.getAttribute('aria-selected')).toBe('true');
    jsonTab?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home', bubbles: true}));
    await waitForSelectorState(fixture, '[data-editor-json]', false);
    expect(visualTab?.getAttribute('aria-selected')).toBe('true');
  });

  it('keeps invalid source in JSON mode and reports the validation error', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{
        id: 'safe-paragraph',
        type: 'paragraph',
        data: {text: 'Keep this document safe.'},
      }],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);
    clickButtonByText(fixture, 'JSON');
    await fixture.whenStable();
    fixture.detectChanges();

    const textarea = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLTextAreaElement>('[data-editor-json]');

    if (textarea) {
      textarea.value = '{"blocks": [';
      textarea.dispatchEvent(new Event('input'));
    }

    fixture.detectChanges();
    clickButtonByText(fixture, 'WYSIWYG');
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-editor-json]')).not.toBeNull();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Invalid JSON:');
    await expectAsync(fixture.componentInstance.getDocument()).toBeRejectedWithError(/Invalid JSON:/);
  });

  it('emits unified dirty-state changes for raw JSON edits and preserves invalid source for recovery', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{id: 'safe', type: 'paragraph', data: {text: 'Safe content.'}}],
    });
    fixture.detectChanges();
    await waitForEditorLoad(fixture);
    const changed = spyOn(fixture.componentInstance.contentChanged, 'emit');

    clickButtonByText(fixture, 'JSON');
    await fixture.whenStable();
    fixture.detectChanges();

    const textarea = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('[data-editor-json]');
    expect(textarea).not.toBeNull();

    if (textarea) {
      textarea.value = '{"blocks": [';
      textarea.dispatchEvent(new Event('input'));
    }

    const recovery = await fixture.componentInstance.getRecoverySnapshot();
    expect(changed).toHaveBeenCalled();
    expect(recovery).toEqual({mode: 'json', source: '{"blocks": ['});
  });

  it('preserves unknown JSON blocks through the registered compatibility tool', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{
        id: 'safe-paragraph',
        type: 'paragraph',
        data: {text: 'Keep this document safe.'},
      }],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);
    clickButtonByText(fixture, 'JSON');
    await fixture.whenStable();
    fixture.detectChanges();

    const textarea = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLTextAreaElement>('[data-editor-json]');
    const unknownDocument = {
      blocks: [{
        id: 'future-widget',
        type: 'futureWidget',
        data: {
          title: 'Preserve this future block',
          settings: {accent: 'cyan'},
        },
        tunes: {
          alignment: {alignment: 'center'},
        },
      }],
    };

    if (textarea) {
      textarea.value = JSON.stringify(unknownDocument, null, 2);
      textarea.dispatchEvent(new Event('input'));
    }

    fixture.detectChanges();

    const jsonElement = fixture.nativeElement as HTMLElement;
    expect(jsonElement.textContent).toContain('Valid JSON · 1 block · 1 preserved block');
    expect(jsonElement.textContent).toContain('Block 1 (futureWidget) is unsupported');

    clickButtonByText(fixture, 'WYSIWYG');
    await waitForSelectorState(fixture, '[data-editor-json]', false);

    const visualElement = fixture.nativeElement as HTMLElement;
    const document = await fixture.componentInstance.getDocument();

    expect(visualElement.querySelector('[data-unsupported-block="true"]')).not.toBeNull();
    expect(visualElement.textContent).toContain('Unsupported block preserved: futureWidget');
    expect(document.blocks).toEqual([{
      id: 'future-widget',
      type: 'unsupported',
      data: {
        originalType: 'futureWidget',
        originalData: {
          title: 'Preserve this future block',
          settings: {accent: 'cyan'},
        },
        originalTunes: {
          alignment: {alignment: 'center'},
        },
      },
    }]);
  });

  it('blocks malformed known blocks from rendering or saving', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [{
        id: 'safe-paragraph',
        type: 'paragraph',
        data: {text: 'Keep this document safe.'},
      }],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);
    clickButtonByText(fixture, 'JSON');
    await fixture.whenStable();
    fixture.detectChanges();

    const textarea = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLTextAreaElement>('[data-editor-json]');

    if (textarea) {
      textarea.value = JSON.stringify({
        blocks: [{
          id: 'malformed-header',
          type: 'header',
          data: {text: 42, level: 2},
        }],
      }, null, 2);
      textarea.dispatchEvent(new Event('input'));
    }

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent)
      .toContain('Block 1 (header) has an invalid "text" field.');

    clickButtonByText(fixture, 'WYSIWYG');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[data-editor-json]')).not.toBeNull();
    await expectAsync(fixture.componentInstance.getDocument())
      .toBeRejectedWithError(/Block 1 \(header\) has an invalid "text" field\./);
  });
});

function clickButtonByText(fixture: ComponentFixture<EditorJsComponent>, text: string): void {
  const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
    .find(candidate => candidate.textContent?.includes(text));

  expect(button).withContext(`Expected button containing "${text}"`).toBeTruthy();
  button?.click();
}

async function waitForSelectorState(
  fixture: ComponentFixture<EditorJsComponent>,
  selector: string,
  shouldExist: boolean
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 5000) {
    await fixture.whenStable();
    fixture.detectChanges();

    const exists = Boolean((fixture.nativeElement as HTMLElement).querySelector(selector));

    if (exists === shouldExist) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 25));
  }

  throw new Error(`Timed out waiting for selector "${selector}" to ${shouldExist ? 'appear' : 'disappear'}.`);
}
