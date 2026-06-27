import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

import {
  BLOG_IMAGE_LAYOUTS,
  BlogImageLayout,
} from '../../../../../features/blog/models/blog-post.model';

interface CmsImageFileData {
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface CmsImageBlockData {
  file?: CmsImageFileData;
  url?: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  withBorder?: boolean;
  withBackground?: boolean;
  stretched?: boolean;
  imageLayout?: BlogImageLayout;
}

interface CmsImageUploadResult {
  success: 1;
  file: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
}

interface CmsImageToolConfig {
  uploader?: {
    uploadByFile?: (file: File) => Promise<CmsImageUploadResult>;
  };
}

interface CmsImageLayoutConfig {
  label: string;
  description: string;
}

interface NormalizedCmsImageBlockData {
  file: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
  url: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
  withBorder: boolean;
  withBackground: boolean;
  stretched: boolean;
  imageLayout: BlogImageLayout;
}

const imageLayoutConfigs: Record<BlogImageLayout, CmsImageLayoutConfig> = {
  fullWidth: {
    label: 'Full width',
    description: 'Use for hero-like images and important visual breaks.',
  },
  contained: {
    label: 'Contained',
    description: 'Center the image inside the text column.',
  },
  inlineStart: {
    label: 'Inline left',
    description: 'Float the image left on wider screens so text wraps beside it.',
  },
  inlineEnd: {
    label: 'Inline right',
    description: 'Float the image right on wider screens so text wraps beside it.',
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getPositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function toImageLayout(value: unknown, stretched: unknown): BlogImageLayout {
  if (typeof value === 'string' && (BLOG_IMAGE_LAYOUTS as readonly string[]).includes(value)) {
    return value as BlogImageLayout;
  }

  return stretched === true ? 'fullWidth' : 'contained';
}

function normalizeImageData(data: CmsImageBlockData | undefined): NormalizedCmsImageBlockData {
  const file = isRecord(data?.file) ? data.file : {};
  const url = getString(file['url']) || getString(data?.url);
  const alt = getString(data?.alt) || getString(file['alt']);
  const width = getPositiveNumber(file['width']) ?? getPositiveNumber(data?.width);
  const height = getPositiveNumber(file['height']) ?? getPositiveNumber(data?.height);
  const imageLayout = toImageLayout(data?.imageLayout, data?.stretched);

  return {
    file: {
      url,
      alt,
      ...(width ? {width} : {}),
      ...(height ? {height} : {}),
    },
    url,
    alt,
    caption: getString(data?.caption),
    width,
    height,
    withBorder: data?.withBorder === true,
    withBackground: data?.withBackground === true,
    stretched: imageLayout === 'fullWidth',
    imageLayout,
  };
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className = '',
  textContent = ''
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent) {
    element.textContent = textContent;
  }

  return element;
}

export class CmsImageBlockTool implements BlockTool {
  static get toolbox(): { title: string; icon: string } {
    return {
      title: 'Image',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3 13.5v-9Zm1.5 0v6.7l2.25-2.25a1 1 0 0 1 1.4-.02L10 10.65l1.1-1.1a1 1 0 0 1 1.42.02l.98 1.05V4.5h-9Zm0 9h9v-.68l-1.72-1.84-1.08 1.08a1 1 0 0 1-1.39.02L7.48 10.4 4.5 13.38v.12ZM11.75 6a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" fill="currentColor"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      caption: allowedInlineMarkup,
      alt: {},
      url: {},
      imageLayout: {},
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: NormalizedCmsImageBlockData;
  private readonly config: CmsImageToolConfig;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<CmsImageBlockData>) {
    this.data = normalizeImageData(options.data);
    this.config = (options.config as CmsImageToolConfig | undefined) ?? {};
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = createElement('section', 'cms-image-tool');
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const header = createElement('div');
    header.style.cssText = 'display:flex;gap:12px;align-items:flex-start;justify-content:space-between;margin-bottom:14px';

    const copy = createElement('div');
    copy.style.cssText = 'min-width:0';

    const title = createElement('p', '', 'Image');
    title.style.cssText = 'margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#0891b2';

    const description = createElement('p', '', 'Choose a layout, then add accessible alt text and an optional caption.');
    description.style.cssText = 'margin:4px 0 0;font-size:12px;line-height:1.45;color:#52525b';

    copy.append(title, description);

    const uploadButton = createElement('button', '', 'Upload');
    uploadButton.type = 'button';
    uploadButton.disabled = this.readOnly || !this.config.uploader?.uploadByFile;
    uploadButton.style.cssText = 'border:1px solid #0891b2;background:#ecfeff;padding:8px 12px;font-size:12px;font-weight:700;color:#164e63;cursor:pointer';

    const uploadInput = createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'image/*';
    uploadInput.disabled = uploadButton.disabled;
    uploadInput.style.display = 'none';

    header.append(copy, uploadButton, uploadInput);

    const previewFrame = createElement('figure');
    previewFrame.style.cssText = 'margin:0 0 14px;border:1px solid #e4e4e7;background:#fff;min-height:180px;display:grid;place-items:center;overflow:hidden';

    const previewImage = createElement('img');
    previewImage.alt = this.data.alt || 'Selected image preview';
    previewImage.style.cssText = 'display:block;max-width:100%;max-height:320px;object-fit:contain';

    const emptyPreview = createElement('p', '', 'Paste an image URL or upload an image.');
    emptyPreview.style.cssText = 'margin:0;padding:24px;text-align:center;font-size:13px;line-height:1.6;color:#71717a';

    const renderPreview = (url: string): void => {
      previewFrame.replaceChildren();

      if (!url.trim()) {
        previewFrame.append(emptyPreview);
        return;
      }

      previewImage.src = url.trim();
      previewFrame.append(previewImage);
    };

    const urlGroup = createElement('label');
    urlGroup.style.cssText = 'display:block;margin-bottom:12px';

    const urlLabel = createLabelText('Image URL');
    const urlInput = createElement('input');
    urlInput.dataset['imageUrl'] = 'true';
    urlInput.type = 'url';
    urlInput.value = this.data.url;
    urlInput.readOnly = this.readOnly;
    urlInput.placeholder = 'https://...';
    urlInput.style.cssText = inputStyle();
    urlGroup.append(urlLabel, urlInput);

    const altGroup = createElement('label');
    altGroup.style.cssText = 'display:block;margin-bottom:12px';

    const altLabel = createLabelText('Alt text');
    const altInput = createElement('input');
    altInput.dataset['imageAlt'] = 'true';
    altInput.type = 'text';
    altInput.value = this.data.alt;
    altInput.readOnly = this.readOnly;
    altInput.placeholder = 'Describe the image for screen readers';
    altInput.style.cssText = inputStyle();
    altGroup.append(altLabel, altInput);

    const captionGroup = createElement('label');
    captionGroup.style.cssText = 'display:block;margin-bottom:12px';

    const captionLabel = createLabelText('Caption');
    const captionInput = createElement('textarea');
    captionInput.dataset['imageCaption'] = 'true';
    captionInput.value = this.data.caption;
    captionInput.readOnly = this.readOnly;
    captionInput.rows = 3;
    captionInput.placeholder = 'Optional caption';
    captionInput.style.cssText = `${inputStyle()}resize:vertical;line-height:1.55`;
    captionGroup.append(captionLabel, captionInput);

    const layoutGroup = createElement('fieldset');
    layoutGroup.style.cssText = 'margin:0 0 12px;border:1px solid #e4e4e7;padding:12px';

    const layoutLegend = createElement('legend', '', 'Layout');
    layoutLegend.style.cssText = 'padding:0 6px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#71717a';

    const layoutSelect = createElement('select');
    layoutSelect.dataset['imageLayout'] = 'true';
    layoutSelect.disabled = this.readOnly;
    layoutSelect.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #a1a1aa;background:#fff;padding:9px 10px;font:inherit;font-size:14px;color:#18181b;outline:none';

    for (const layout of BLOG_IMAGE_LAYOUTS) {
      const option = createElement('option');
      option.value = layout;
      option.textContent = imageLayoutConfigs[layout].label;
      option.selected = layout === this.data.imageLayout;
      layoutSelect.append(option);
    }

    const layoutDescription = createElement('p');
    layoutDescription.style.cssText = 'margin:8px 0 0;font-size:12px;line-height:1.45;color:#52525b';

    layoutGroup.append(layoutLegend, layoutSelect, layoutDescription);

    const optionsGroup = createElement('fieldset');
    optionsGroup.style.cssText = 'display:grid;gap:8px;margin:0;border:1px solid #e4e4e7;padding:12px';

    const optionsLegend = createElement('legend', '', 'Frame');
    optionsLegend.style.cssText = 'padding:0 6px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#71717a';

    const borderInput = createCheckbox('imageWithBorder', this.data.withBorder, this.readOnly);
    const backgroundInput = createCheckbox('imageWithBackground', this.data.withBackground, this.readOnly);

    optionsGroup.append(
      optionsLegend,
      createCheckboxLabel(borderInput, 'Border'),
      createCheckboxLabel(backgroundInput, 'Soft background')
    );

    const status = createElement('p');
    status.style.cssText = 'margin:12px 0 0;min-height:18px;font-size:12px;color:#52525b';

    const applyLayout = (layout: BlogImageLayout): void => {
      const config = imageLayoutConfigs[layout];
      layoutDescription.textContent = config.description;
      previewFrame.style.maxWidth = layout === 'fullWidth'
        ? '100%'
        : layout === 'contained'
          ? '620px'
          : '360px';
      previewFrame.style.marginLeft = layout === 'inlineEnd' ? 'auto' : '0';
    };

    renderPreview(this.data.url);
    applyLayout(this.data.imageLayout);

    urlInput.addEventListener('input', () => renderPreview(urlInput.value));
    altInput.addEventListener('input', () => {
      previewImage.alt = altInput.value || 'Selected image preview';
    });
    layoutSelect.addEventListener('change', () => applyLayout(toImageLayout(layoutSelect.value, false)));
    uploadButton.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', () => {
      const file = uploadInput.files?.[0];
      uploadInput.value = '';

      if (file) {
        void this.uploadImage(file, urlInput, altInput, previewImage, renderPreview, status, uploadButton);
      }
    });

    wrapper.append(
      header,
      previewFrame,
      urlGroup,
      altGroup,
      captionGroup,
      layoutGroup,
      optionsGroup,
      status
    );

    return wrapper;
  }

  save(block: HTMLElement): CmsImageBlockData {
    const url = block.querySelector<HTMLInputElement>('[data-image-url]')?.value.trim() ?? '';
    const alt = block.querySelector<HTMLInputElement>('[data-image-alt]')?.value.trim() ?? '';
    const caption = block.querySelector<HTMLTextAreaElement>('[data-image-caption]')?.value.trim() ?? '';
    const imageLayout = toImageLayout(
      block.querySelector<HTMLSelectElement>('[data-image-layout]')?.value,
      false
    );
    const withBorder = block.querySelector<HTMLInputElement>('[data-image-with-border]')?.checked === true;
    const withBackground = block.querySelector<HTMLInputElement>('[data-image-with-background]')?.checked === true;
    const width = this.data.file.width;
    const height = this.data.file.height;

    return {
      file: {
        url,
        alt,
        ...(width ? {width} : {}),
        ...(height ? {height} : {}),
      },
      url,
      alt,
      caption,
      withBorder,
      withBackground,
      imageLayout,
      stretched: imageLayout === 'fullWidth',
      ...(width ? {width} : {}),
      ...(height ? {height} : {}),
    };
  }

  validate(data: CmsImageBlockData): boolean {
    return Boolean((data.file?.url ?? data.url ?? '').trim());
  }

  private async uploadImage(
    file: File,
    urlInput: HTMLInputElement,
    altInput: HTMLInputElement,
    previewImage: HTMLImageElement,
    renderPreview: (url: string) => void,
    status: HTMLElement,
    uploadButton: HTMLButtonElement
  ): Promise<void> {
    const upload = this.config.uploader?.uploadByFile;

    if (!upload) {
      status.textContent = 'Image upload is unavailable.';
      return;
    }

    uploadButton.disabled = true;
    status.textContent = 'Uploading image...';

    try {
      const result = await upload(file);

      if (!result.file.url) {
        throw new Error('Upload completed without an image URL.');
      }

      urlInput.value = result.file.url;
      this.data.file.width = result.file.width;
      this.data.file.height = result.file.height;

      if (!altInput.value.trim()) {
        altInput.value = result.file.alt ?? file.name;
        previewImage.alt = altInput.value;
      }

      renderPreview(result.file.url);
      status.textContent = 'Uploaded image.';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Unable to upload image.';
    } finally {
      uploadButton.disabled = this.readOnly || !upload;
    }
  }
}

function createLabelText(text: string): HTMLSpanElement {
  const label = createElement('span', '', text);
  label.style.cssText = 'display:block;margin-bottom:6px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#71717a';

  return label;
}

function inputStyle(): string {
  return [
    'display:block',
    'width:100%',
    'box-sizing:border-box',
    'border:1px solid #d4d4d8',
    'background:#fff',
    'padding:9px 10px',
    'font:inherit',
    'font-size:14px',
    'color:#18181b',
    'outline:none',
  ].join(';');
}

function createCheckbox(dataKey: string, checked: boolean, disabled: boolean): HTMLInputElement {
  const input = createElement('input');
  input.dataset[dataKey] = 'true';
  input.type = 'checkbox';
  input.checked = checked;
  input.disabled = disabled;

  return input;
}

function createCheckboxLabel(input: HTMLInputElement, text: string): HTMLLabelElement {
  const label = createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px;color:#3f3f46';
  label.append(input, document.createTextNode(text));

  return label;
}
