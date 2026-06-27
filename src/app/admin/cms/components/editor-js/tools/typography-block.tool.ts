import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

import {
  BLOG_TYPOGRAPHY_VARIANTS,
  BlogTypographyVariant,
} from '../../../../../features/blog/models/blog-post.model';

export interface TypographyBlockData {
  variant?: BlogTypographyVariant;
  text?: string;
  attribution?: string;
}

interface TypographyVariantConfig {
  label: string;
  description: string;
  placeholder: string;
  accent: string;
  showAttribution: boolean;
  attributionPlaceholder: string;
}

const typographyVariantConfigs: Record<BlogTypographyVariant, TypographyVariantConfig> = {
  lead: {
    label: 'Lead paragraph',
    description: 'Large intro copy for opening or section-setting text.',
    placeholder: 'Write a sharp opening paragraph...',
    accent: '#0891b2',
    showAttribution: false,
    attributionPlaceholder: 'Optional label',
  },
  sectionIntro: {
    label: 'Section intro',
    description: 'Medium-weight copy that opens a new section without feeling like a hero lead.',
    placeholder: 'Set up this section...',
    accent: '#38bdf8',
    showAttribution: false,
    attributionPlaceholder: 'Optional label',
  },
  pullQuote: {
    label: 'Pull quote',
    description: 'A large editorial quote or standout line.',
    placeholder: 'Add the quote or standout line...',
    accent: '#f59e0b',
    showAttribution: true,
    attributionPlaceholder: 'Attribution, source, or context',
  },
  keyTakeaway: {
    label: 'Key takeaway',
    description: 'A crisp conclusion or practical point readers should remember.',
    placeholder: 'Write the main takeaway...',
    accent: '#14b8a6',
    showAttribution: true,
    attributionPlaceholder: 'Optional label, for example Takeaway',
  },
  callout: {
    label: 'Callout',
    description: 'A highlighted note, warning, or key takeaway.',
    placeholder: 'Add the key takeaway...',
    accent: '#22c55e',
    showAttribution: true,
    attributionPlaceholder: 'Optional label, for example Note or Update',
  },
  warning: {
    label: 'Warning / update',
    description: 'Use for caveats, changed details, or information that needs extra attention.',
    placeholder: 'Add the warning or update...',
    accent: '#fb7185',
    showAttribution: true,
    attributionPlaceholder: 'Optional label, for example Warning or Update',
  },
  aside: {
    label: 'Aside',
    description: 'Secondary commentary without interrupting the article flow.',
    placeholder: 'Add supporting context...',
    accent: '#71717a',
    showAttribution: false,
    attributionPlaceholder: 'Optional label',
  },
  caption: {
    label: 'Caption / note',
    description: 'Small supporting text for annotations and editorial notes.',
    placeholder: 'Add a concise caption or note...',
    accent: '#a1a1aa',
    showAttribution: false,
    attributionPlaceholder: 'Optional label',
  },
  eyebrow: {
    label: 'Eyebrow',
    description: 'Short uppercase kicker text above a section.',
    placeholder: 'SECTION LABEL',
    accent: '#67e8f9',
    showAttribution: false,
    attributionPlaceholder: 'Optional label',
  },
};

const allowedInlineMarkup: SanitizerConfig = {
  a: {
    href: true,
    target: true,
    rel: true,
  },
  b: true,
  br: true,
  code: true,
  em: true,
  i: true,
  mark: true,
  strong: true,
  u: true,
};

