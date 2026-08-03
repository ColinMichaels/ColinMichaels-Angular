import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {
  CmsImageBlockData,
  CmsImageBlockTool,
  CmsImageLibrarySelection,
} from './cms-image-block.tool';

interface ImageToolTestConfig {
  mediaLibrary?: {
    selectImage?: (current: CmsImageLibrarySelection) => Promise<CmsImageLibrarySelection | null>;
  };
  uploader?: {
    uploadByFile?: (file: File) => Promise<unknown>;
  };
}

function createTool(
  data: CmsImageBlockData = {},
  config: ImageToolTestConfig = {},
  readOnly = false
): CmsImageBlockTool {
  return new CmsImageBlockTool({
    data,
    config,
    readOnly,
  } as unknown as BlockToolConstructorOptions<CmsImageBlockData>);
}

async function settleSelection(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('CmsImageBlockTool media library selection', () => {
  it('fills the current image block from an existing media item', async () => {
    const selection: CmsImageLibrarySelection = {
      url: 'https://cdn.example.com/original.webp',
      alt: 'A mountain trail at sunrise',
      caption: 'Morning in the mountains.',
      imageLayout: 'inlineEnd',
      imageSize: 'medium',
      width: 2400,
      height: 1600,
    };
    const selectImage = jasmine.createSpy('selectImage').and.resolveTo(selection);
    const tool = createTool({}, {mediaLibrary: {selectImage}});
    const block = tool.render();

    block.querySelector<HTMLButtonElement>('[data-image-library]')?.click();
    await settleSelection();

    const saved = tool.save(block);

    expect(selectImage).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      url: '',
      alt: '',
      caption: '',
      imageLayout: 'contained',
    }));
    expect(block.querySelector<HTMLInputElement>('[data-image-url]')?.value).toBe(selection.url);
    expect(block.querySelector<HTMLImageElement>('figure img')?.src).toBe(selection.url);
    expect(saved).toEqual(jasmine.objectContaining({
      url: selection.url,
      alt: selection.alt,
      caption: selection.caption,
      imageLayout: 'inlineEnd',
      imageSize: 'medium',
      stretched: false,
      width: 2400,
      height: 1600,
    }));
    expect(saved.file).toEqual(jasmine.objectContaining({
      url: selection.url,
      alt: selection.alt,
      width: 2400,
      height: 1600,
    }));
  });

  it('preserves current values when library selection is cancelled', async () => {
    const selectImage = jasmine.createSpy('selectImage').and.resolveTo(null);
    const tool = createTool({
      url: 'https://cdn.example.com/current.webp',
      alt: 'Current alt text',
      caption: 'Current caption',
      imageLayout: 'contained',
      withBorder: true,
    }, {mediaLibrary: {selectImage}});
    const block = tool.render();

    block.querySelector<HTMLButtonElement>('[data-image-library]')?.click();
    await settleSelection();

    expect(tool.save(block)).toEqual(jasmine.objectContaining({
      url: 'https://cdn.example.com/current.webp',
      alt: 'Current alt text',
      caption: 'Current caption',
      imageLayout: 'contained',
      withBorder: true,
    }));
  });

  it('keeps the optional size absent for legacy image data until an author chooses one', () => {
    const tool = createTool({
      url: 'https://cdn.example.com/legacy.webp',
      imageLayout: 'contained',
    });
    const block = tool.render();

    expect(block.querySelector<HTMLSelectElement>('[data-image-size]')?.value).toBe('');
    expect(tool.save(block).imageSize).toBeUndefined();

    const sizeSelect = block.querySelector<HTMLSelectElement>('[data-image-size]');

    if (sizeSelect) {
      sizeSelect.value = 'wide';
      sizeSelect.dispatchEvent(new Event('change'));
    }

    expect(tool.save(block).imageSize).toBe('wide');
  });

  it('shows a recoverable message when the editor preview URL is broken', () => {
    const tool = createTool({url: 'https://cdn.example.com/missing.webp'});
    const block = tool.render();

    block.querySelector('figure img')?.dispatchEvent(new Event('error'));

    expect(block.querySelector('figure [role="status"]')?.textContent)
      .toContain('Image preview unavailable');
    expect(tool.save(block).url).toBe('https://cdn.example.com/missing.webp');
  });

  it('shows picker errors without discarding the current image', async () => {
    const selectImage = jasmine.createSpy('selectImage').and.rejectWith(new Error('Media library unavailable.'));
    const tool = createTool({url: 'https://cdn.example.com/current.webp'}, {mediaLibrary: {selectImage}});
    const block = tool.render();

    block.querySelector<HTMLButtonElement>('[data-image-library]')?.click();
    await settleSelection();

    expect(block.querySelector<HTMLElement>('[role="status"]')?.textContent).toBe('Media library unavailable.');
    expect(tool.save(block).url).toBe('https://cdn.example.com/current.webp');
  });

  it('disables library and upload actions when the editor is read only', () => {
    const tool = createTool({}, {
      mediaLibrary: {selectImage: async () => null},
      uploader: {uploadByFile: async () => ({})},
    }, true);
    const block = tool.render();
    const buttons = Array.from(block.querySelectorAll<HTMLButtonElement>('button'));

    expect(buttons.find(button => button.textContent === 'Choose Existing')?.disabled).toBeTrue();
    expect(buttons.find(button => button.textContent === 'Upload New')?.disabled).toBeTrue();
  });
});
