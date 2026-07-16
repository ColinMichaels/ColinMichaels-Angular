import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {YouTubeEmbedBlockData, YouTubeEmbedBlockTool} from './youtube-embed-block.tool';

function createTool(data: YouTubeEmbedBlockData = {}, readOnly = false): YouTubeEmbedBlockTool {
  return new YouTubeEmbedBlockTool({data, readOnly} as BlockToolConstructorOptions<YouTubeEmbedBlockData>);
}

describe('YouTubeEmbedBlockTool', () => {
  it('preserves the existing youtubeEmbed data contract and renders a safe preview', () => {
    const url = 'https://www.youtube.com/watch?v=L229QDxDakU';
    const tool = createTool({url});
    const element = tool.render();

    expect(YouTubeEmbedBlockTool.toolbox.title).toBe('YouTube');
    expect(element.querySelector<HTMLIFrameElement>('iframe')?.src)
      .toBe('https://www.youtube.com/embed/L229QDxDakU');
    expect(tool.save(element)).toEqual({url});
    expect(tool.validate({url})).toBeTrue();
  });

  it('accepts share and shorts URLs but rejects unrelated hosts', () => {
    const tool = createTool();

    expect(tool.validate({url: 'https://youtu.be/L229QDxDakU'})).toBeTrue();
    expect(tool.validate({url: 'https://www.youtube.com/shorts/L229QDxDakU'})).toBeTrue();
    expect(tool.validate({url: 'https://example.com/watch?v=L229QDxDakU'})).toBeFalse();
  });

  it('honors read-only mode', () => {
    const element = createTool({url: 'https://youtu.be/L229QDxDakU'}, true).render();

    expect(element.querySelector<HTMLInputElement>('input')?.readOnly).toBeTrue();
  });
});
