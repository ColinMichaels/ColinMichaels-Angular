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
      stretched: false,
    }));
    expect(imageBlocks[0].data['file']).toEqual(jasmine.objectContaining({
      url: existingInlineImage.originalUrl,
      alt: existingInlineImage.altText,
      width: existingInlineImage.width,
      height: existingInlineImage.height,
    }));
  });
});

function clickButtonByText(fixture: ComponentFixture<EditorJsComponent>, text: string): void {
  const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
    .find(candidate => candidate.textContent?.includes(text));

  expect(button).withContext(`Expected button containing "${text}"`).toBeTruthy();
  button?.click();
}
