import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

import {getBlogSunoEmbedUrls} from '../../../../../features/blog/utils/blog-suno-embed.util';

export interface SunoEmbedBlockData {
  url?: string;
  caption?: string;
}

const plainTextSanitizer: SanitizerConfig = {};

export class SunoEmbedBlockTool implements BlockTool {
  static get toolbox(): {title: string; icon: string} {
    return {
      title: 'Suno Song',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M12.75 2.5v8.15a2.75 2.75 0 1 1-1.5-2.45V4.55L6.5 5.7v6.2A2.75 2.75 0 1 1 5 9.45V4.5l7.75-2Z" fill="currentColor"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      url: plainTextSanitizer,
      caption: plainTextSanitizer,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<SunoEmbedBlockData>;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<SunoEmbedBlockData>) {
    this.data = normalizeSunoEmbedData(options.data);
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-suno-embed-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #0891b2',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const heading = document.createElement('p');
    heading.textContent = 'Suno song';
    heading.style.cssText = 'margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#0e7490';

    const description = document.createElement('p');
    description.textContent = 'Paste a Suno song or embed URL. The published post uses Suno\'s responsive player and keeps a direct listening link.';
    description.style.cssText = 'margin:4px 0 12px;font-size:12px;line-height:1.45;color:#52525b';

    const urlInput = createInput(
      'Suno URL',
      'https://suno.com/song/44cd6eab-d6d7-4cb9-bea7-af398776556e',
      this.data.url,
      this.readOnly,
      'sunoEmbedUrl',
      'url'
    );
    const captionInput = createInput(
      'Caption (optional)',
      'Listen to the song on Suno',
      this.data.caption,
      this.readOnly,
      'sunoEmbedCaption',
      'text'
    );
    captionInput.style.marginTop = '12px';

    const preview = document.createElement('div');
    preview.dataset['sunoEmbedPreview'] = 'true';
    preview.style.cssText = 'margin-top:12px;min-height:44px';

    const updatePreview = (): void => {
      preview.replaceChildren(createPreview(urlInput.querySelector('input')?.value));
    };

    urlInput.querySelector('input')?.addEventListener('input', updatePreview);
    updatePreview();

    wrapper.append(heading, description, urlInput, captionInput, preview);
    return wrapper;
  }

  save(block: HTMLElement): SunoEmbedBlockData {
    const rawUrl = getFieldValue(block, '[data-suno-embed-url]');
    const urls = getBlogSunoEmbedUrls(rawUrl);

    return {
      url: urls?.songUrl.toString() ?? rawUrl,
      caption: getFieldValue(block, '[data-suno-embed-caption]'),
    };
  }

  validate(data: SunoEmbedBlockData): boolean {
    return getBlogSunoEmbedUrls(data.url) !== null;
  }
}

function createPreview(value: string | undefined): HTMLElement {
  const urls = getBlogSunoEmbedUrls(value);

  if (!urls) {
    const note = document.createElement('p');
    note.textContent = value?.trim() ? 'Enter a valid Suno song or embed URL.' : 'The player preview appears after a valid URL is entered.';
    note.style.cssText = 'margin:0;border:1px dashed #a1a1aa;padding:11px 12px;font-size:12px;color:#71717a';
    return note;
  }

  const frame = document.createElement('iframe');
  frame.src = urls.embedUrl.toString();
  frame.title = 'Suno song preview';
  frame.loading = 'lazy';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
  frame.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
  frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  frame.style.cssText = 'display:block;width:100%;height:240px;border:0;background:#111827';
  return frame;
}

function createInput(
  labelText: string,
  placeholder: string,
  value: string,
  readOnly: boolean,
  datasetKey: string,
  type: 'text' | 'url'
): HTMLLabelElement {
  const label = document.createElement('label');
  label.style.cssText = 'display:block;min-width:0';

  const text = document.createElement('span');
  text.textContent = labelText;
  text.style.cssText = 'display:block;margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#71717a';

  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.readOnly = readOnly;
  input.dataset[datasetKey] = 'true';
  input.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #d4d4d8;background:#fff;padding:9px 10px;font:inherit;font-size:14px;color:#18181b;outline:none';

  label.append(text, input);
  return label;
}

function getFieldValue(root: ParentNode, selector: string): string {
  return root.querySelector<HTMLInputElement>(selector)?.value.trim() ?? '';
}

function normalizeSunoEmbedData(data: SunoEmbedBlockData | undefined): Required<SunoEmbedBlockData> {
  return {
    url: typeof data?.url === 'string' ? data.url : '',
    caption: typeof data?.caption === 'string' ? data.caption : '',
  };
}
