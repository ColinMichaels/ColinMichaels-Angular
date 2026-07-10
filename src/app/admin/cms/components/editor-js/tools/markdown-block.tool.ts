import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

export interface CmsMarkdownBlockData {
  markdown?: string;
}

const markdownSanitizer: SanitizerConfig = {};

export class CmsMarkdownBlockTool implements BlockTool {
  static get toolbox(): { title: string; icon: string } {
    return {
      title: 'Markdown',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2.25 4.25h13.5v9.5H2.25v-9.5Zm1.5 1.5v6.5h10.5v-6.5H3.75Zm1.25 5V7.2h1.2l1.05 1.35L8.3 7.2h1.2v3.55H8.2V9.1l-.95 1.2-.95-1.2v1.65H5Zm6.25-3.55h1.5v1.7h1.05l-1.8 1.85-1.8-1.85h1.05V7.2Z" fill="currentColor"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      markdown: markdownSanitizer,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<CmsMarkdownBlockData>;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<CmsMarkdownBlockData>) {
    this.data = normalizeMarkdownBlockData(options.data);
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-markdown-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #2563eb',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const heading = document.createElement('p');
    heading.textContent = 'Markdown block';
    heading.style.cssText = 'margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#1d4ed8';

    const description = document.createElement('p');
    description.textContent = 'Write Markdown source here. It will be parsed and sanitized when the post is rendered.';
    description.style.cssText = 'margin:4px 0 12px;font-size:12px;line-height:1.45;color:#52525b';

    const label = document.createElement('label');
    label.style.cssText = 'display:block';

    const labelText = document.createElement('span');
    labelText.textContent = 'Markdown';
    labelText.style.cssText = 'display:block;margin-bottom:6px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#71717a';

    const textarea = document.createElement('textarea');
    textarea.dataset['markdownText'] = 'true';
    textarea.value = this.data.markdown;
    textarea.placeholder = '## Section heading\n\nWrite **formatted** content here...';
    textarea.readOnly = this.readOnly;
    textarea.rows = 10;
    textarea.spellcheck = true;
    textarea.wrap = 'soft';
    textarea.style.cssText = [
      'display:block',
      'width:100%',
      'box-sizing:border-box',
      'border:1px solid #d4d4d8',
      'background:#fff',
      'padding:12px',
      'font-family:SFMono-Regular,Consolas,Liberation Mono,monospace',
      'font-size:13px',
      'line-height:1.65',
      'color:#18181b',
      'outline:none',
      'resize:vertical',
      'white-space:pre-wrap',
      'overflow-wrap:anywhere',
    ].join(';');

    label.append(labelText, textarea);
    wrapper.append(heading, description, label);

    return wrapper;
  }

  save(block: HTMLElement): CmsMarkdownBlockData {
    return {
      markdown: block.querySelector<HTMLTextAreaElement>('[data-markdown-text]')?.value ?? '',
    };
  }

  validate(data: CmsMarkdownBlockData): boolean {
    return typeof data.markdown === 'string' && data.markdown.trim().length > 0;
  }
}

function normalizeMarkdownBlockData(data: CmsMarkdownBlockData | undefined): Required<CmsMarkdownBlockData> {
  return {
    markdown: typeof data?.markdown === 'string' ? data.markdown : '',
  };
}
