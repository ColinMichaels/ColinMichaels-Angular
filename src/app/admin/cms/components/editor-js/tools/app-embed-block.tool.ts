import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

import {DEFAULT_BLOG_APP_EMBED_HEIGHT} from '../../../../../features/blog/utils/blog-embed.util';

export interface AppEmbedBlockData {
  url?: string;
  caption?: string;
  height?: number;
}

const plainTextSanitizer: SanitizerConfig = {};

export class AppEmbedBlockTool implements BlockTool {
  static get toolbox(): {title: string; icon: string} {
    return {
      title: 'App Embed',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="2.25" y="3.25" width="13.5" height="11.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.75 6.25h12.5M5 4.75h.01M7 4.75h.01M9 4.75h.01M6.25 10.5l1.75 1.75 3.75-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.25"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      url: plainTextSanitizer,
      caption: plainTextSanitizer,
      height: plainTextSanitizer,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<AppEmbedBlockData>;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<AppEmbedBlockData>) {
    this.data = normalizeAppEmbedData(options.data);
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-app-embed-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #0891b2',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const heading = document.createElement('p');
    heading.textContent = 'App embed';
    heading.style.cssText = 'margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#0e7490';

    const description = document.createElement('p');
    description.textContent = 'Paste the hosted app URL. Approved apps render in a sandboxed frame; other URLs become safe external links.';
    description.style.cssText = 'margin:4px 0 12px;font-size:12px;line-height:1.45;color:#52525b';

    const urlInput = createInput('App URL', 'https://hear-the-hook.captaincolin.chatgpt.site/soundboard', this.data.url, this.readOnly, 'appEmbedUrl', 'url');
    const captionInput = createInput('Title', 'Hear the Hook voice-cloning awareness demo', this.data.caption, this.readOnly, 'appEmbedCaption', 'text');
    const heightInput = createInput('Starting height', String(DEFAULT_BLOG_APP_EMBED_HEIGHT), String(this.data.height), this.readOnly, 'appEmbedHeight', 'number');
    captionInput.style.marginTop = '12px';
    heightInput.style.marginTop = '12px';

    const heightField = heightInput.querySelector<HTMLInputElement>('input');

    if (heightField) {
      heightField.min = '360';
      heightField.max = '2400';
      heightField.step = '10';
    }

    wrapper.append(heading, description, urlInput, captionInput, heightInput);

    return wrapper;
  }

  save(block: HTMLElement): AppEmbedBlockData {
    const height = Number(getFieldValue(block, '[data-app-embed-height]'));

    return {
      url: getFieldValue(block, '[data-app-embed-url]'),
      caption: getFieldValue(block, '[data-app-embed-caption]'),
      height: Number.isFinite(height) ? height : DEFAULT_BLOG_APP_EMBED_HEIGHT,
    };
  }

  validate(data: AppEmbedBlockData): boolean {
    if (typeof data.url !== 'string') {
      return false;
    }

    try {
      const url = new URL(data.url);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

function createInput(
  labelText: string,
  placeholder: string,
  value: string,
  readOnly: boolean,
  datasetKey: string,
  type: 'text' | 'url' | 'number',
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

function normalizeAppEmbedData(data: AppEmbedBlockData | undefined): Required<AppEmbedBlockData> {
  return {
    url: typeof data?.url === 'string' ? data.url : '',
    caption: typeof data?.caption === 'string' ? data.caption : '',
    height: typeof data?.height === 'number' && Number.isFinite(data.height)
      ? data.height
      : DEFAULT_BLOG_APP_EMBED_HEIGHT,
  };
}
