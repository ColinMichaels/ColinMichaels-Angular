import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {UnsupportedBlockTool, UnsupportedEditorBlockData} from './unsupported-block.tool';

function createTool(data: UnsupportedEditorBlockData): UnsupportedBlockTool {
  return new UnsupportedBlockTool({
    data,
    readOnly: false,
  } as BlockToolConstructorOptions<UnsupportedEditorBlockData>);
}

describe('UnsupportedBlockTool', () => {
  it('renders an inert warning and preserves the original block data', () => {
    const data: UnsupportedEditorBlockData = {
      originalType: 'futureGallery',
      originalData: {
        layout: 'mosaic',
        images: [
          {url: 'https://example.com/one.webp', alt: 'First image'},
          {url: 'https://example.com/two.webp', alt: 'Second image'},
        ],
      },
      originalTunes: {
        alignment: {value: 'center'},
      },
    };
    const tool = createTool(data);
    const element = tool.render();

    expect(element.dataset['unsupportedBlock']).toBe('true');
    expect(element.textContent).toContain('Unsupported block preserved: futureGallery');
    expect(element.textContent).toContain('not rendered on the public article');
    expect(element.querySelector('[contenteditable="true"]')).toBeNull();
    expect(element.querySelector('[data-unsupported-block-source]')?.textContent).toContain('"layout": "mosaic"');
    expect(tool.save()).toEqual(data);
    expect(tool.validate(data)).toBeTrue();
  });

  it('rejects malformed preservation envelopes', () => {
    const tool = createTool({originalType: 'futureBlock', originalData: {}});

    expect(tool.validate({originalType: '', originalData: {}})).toBeFalse();
    expect(tool.validate({originalType: 'futureBlock', originalData: [] as never})).toBeFalse();
  });
});
