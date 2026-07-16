import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

export interface YouTubeEmbedBlockData {
  url?: string;
}

const plainTextSanitizer: SanitizerConfig = {};
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export class YouTubeEmbedBlockTool implements BlockTool {
  static get toolbox(): {title: string; icon: string} {
    return {
      title: 'YouTube',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="1.75" y="4" width="14.5" height="10" rx="2.5" fill="currentColor"/><path d="m7.25 6.75 4 2.25-4 2.25v-4.5Z" fill="white"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {url: plainTextSanitizer};
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<YouTubeEmbedBlockData>;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<YouTubeEmbedBlockData>) {
    this.data = {
      url: typeof options.data?.url === 'string' ? options.data.url : '',
    };
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-youtube-embed-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #dc2626',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const heading = document.createElement('p');
    heading.textContent = 'YouTube video';
    heading.style.cssText = 'margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#b91c1c';

    const description = document.createElement('p');
    description.textContent = 'Paste a YouTube watch, short, or share URL. The saved block remains compatible with existing posts.';
    description.style.cssText = 'margin:4px 0 12px;font-size:12px;line-height:1.45;color:#52525b';

    const label = document.createElement('label');
    label.style.cssText = 'display:block';

    const labelText = document.createElement('span');
    labelText.textContent = 'Video URL';
    labelText.style.cssText = 'display:block;margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#71717a';

    const input = document.createElement('input');
    input.type = 'url';
    input.value = this.data.url;
    input.placeholder = 'https://www.youtube.com/watch?v=...';
    input.readOnly = this.readOnly;
    input.dataset['youtubeEmbedUrl'] = 'true';
    input.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #d4d4d8;background:#fff;padding:9px 10px;font:inherit;font-size:14px;color:#18181b;outline:none';

    const preview = document.createElement('div');
    preview.dataset['youtubeEmbedPreview'] = 'true';
    preview.style.cssText = 'margin-top:12px';

    const updatePreview = (): void => renderPreview(preview, input.value);
    input.addEventListener('input', updatePreview);

    label.append(labelText, input);
    wrapper.append(heading, description, label, preview);
    updatePreview();

    return wrapper;
  }

  save(block: HTMLElement): YouTubeEmbedBlockData {
    return {
      url: block.querySelector<HTMLInputElement>('[data-youtube-embed-url]')?.value.trim() ?? '',
    };
  }

  validate(data: YouTubeEmbedBlockData): boolean {
    return getYouTubeVideoId(data.url ?? '') !== null;
  }
}

function renderPreview(container: HTMLElement, url: string): void {
  container.replaceChildren();
  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    const message = document.createElement('p');
    message.textContent = url.trim() ? 'Enter a valid YouTube URL to preview the video.' : 'Video preview will appear here.';
    message.style.cssText = 'margin:0;border:1px dashed #d4d4d8;padding:18px;text-align:center;font-size:12px;color:#71717a';
    container.append(message);
    return;
  }

  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube.com/embed/${videoId}`;
  frame.title = 'YouTube video preview';
  frame.loading = 'lazy';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.style.cssText = 'display:block;width:100%;aspect-ratio:16/9;border:0;background:#18181b';
  container.append(frame);
}

function getYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    let videoId = '';

    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (YOUTUBE_HOSTS.has(url.hostname)) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      videoId = url.searchParams.get('v') ?? '';

      if (!videoId && ['embed', 'shorts', 'live'].includes(pathParts[0] ?? '')) {
        videoId = pathParts[1] ?? '';
      }
    }

    return /^[A-Za-z0-9_-]{6,20}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}