export class TypographyBlockTool implements BlockTool {
  static get toolbox(): { title: string; icon: string } {
    return {
      title: 'Typography',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3h12v3h-1.2l-.45-1.2H10v10l1.5.3V16h-5v-.9l1.5-.3v-10H4.65L4.2 6H3V3Zm0 9h3v1.4H4.4V15H3v-3Zm12 0h-3v1.4h1.6V15H15v-3Z" fill="currentColor"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      text: allowedInlineMarkup,
      attribution: allowedInlineMarkup,
      variant: {},
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<TypographyBlockData>;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<TypographyBlockData>) {
    this.data = normalizeTypographyData(options.data);
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-typography-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;gap:12px;align-items:flex-start;justify-content:space-between;margin-bottom:12px';

    const copy = document.createElement('div');
    copy.style.cssText = 'min-width:0';

    const title = document.createElement('p');
    title.style.cssText = 'margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#0891b2';

    const description = document.createElement('p');
    description.style.cssText = 'margin:4px 0 0;font-size:12px;line-height:1.45;color:#52525b';

    copy.append(title, description);

    const select = document.createElement('select');
    select.dataset['typographyVariant'] = 'true';
    select.disabled = this.readOnly;
    select.style.cssText = 'border:1px solid #a1a1aa;background:#fff;padding:8px 10px;font-size:13px;color:#18181b;outline:none';

    for (const variant of BLOG_TYPOGRAPHY_VARIANTS) {
      const option = document.createElement('option');
      option.value = variant;
      option.textContent = typographyVariantConfigs[variant].label;
      option.selected = variant === this.data.variant;
      select.append(option);
    }

    header.append(copy, select);

    const textArea = document.createElement('textarea');
    textArea.dataset['typographyText'] = 'true';
    textArea.value = this.data.text;
    textArea.readOnly = this.readOnly;
    textArea.rows = 5;
    textArea.style.cssText = [
      'display:block',
      'width:100%',
      'box-sizing:border-box',
      'border:1px solid #d4d4d8',
      'background:#fff',
      'padding:12px',
      'font:inherit',
      'font-size:16px',
      'line-height:1.65',
      'color:#18181b',
      'outline:none',
      'resize:vertical',
    ].join(';');

    const attributionGroup = document.createElement('label');
    attributionGroup.style.cssText = 'display:block;margin-top:12px';

    const attributionLabel = document.createElement('span');
    attributionLabel.textContent = 'Label / attribution';
    attributionLabel.style.cssText = 'display:block;margin-bottom:6px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#71717a';

    const attributionInput = document.createElement('input');
    attributionInput.dataset['typographyAttribution'] = 'true';
    attributionInput.value = this.data.attribution;
    attributionInput.readOnly = this.readOnly;
    attributionInput.type = 'text';
    attributionInput.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #d4d4d8;background:#fff;padding:9px 10px;font:inherit;font-size:14px;color:#18181b;outline:none';

    attributionGroup.append(attributionLabel, attributionInput);
    wrapper.append(header, textArea, attributionGroup);

    const applyVariant = (variant: BlogTypographyVariant): void => {
      const config = typographyVariantConfigs[variant];
      wrapper.style.borderLeft = `4px solid ${config.accent}`;
      title.textContent = config.label;
      title.style.color = config.accent;
      description.textContent = config.description;
      textArea.placeholder = config.placeholder;
      attributionInput.placeholder = config.attributionPlaceholder;
      attributionGroup.style.display = config.showAttribution ? 'block' : 'none';
    };

    applyVariant(this.data.variant);
    select.addEventListener('change', () => applyVariant(toTypographyVariant(select.value)));

    return wrapper;
  }

  save(block: HTMLElement): TypographyBlockData {
    const variant = toTypographyVariant(block.querySelector<HTMLSelectElement>('[data-typography-variant]')?.value);
    const text = block.querySelector<HTMLTextAreaElement>('[data-typography-text]')?.value.trim() ?? '';
    const attribution = block.querySelector<HTMLInputElement>('[data-typography-attribution]')?.value.trim() ?? '';

    return {
      variant,
      text,
      attribution,
    };
  }

  validate(data: TypographyBlockData): boolean {
    return typeof data.text === 'string' && data.text.trim().length > 0;
  }
}

function normalizeTypographyData(data: TypographyBlockData | undefined): Required<TypographyBlockData> {
  return {
    variant: toTypographyVariant(data?.variant),
    text: typeof data?.text === 'string' ? data.text : '',
    attribution: typeof data?.attribution === 'string' ? data.attribution : '',
  };
}

function toTypographyVariant(value: unknown): BlogTypographyVariant {
  return typeof value === 'string' && isTypographyVariant(value) ? value : 'lead';
}

function isTypographyVariant(value: string): value is BlogTypographyVariant {
  return (BLOG_TYPOGRAPHY_VARIANTS as readonly string[]).includes(value);
}
