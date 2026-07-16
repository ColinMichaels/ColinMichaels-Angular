import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {SunoEmbedBlockData, SunoEmbedBlockTool} from './suno-embed-block.tool';

const songId = '44cd6eab-d6d7-4cb9-bea7-af398776556e';

function createTool(data: SunoEmbedBlockData = {}, readOnly = false): SunoEmbedBlockTool {
  return new SunoEmbedBlockTool({data, readOnly} as BlockToolConstructorOptions<SunoEmbedBlockData>);
}

describe('SunoEmbedBlockTool', () => {
  it('renders a sandboxed preview and saves a canonical song URL', () => {
    const tool = createTool({
      url: `https://suno.com/embed/${songId}`,
      caption: 'Some Memories Never Stop Playing',
    });
    const element = tool.render();
    const frame = element.querySelector<HTMLIFrameElement>('iframe');

    expect(SunoEmbedBlockTool.toolbox.title).toBe('Suno Song');
    expect(frame?.getAttribute('src')).toBe(`https://suno.com/embed/${songId}`);
    expect(frame?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-popups');
    expect(tool.save(element)).toEqual({
      url: `https://suno.com/song/${songId}`,
      caption: 'Some Memories Never Stop Playing',
    });
  });

  it('rejects non-song URLs and updates the inline preview', () => {
    const tool = createTool();
    const element = tool.render();
    const input = element.querySelector<HTMLInputElement>('[data-suno-embed-url]')!;

    expect(tool.validate({url: 'https://suno.com/playlist/example'})).toBeFalse();
    expect(element.querySelector('iframe')).toBeNull();

    input.value = `https://suno.com/song/${songId}`;
    input.dispatchEvent(new Event('input'));

    expect(element.querySelector('iframe')?.getAttribute('src')).toBe(`https://suno.com/embed/${songId}`);
    expect(tool.validate({url: input.value})).toBeTrue();
  });

  it('honors read-only mode', () => {
    const element = createTool({url: `https://suno.com/song/${songId}`}, true).render();

    expect([...element.querySelectorAll<HTMLInputElement>('input')].every(input => input.readOnly)).toBeTrue();
  });
});
