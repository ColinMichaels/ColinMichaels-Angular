import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

export interface HtmlBlockData {
  title?: string;
  html?: string;
}

const titleSanitizer: SanitizerConfig = {};
const htmlSanitizer: SanitizerConfig = {
  a: {href: true, target: true, rel: true, class: true, style: true, title: true},
  abbr: {title: true, class: true, style: true},
  b: true,
  blockquote: {class: true, style: true},
  br: true,
  caption: {class: true, style: true},
  circle: {class: true, cx: true, cy: true, fill: true, r: true, stroke: true, style: true},
  code: {class: true, style: true},
  col: {class: true, span: true, style: true},
  colgroup: {class: true, span: true, style: true},
  dd: {class: true, style: true},
  defs: true,
  div: {class: true, id: true, role: true, style: true},
  dl: {class: true, style: true},
  dt: {class: true, style: true},
  em: true,
  figcaption: {class: true, style: true},
  figure: {class: true, style: true},
  g: {class: true, fill: true, stroke: true, style: true, transform: true},
  h2: {class: true, id: true, style: true},
  h3: {class: true, id: true, style: true},
  h4: {class: true, id: true, style: true},
  h5: {class: true, id: true, style: true},
  hr: {class: true, style: true},
  i: true,
  img: {alt: true, class: true, height: true, loading: true, src: true, style: true, width: true},
  li: {class: true, style: true},
  line: {class: true, stroke: true, style: true, x1: true, x2: true, y1: true, y2: true},
  linearGradient: {id: true, x1: true, x2: true, y1: true, y2: true},
  mark: {class: true, style: true},
  ol: {class: true, style: true},
  p: {class: true, style: true},
  path: {class: true, d: true, fill: true, stroke: true, style: true, transform: true},
  polyline: {class: true, fill: true, points: true, stroke: true, style: true},
  pre: {class: true, style: true},
  rect: {
    class: true,
    fill: true,
    height: true,
    rx: true,
    ry: true,
    stroke: true,
    style: true,
    width: true,
    x: true,
    y: true
  },
  section: {'aria-label': true, class: true, id: true, role: true, style: true},
  small: {class: true, style: true},
  span: {class: true, style: true},
  stop: {'stop-color': true, 'stop-opacity': true, offset: true},
  strong: true,
  sub: true,
  sup: true,
  svg: {
    'aria-label': true,
    class: true,
    fill: true,
    height: true,
    role: true,
    style: true,
    viewBox: true,
    viewbox: true,
    width: true,
    xmlns: true,
  },
  table: {class: true, style: true},
  tbody: {class: true, style: true},
  td: {class: true, colspan: true, rowspan: true, style: true},
  text: {class: true, fill: true, style: true, x: true, y: true},
  tfoot: {class: true, style: true},
  th: {class: true, colspan: true, rowspan: true, scope: true, style: true},
  thead: {class: true, style: true},
  tr: {class: true, style: true},
  u: true,
  ul: {class: true, style: true},
};

export class HtmlBlockTool implements BlockTool {
  static get toolbox(): { title: string; icon: string } {
    return {
      title: 'HTML',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="m6.3 12.2-4-3.2 4-3.2.9 1.1L4.6 9l2.6 2.1-.9 1.1Zm5.4 0-.9-1.1L13.4 9l-2.6-2.1.9-1.1 4 3.2-4 3.2ZM8.7 13.5H7.2l2.1-9h1.5l-2.1 9Z" fill="currentColor"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      title: titleSanitizer,
      html: htmlSanitizer,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<HtmlBlockData>;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<HtmlBlockData>) {
    this.data = normalizeHtmlData(options.data);
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-html-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #f59e0b',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const heading = document.createElement('p');
    heading.textContent = 'HTML block';
    heading.style.cssText = 'margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#b45309';

    const titleInput = createInput('Title', 'Optional internal label', this.data.title, this.readOnly);
    setFieldDataset(titleInput, 'htmlTitle');

    const textarea = createTextArea('Markup', '<section class="...">...</section>', this.data.html, this.readOnly);
    setFieldDataset(textarea, 'htmlMarkup');
    textarea.style.marginTop = '12px';

    wrapper.append(heading, titleInput, textarea);

    return wrapper;
  }

  save(block: HTMLElement): HtmlBlockData {
    return {
      title: getFieldValue(block, '[data-html-title]'),
      html: getFieldValue(block, '[data-html-markup]'),
    };
  }

  validate(data: HtmlBlockData): boolean {
    return typeof data.html === 'string' && data.html.trim().length > 0;
  }
}

function createInput(labelText: string, placeholder: string, value: string, readOnly: boolean): HTMLLabelElement {
  const label = document.createElement('label');
  label.style.cssText = 'display:block;min-width:0';

  const text = document.createElement('span');
  text.textContent = labelText;
  text.style.cssText = 'display:block;margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#71717a';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.placeholder = placeholder;
  input.readOnly = readOnly;
  input.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #d4d4d8;background:#fff;padding:9px 10px;font:inherit;font-size:14px;color:#18181b;outline:none';

  label.append(text, input);

  return label;
}

function createTextArea(labelText: string, placeholder: string, value: string, readOnly: boolean): HTMLLabelElement {
  const label = document.createElement('label');
  label.style.cssText = 'display:block';

  const text = document.createElement('span');
  text.textContent = labelText;
  text.style.cssText = 'display:block;margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#71717a';

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.placeholder = placeholder;
  textarea.readOnly = readOnly;
  textarea.rows = 9;
  textarea.spellcheck = false;
  textarea.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #d4d4d8;background:#111827;padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.55;color:#e5e7eb;outline:none;resize:vertical';

  label.append(text, textarea);

  return label;
}

function getFieldValue(root: ParentNode, selector: string): string {
  const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);

  return field?.value.trim() ?? '';
}

function setFieldDataset(label: HTMLLabelElement, key: string): void {
  const field = label.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');

  if (field) {
    field.dataset[key] = 'true';
  }
}

function normalizeHtmlData(data: HtmlBlockData | undefined): Required<HtmlBlockData> {
  return {
    title: typeof data?.title === 'string' ? data.title : '',
    html: typeof data?.html === 'string' ? data.html : '',
  };
}
