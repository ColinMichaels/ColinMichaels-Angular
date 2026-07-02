import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

export interface CmsCodeBlockData {
  code?: string;
  language?: string;
}

const textFieldSanitizer: SanitizerConfig = {};
const languageOptions = [
  '',
  'bash',
  'css',
  'html',
  'javascript',
  'json',
  'markdown',
  'python',
  'scss',
  'sql',
  'typescript',
  'yaml',
] as const;

let codeBlockToolId = 0;

export class CmsCodeBlockTool implements BlockTool {
  static get toolbox(): { title: string; icon: string } {
    return {
      title: 'Code',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="m6.3 12.2-4-3.2 4-3.2.9 1.1L4.6 9l2.6 2.1-.9 1.1Zm5.4 0-.9-1.1L13.4 9l-2.6-2.1.9-1.1 4 3.2-4 3.2ZM8.7 13.5H7.2l2.1-9h1.5l-2.1 9Z" fill="currentColor"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      code: textFieldSanitizer,
      language: textFieldSanitizer,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<CmsCodeBlockData>;
  private readonly languageListId: string;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<CmsCodeBlockData>) {
    this.data = normalizeCodeBlockData(options.data);
    codeBlockToolId += 1;
    this.languageListId = `cms-code-language-options-${codeBlockToolId}`;
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-code-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #0f766e',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;gap:12px;align-items:end;justify-content:space-between;margin-bottom:12px';

    const copy = document.createElement('div');
    copy.style.cssText = 'min-width:0';

    const title = createBlockTitle('Code block', '#0f766e');

    const description = document.createElement('p');
    description.textContent = 'Edit the snippet here. The rendered preview below wraps long lines so the post is easier to read while drafting.';
    description.style.cssText = 'margin:4px 0 0;font-size:12px;line-height:1.45;color:#52525b';

    copy.append(title, description);

    const languageField = createLanguageField(this.data.language, this.readOnly, this.languageListId);
    const languageInput = languageField.querySelector<HTMLInputElement>('[data-code-language]');
    header.append(copy, languageField);

    const codeField = document.createElement('label');
    codeField.style.cssText = 'display:block';

    const codeLabel = document.createElement('span');
    codeLabel.textContent = 'Code';
    codeLabel.style.cssText = 'display:block;margin-bottom:6px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#71717a';

    const textarea = document.createElement('textarea');
    textarea.dataset['codeText'] = 'true';
    textarea.value = this.data.code;
    textarea.placeholder = 'Paste or write code here...';
    textarea.readOnly = this.readOnly;
    textarea.rows = 8;
    textarea.spellcheck = false;
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
      'overflow:auto',
    ].join(';');

    const preview = createCodePreview(this.data.code, this.data.language);
    const previewLanguage = preview.querySelector<HTMLElement>('[data-code-preview-language]');
    const previewCode = preview.querySelector<HTMLElement>('[data-code-preview-text]');

    const updatePreview = (): void => {
      const language = normalizeLanguage(languageInput?.value);
      const code = textarea.value;

      if (previewLanguage) {
        previewLanguage.textContent = formatLanguageLabel(language);
      }

      if (previewCode) {
        previewCode.textContent = code || 'Code preview will appear here...';
      }
    };

    textarea.addEventListener('input', updatePreview);
    languageInput?.addEventListener('input', updatePreview);

    codeField.append(codeLabel, textarea);
    wrapper.append(header, codeField, preview);

    return wrapper;
  }

  save(block: HTMLElement): CmsCodeBlockData {
    return {
      language: normalizeLanguage(block.querySelector<HTMLInputElement>('[data-code-language]')?.value),
      code: block.querySelector<HTMLTextAreaElement>('[data-code-text]')?.value ?? '',
    };
  }

  validate(data: CmsCodeBlockData): boolean {
    return typeof data.code === 'string' && data.code.trim().length > 0;
  }
}

function createBlockTitle(text: string, color: string): HTMLParagraphElement {
  const title = document.createElement('p');
  title.textContent = text;
  title.style.cssText = `margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${color}`;

  return title;
}

function createCodePreview(code: string, language: string): HTMLElement {
  const figure = document.createElement('figure');
  figure.dataset['codePreview'] = 'true';
  figure.style.cssText = [
    'margin:14px 0 0',
    'overflow:hidden',
    'border:1px solid #0f172a',
    'border-radius:6px',
    'background:#020617',
    'color:#e2e8f0',
  ].join(';');

  const caption = document.createElement('figcaption');
  caption.style.cssText = [
    'display:flex',
    'align-items:center',
    'justify-content:space-between',
    'gap:12px',
    'border-bottom:1px solid rgba(255,255,255,.12)',
    'background:#0f172a',
    'padding:8px 12px',
  ].join(';');

  const title = createBlockTitle(formatLanguageLabel(language), '#99f6e4');
  title.dataset['codePreviewLanguage'] = 'true';
  title.style.letterSpacing = '.18em';

  const note = document.createElement('span');
  note.textContent = 'Rendered preview';
  note.style.cssText = 'font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.14em';

  const pre = document.createElement('pre');
  pre.style.cssText = [
    'margin:0',
    'padding:14px',
    'max-width:100%',
    'overflow-x:hidden',
    'white-space:pre-wrap',
    'overflow-wrap:anywhere',
    'word-break:break-word',
    'font-family:SFMono-Regular,Consolas,Liberation Mono,monospace',
    'font-size:13px',
    'line-height:1.7',
    'color:#cffafe',
  ].join(';');

  const codeElement = document.createElement('code');
  codeElement.dataset['codePreviewText'] = 'true';
  codeElement.textContent = code || 'Code preview will appear here...';

  caption.append(title, note);
  pre.append(codeElement);
  figure.append(caption, pre);

  return figure;
}

function formatLanguageLabel(language: string): string {
  return language ? language.toUpperCase() : 'Code';
}

function createLanguageField(value: string, readOnly: boolean, languageListId: string): HTMLLabelElement {
  const label = document.createElement('label');
  label.style.cssText = 'display:block;min-width:160px';

  const text = document.createElement('span');
  text.textContent = 'Language';
  text.style.cssText = 'display:block;margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#71717a';

  const input = document.createElement('input');
  input.dataset['codeLanguage'] = 'true';
  input.type = 'text';
  input.value = value;
  input.placeholder = 'typescript';
  input.readOnly = readOnly;
  input.setAttribute('list', languageListId);
  input.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #a1a1aa;background:#fff;padding:9px 10px;font:inherit;font-size:13px;color:#18181b;outline:none';

  const datalist = document.createElement('datalist');
  datalist.id = languageListId;

  for (const optionValue of languageOptions) {
    const option = document.createElement('option');
    option.value = optionValue;
    option.label = optionValue || 'Plain text';
    datalist.append(option);
  }

  label.append(text, input, datalist);

  return label;
}

function normalizeCodeBlockData(data: CmsCodeBlockData | undefined): Required<CmsCodeBlockData> {
  return {
    code: typeof data?.code === 'string' ? data.code : '',
    language: normalizeLanguage(data?.language),
  };
}

function normalizeLanguage(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9+#._-]/g, '').slice(0, 40)
    : '';
}
