import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {CmsImageLibrarySelection} from './cms-image-block.tool';
import {CmsGalleryBlockData, CmsGalleryBlockTool} from './gallery-block.tool';

interface GalleryToolTestConfig {
  mediaLibrary?: {
    selectImages?: (limit: number) => Promise<readonly CmsImageLibrarySelection[] | null>;
  };
  uploader?: {
    uploadByFile?: (
      file: File,
      onProgress?: (progress: number) => void
    ) => Promise<{
      success: 1;
      file: { url: string; alt?: string; width?: number; height?: number };
    }>;
  };
}

function createTool(
  data: CmsGalleryBlockData = {},
  config: GalleryToolTestConfig = {},
  readOnly = false
): CmsGalleryBlockTool {
  return new CmsGalleryBlockTool({
    data,
    config,
    readOnly,
  } as unknown as BlockToolConstructorOptions<CmsGalleryBlockData>);
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('CmsGalleryBlockTool', () => {
  it('defaults an unknown layout to grid and saves ordered image metadata without undefined fields', () => {
    const tool = createTool({
      title: 'Studio session',
      caption: 'Behind the scenes.',
      layout: 'unknown' as never,
      images: [
        {url: 'https://cdn.example.com/one.webp', alt: 'Console detail', width: 1600, height: 900},
        {url: 'https://cdn.example.com/two.webp', alt: 'Microphone setup', caption: 'Vocal booth'},
      ],
    });
    const block = tool.render();
    const saved = tool.save(block);

    expect(saved.layout).toBe('grid');
    expect(saved.title).toBe('Studio session');
    expect(saved.caption).toBe('Behind the scenes.');
    expect(saved.images).toEqual([
      {url: 'https://cdn.example.com/one.webp', alt: 'Console detail', width: 1600, height: 900},
      {url: 'https://cdn.example.com/two.webp', alt: 'Microphone setup', caption: 'Vocal booth'},
    ]);
  });

  it('adds several Media Library images at once and preserves their selection order', async () => {
    const selections: readonly CmsImageLibrarySelection[] = [
      {
        url: 'https://cdn.example.com/library-one.webp',
        alt: 'Audience from the stage',
        caption: 'Opening night',
        imageLayout: 'contained',
        width: 2400,
        height: 1600,
      },
      {
        url: 'https://cdn.example.com/library-two.webp',
        alt: 'Mixing console detail',
        caption: '',
        imageLayout: 'contained',
        width: 1800,
        height: 1200,
      },
    ];
    const selectImages = jasmine.createSpy('selectImages').and.resolveTo(selections);
    const tool = createTool({}, {mediaLibrary: {selectImages}});
    const block = tool.render();

    block.querySelector<HTMLButtonElement>('[data-gallery-add-library]')?.click();
    await settle();

    expect(selectImages).toHaveBeenCalledOnceWith(20);
    expect(tool.save(block).images).toEqual([
      {
        url: selections[0].url,
        alt: selections[0].alt,
        caption: selections[0].caption,
        width: 2400,
        height: 1600,
      },
      {
        url: selections[1].url,
        alt: selections[1].alt,
        width: 1800,
        height: 1200,
      },
    ]);
    expect(block.querySelector<HTMLElement>('[role="status"]')?.textContent)
      .toContain('2 images');
  });

  it('limits a Media Library batch to the remaining gallery capacity', async () => {
    const existingImages = Array.from({length: 19}, (_, index) => ({
      url: `https://cdn.example.com/existing-${index}.webp`,
      alt: `Existing ${index}`,
    }));
    const selectImages = jasmine.createSpy('selectImages').and.resolveTo([
      {
        url: 'https://cdn.example.com/last.webp',
        alt: 'Last available image',
        caption: '',
        imageLayout: 'contained' as const,
      },
    ]);
    const tool = createTool({images: existingImages}, {mediaLibrary: {selectImages}});
    const block = tool.render();

    block.querySelector<HTMLButtonElement>('[data-gallery-add-library]')?.click();
    await settle();

    expect(selectImages).toHaveBeenCalledOnceWith(1);
    expect(tool.save(block).images?.length).toBe(20);
    expect(block.querySelector<HTMLButtonElement>('[data-gallery-add-library]')?.disabled).toBeTrue();
  });

  it('moves and removes images with keyboard-operable controls', () => {
    const tool = createTool({
      layout: 'mosaic',
      images: [
        {url: 'https://cdn.example.com/one.webp', alt: 'First'},
        {url: 'https://cdn.example.com/two.webp', alt: 'Second'},
        {url: 'https://cdn.example.com/three.webp', alt: 'Third'},
      ],
    });
    const block = tool.render();
    const rows = block.querySelectorAll<HTMLElement>('[data-gallery-image-row]');

    rows[2].querySelector<HTMLButtonElement>('[data-gallery-move-up]')?.click();
    expect(tool.save(block).images?.map(image => image.alt)).toEqual(['First', 'Third', 'Second']);

    block.querySelectorAll<HTMLElement>('[data-gallery-image-row]')[0]
      .querySelector<HTMLButtonElement>('[data-gallery-remove]')?.click();
    expect(tool.save(block).images?.map(image => image.alt)).toEqual(['Third', 'Second']);
    expect(block.querySelector<HTMLElement>('[role="status"]')?.textContent).toContain('2 images');
  });

  it('uploads multiple images sequentially with transfer and processing status', async () => {
    const statuses: string[] = [];
    let status: HTMLElement | null = null;
    const uploadByFile = jasmine.createSpy('uploadByFile').and.callFake(async (
      file: File,
      onProgress?: (progress: number) => void
    ) => {
      onProgress?.(50);
      onProgress?.(100);
      statuses.push(status?.textContent ?? '');
      return {
        success: 1 as const,
        file: {
          url: `https://cdn.example.com/${file.name}.webp`,
          alt: file.name,
          width: 1200,
          height: 800,
        },
      };
    });
    const tool = createTool({}, {uploader: {uploadByFile}});
    const block = tool.render();
    status = block.querySelector<HTMLElement>('[role="status"]');
    const input = block.querySelector<HTMLInputElement>('[data-gallery-upload-input]');
    const files = [
      new File(['one'], 'one.jpg', {type: 'image/jpeg'}),
      new File(['two'], 'two.jpg', {type: 'image/jpeg'}),
    ];

    Object.defineProperty(input, 'files', {value: files});
    input?.dispatchEvent(new Event('change'));
    await settle();

    expect(uploadByFile).toHaveBeenCalledTimes(2);
    expect(statuses.some(message => message.includes('Processing image'))).toBeTrue();
    expect(tool.save(block).images?.map(image => image.alt)).toEqual(['one.jpg', 'two.jpg']);
  });

  it('disables all mutation controls in read-only mode', () => {
    const tool = createTool({
      images: [
        {url: 'https://cdn.example.com/one.webp', alt: 'First'},
        {url: 'https://cdn.example.com/two.webp', alt: 'Second'},
      ],
    }, {}, true);
    const block = tool.render();

    expect([...block.querySelectorAll<HTMLButtonElement>('button')].every(button => button.disabled)).toBeTrue();
    expect([...block.querySelectorAll<HTMLInputElement>('input')].every(input => input.disabled || input.readOnly)).toBeTrue();
  });
});
