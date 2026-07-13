import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {AppEmbedBlockData, AppEmbedBlockTool} from './app-embed-block.tool';

function createTool(data: AppEmbedBlockData = {}, readOnly = false): AppEmbedBlockTool {
  return new AppEmbedBlockTool({data, readOnly} as BlockToolConstructorOptions<AppEmbedBlockData>);
}

describe('AppEmbedBlockTool', () => {
  it('provides a simple app URL, title, and starting-height editor', () => {
    const tool = createTool({
      url: 'https://hear-the-hook.captaincolin.chatgpt.site/soundboard',
      caption: 'Hear the Hook',
      height: 820,
    });
    const element = tool.render();

    expect(AppEmbedBlockTool.toolbox.title).toBe('App Embed');
    expect(element.querySelector<HTMLInputElement>('[data-app-embed-url]')?.value)
      .toBe('https://hear-the-hook.captaincolin.chatgpt.site/soundboard');
    expect(element.querySelector<HTMLInputElement>('[data-app-embed-caption]')?.value).toBe('Hear the Hook');
    expect(element.querySelector<HTMLInputElement>('[data-app-embed-height]')?.value).toBe('820');
    expect(tool.save(element)).toEqual({
      url: 'https://hear-the-hook.captaincolin.chatgpt.site/soundboard',
      caption: 'Hear the Hook',
      height: 820,
    });
  });

  it('requires an absolute HTTPS URL', () => {
    const tool = createTool();

    expect(tool.validate({url: 'https://example.com/app'})).toBeTrue();
    expect(tool.validate({url: 'http://example.com/app'})).toBeFalse();
    expect(tool.validate({url: '/relative-app'})).toBeFalse();
  });

  it('honors read-only mode', () => {
    const element = createTool({url: 'https://example.com/app'}, true).render();

    expect(Array.from(element.querySelectorAll('input')).every(input => input.readOnly)).toBeTrue();
  });
});
