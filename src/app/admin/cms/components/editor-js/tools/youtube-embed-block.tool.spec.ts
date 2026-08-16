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
    const element = createTool({
      url: 'https://youtu.be/L229QDxDakU',
      isCompanionVideo: true,
      videoTitle: 'Field flight',
    }, true).render();

    expect(element.querySelector<HTMLInputElement>('input')?.readOnly).toBeTrue();
    expect(element.querySelector<HTMLInputElement>('[data-youtube-video-title]')?.readOnly).toBeTrue();
    expect(element.querySelector<HTMLInputElement>('[data-youtube-companion-video]')?.disabled).toBeTrue();
  });

  it('persists exact companion metadata and reveals it only for a selected companion', () => {
    const tool = createTool({url: 'https://youtu.be/L229QDxDakU'});
    const element = tool.render();
    const companion = element.querySelector<HTMLInputElement>('[data-youtube-companion-video]')!;
    const panel = element.querySelector<HTMLElement>('[data-youtube-video-metadata]')!;

    expect(panel.hidden).toBeTrue();
    companion.checked = true;
    companion.dispatchEvent(new Event('change'));
    expect(panel.hidden).toBeFalse();

    element.querySelector<HTMLInputElement>('[data-youtube-video-title]')!.value = ' Field flight ';
    element.querySelector<HTMLTextAreaElement>('[data-youtube-video-description]')!.value = ' Exact public description. ';
    element.querySelector<HTMLInputElement>('[data-youtube-video-upload-date]')!.value = '2026-08-13T13:43:21Z';
    element.querySelector<HTMLInputElement>('[data-youtube-video-duration-seconds]')!.value = '158.4';

    expect(tool.save(element)).toEqual({
      url: 'https://youtu.be/L229QDxDakU',
      isCompanionVideo: true,
      videoTitle: 'Field flight',
      videoDescription: 'Exact public description.',
      videoUploadDate: '2026-08-13T13:43:21Z',
      videoDurationSeconds: 158.4,
    });
  });

  it('rejects malformed optional upload dates and runtimes without requiring metadata on legacy embeds', () => {
    const tool = createTool();

    expect(tool.validate({url: 'https://youtu.be/L229QDxDakU'})).toBeTrue();
    expect(tool.validate({
      url: 'https://youtu.be/L229QDxDakU',
      videoUploadDate: '2026-08-13T13:43:21',
    })).toBeFalse();
    expect(tool.validate({
      url: 'https://youtu.be/L229QDxDakU',
      videoDurationSeconds: 0,
    })).toBeFalse();
    expect(tool.validate({
      url: 'https://youtu.be/L229QDxDakU',
      videoTitle: 'Hidden stale metadata',
    })).toBeFalse();
  });

  it('drops hidden metadata when the companion selection is cleared', () => {
    const url = 'https://youtu.be/L229QDxDakU';
    const tool = createTool({
      url,
      isCompanionVideo: true,
      videoTitle: 'Field flight',
      videoDescription: 'Exact public description.',
      videoUploadDate: '2026-08-13',
      videoDurationSeconds: 158,
    });
    const element = tool.render();

    element.querySelector<HTMLInputElement>('[data-youtube-companion-video]')!.checked = false;

    expect(tool.save(element)).toEqual({url});
  });
});
