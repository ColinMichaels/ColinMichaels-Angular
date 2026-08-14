import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

import {
  BLOG_GALLERY_LAYOUTS,
  BlogGalleryImage,
  BlogGalleryLayout,
} from '../../../../../features/blog/models/blog-post.model';
import {CmsImageLibrarySelection} from './cms-image-block.tool';

export const CMS_GALLERY_MIN_IMAGES = 2;
export const CMS_GALLERY_MAX_IMAGES = 20;

export interface CmsGalleryBlockData {
  title?: string;
  caption?: string;
  layout?: BlogGalleryLayout;
  images?: readonly BlogGalleryImage[];
}

interface GalleryImageUploadResult {
  success: 1;
  file: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
}

interface GalleryBlockToolConfig {
  mediaLibrary?: {
    selectImages?: (limit: number) => Promise<readonly CmsImageLibrarySelection[] | null>;
  };
  uploader?: {
    uploadByFile?: (
      file: File,
      onProgress?: (progress: number) => void
    ) => Promise<GalleryImageUploadResult>;
  };
}

interface GalleryLayoutConfig {
  label: string;
  description: string;
}

const galleryLayoutConfigs: Record<BlogGalleryLayout, GalleryLayoutConfig> = {
  slideshow: {
    label: 'Slideshow',
    description: 'One large image at a time with manual previous and next controls.',
  },
  grid: {
    label: 'Grid',
    description: 'An even responsive gallery that grows from one to three columns.',
  },
  mosaic: {
    label: 'Mosaic',
    description: 'An editorial collage with a lead image and supporting tiles.',
  },
};

const allowedInlineMarkup: SanitizerConfig = {
  a: {href: true, target: true, rel: true},
  b: true,
  br: true,
  code: true,
  em: true,
  i: true,
  mark: true,
  strong: true,
  u: true,
};

export class CmsGalleryBlockTool implements BlockTool {
  static get toolbox(): { title: string; icon: string } {
    return {
      title: 'Image Gallery',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h7a1.5 1.5 0 0 1 1.5 1.5V5H14a1.5 1.5 0 0 1 1.5 1.5V14A1.5 1.5 0 0 1 14 15.5H6A1.5 1.5 0 0 1 4.5 14v-1.5H4A1.5 1.5 0 0 1 2.5 11V3.5Zm1.5 0V11h.5V6.5A1.5 1.5 0 0 1 6 5h5V3.5H4ZM6 6.5V14h8V6.5H6Zm1 5.55 1.75-1.75 1.2 1.2 1.3-1.3L13 12v.5H7v-.45ZM11.75 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" fill="currentColor"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      title: allowedInlineMarkup,
      caption: allowedInlineMarkup,
      layout: {},
      images: allowedInlineMarkup,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<CmsGalleryBlockData>;
  private readonly config: GalleryBlockToolConfig;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<CmsGalleryBlockData>) {
    this.data = normalizeGalleryData(options.data);
    this.config = (options.config as GalleryBlockToolConfig | undefined) ?? {};
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = createElement('section', 'cms-gallery-tool');
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #0891b2',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo,sans-serif',
      'color:#18181b',
    ].join(';');

    const heading = createElement('div');
    heading.style.cssText = 'display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px';

    const headingCopy = createElement('div');
    const eyebrow = createElement('p', '', 'Image Gallery');
    eyebrow.style.cssText = 'margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#0e7490';
    const help = createElement('p', '', `Add ${CMS_GALLERY_MIN_IMAGES}–${CMS_GALLERY_MAX_IMAGES} images, choose a layout, and provide alt text for each image.`);
    help.style.cssText = 'margin:4px 0 0;max-width:620px;font-size:12px;line-height:1.5;color:#52525b';
    headingCopy.append(eyebrow, help);

    const status = createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.cssText = 'margin:0;border:1px solid #bae6fd;background:#ecfeff;padding:7px 10px;font-size:12px;font-weight:700;color:#155e75';
    heading.append(headingCopy, status);

    const titleInput = createTextInput('Gallery title', 'Optional heading above the gallery', this.data.title, this.readOnly);
    titleInput.querySelector('input')?.setAttribute('data-gallery-title', 'true');

    const captionInput = createTextArea('Gallery caption', 'Optional context for the complete gallery', this.data.caption, this.readOnly);
    captionInput.querySelector('textarea')?.setAttribute('data-gallery-caption', 'true');

    const layoutFieldset = createElement('fieldset');
    layoutFieldset.style.cssText = 'margin:14px 0;border:1px solid #d4d4d8;padding:12px';
    const layoutLegend = createElement('legend', '', 'Layout');
    layoutLegend.style.cssText = 'padding:0 6px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#52525b';
    const layoutOptions = createElement('div');
    layoutOptions.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px';
    const layoutGroupName = `gallery-layout-${Math.random().toString(36).slice(2)}`;

    for (const layout of BLOG_GALLERY_LAYOUTS) {
      const option = createElement('label');
      option.style.cssText = 'display:flex;gap:8px;border:1px solid #d4d4d8;background:#fff;padding:10px;cursor:pointer';
      const radio = createElement('input');
      radio.type = 'radio';
      radio.name = layoutGroupName;
      radio.value = layout;
      radio.checked = layout === this.data.layout;
      radio.disabled = this.readOnly;
      radio.dataset['galleryLayout'] = 'true';
      const copy = createElement('span');
      const label = createElement('strong', '', galleryLayoutConfigs[layout].label);
      label.style.cssText = 'display:block;font-size:13px;color:#18181b';
      const description = createElement('span', '', galleryLayoutConfigs[layout].description);
      description.style.cssText = 'display:block;margin-top:3px;font-size:11px;line-height:1.4;color:#71717a';
      copy.append(label, description);
      option.append(radio, copy);
      layoutOptions.append(option);
    }

    layoutFieldset.append(layoutLegend, layoutOptions);

    const imageList = createElement('div');
    imageList.dataset['galleryImageList'] = 'true';
    imageList.style.cssText = 'display:grid;gap:12px';

    const refreshStatus = (): void => {
      const count = imageList.querySelectorAll('[data-gallery-image-row]').length;
      status.textContent = count < CMS_GALLERY_MIN_IMAGES
        ? `${count} image${count === 1 ? '' : 's'} · add ${CMS_GALLERY_MIN_IMAGES - count} more`
        : `${count} images · ${CMS_GALLERY_MAX_IMAGES - count} spaces remaining`;
      const limitReached = count >= CMS_GALLERY_MAX_IMAGES;
      addLibraryButton.disabled = this.readOnly || limitReached || !this.config.mediaLibrary?.selectImages;
      addUrlButton.disabled = this.readOnly || limitReached;
      uploadButton.disabled = this.readOnly || limitReached || !this.config.uploader?.uploadByFile;
    };

    const appendImage = (image: BlogGalleryImage): void => {
      if (imageList.querySelectorAll('[data-gallery-image-row]').length >= CMS_GALLERY_MAX_IMAGES) {
        status.textContent = `A gallery can contain at most ${CMS_GALLERY_MAX_IMAGES} images.`;
        return;
      }

      imageList.append(createGalleryImageRow(image, this.readOnly, imageList, refreshStatus));
      refreshStatus();
    };

    const actions = createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:12px 0';

    const addLibraryButton = createActionButton('Add from Media Library');
    addLibraryButton.dataset['galleryAddLibrary'] = 'true';
    addLibraryButton.addEventListener('click', () => {
      const remainingCapacity = Math.max(
        0,
        CMS_GALLERY_MAX_IMAGES - imageList.querySelectorAll('[data-gallery-image-row]').length
      );
      void this.addFromMediaLibrary(remainingCapacity, appendImage, status, addLibraryButton)
        .finally(refreshStatus);
    });

    const uploadInput = createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'image/*';
    uploadInput.multiple = true;
    uploadInput.disabled = this.readOnly || !this.config.uploader?.uploadByFile;
    uploadInput.hidden = true;
    uploadInput.dataset['galleryUploadInput'] = 'true';

    const uploadButton = createActionButton('Upload images');
    uploadButton.dataset['galleryUpload'] = 'true';
    uploadButton.addEventListener('click', () => uploadInput.click());

    const addUrlButton = createActionButton('Add image URL');
    addUrlButton.dataset['galleryAddUrl'] = 'true';
    addUrlButton.addEventListener('click', () => appendImage({url: '', alt: ''}));

    const uploadProgress = createElement('div');
    uploadProgress.hidden = true;
    uploadProgress.setAttribute('role', 'progressbar');
    uploadProgress.setAttribute('aria-label', 'Gallery image upload progress');
    uploadProgress.setAttribute('aria-valuemin', '0');
    uploadProgress.setAttribute('aria-valuemax', '100');
    uploadProgress.style.cssText = 'flex:1 1 180px;height:8px;overflow:hidden;background:#e4e4e7';
    const uploadProgressBar = createElement('div');
    uploadProgressBar.style.cssText = 'height:100%;width:0;background:#0891b2;transition:width .15s ease';
    uploadProgress.append(uploadProgressBar);

    uploadInput.addEventListener('change', () => {
      const remainingCapacity = Math.max(
        0,
        CMS_GALLERY_MAX_IMAGES - imageList.querySelectorAll('[data-gallery-image-row]').length
      );
      const files = [...(uploadInput.files ?? [])].slice(0, remainingCapacity);
      uploadInput.value = '';
      void this.uploadImages(files, appendImage, status, uploadProgress, uploadProgressBar, uploadButton, refreshStatus);
    });

    actions.append(addLibraryButton, uploadButton, addUrlButton, uploadInput, uploadProgress);

    for (const image of this.data.images) {
      appendImage(image);
    }

    wrapper.append(heading, titleInput, captionInput, layoutFieldset, actions, imageList);
    refreshStatus();

    return wrapper;
  }

  save(block: HTMLElement): CmsGalleryBlockData {
    const checkedLayout = block.querySelector<HTMLInputElement>('[data-gallery-layout]:checked')?.value;
    const layout = isGalleryLayout(checkedLayout) ? checkedLayout : 'grid';
    const images = [...block.querySelectorAll<HTMLElement>('[data-gallery-image-row]')]
      .map(row => {
        const width = getPositiveNumber(row.dataset['galleryWidth']);
        const height = getPositiveNumber(row.dataset['galleryHeight']);
        const caption = getFieldValue(row, '[data-gallery-image-caption]');

        return {
          url: getFieldValue(row, '[data-gallery-image-url]'),
          alt: getFieldValue(row, '[data-gallery-image-alt]'),
          ...(caption ? {caption} : {}),
          ...(width ? {width} : {}),
          ...(height ? {height} : {}),
        } satisfies BlogGalleryImage;
      });

    return {
      title: getFieldValue(block, '[data-gallery-title]'),
      caption: getFieldValue(block, '[data-gallery-caption]'),
      layout,
      images,
    };
  }

  validate(): boolean {
    // Domain validation reports actionable image-count and shape errors. Always
    // return true here so Editor.js never drops an unfinished gallery silently.
    return true;
  }

  private async addFromMediaLibrary(
    limit: number,
    appendImage: (image: BlogGalleryImage) => void,
    status: HTMLElement,
    button: HTMLButtonElement
  ): Promise<void> {
    const selectImages = this.config.mediaLibrary?.selectImages;

    if (!selectImages) {
      status.textContent = 'Media Library selection is unavailable.';
      return;
    }

    button.disabled = true;
    status.textContent = 'Opening the Media Library...';

    try {
      const selections = await selectImages(limit);

      if (selections?.length) {
        for (const selection of selections.slice(0, limit)) {
          appendImage({
            url: selection.url,
            alt: selection.alt,
            ...(selection.caption ? {caption: selection.caption} : {}),
            ...(selection.width ? {width: selection.width} : {}),
            ...(selection.height ? {height: selection.height} : {}),
          });
        }
        const addedCount = Math.min(selections.length, limit);
        status.textContent = `Added ${addedCount} Media Library image${addedCount === 1 ? '' : 's'}.`;
      }
    } catch (error) {
      status.textContent = getErrorMessage(error, 'Unable to select a Media Library image.');
    } finally {
      button.disabled = this.readOnly;
    }
  }

  private async uploadImages(
    files: readonly File[],
    appendImage: (image: BlogGalleryImage) => void,
    status: HTMLElement,
    progress: HTMLElement,
    progressBar: HTMLElement,
    button: HTMLButtonElement,
    refreshStatus: () => void
  ): Promise<void> {
    const upload = this.config.uploader?.uploadByFile;

    if (!upload || files.length === 0) {
      return;
    }

    button.disabled = true;
    progress.hidden = false;

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const completedBase = index / files.length;
        status.textContent = `Preparing ${file.name} (${index + 1} of ${files.length})...`;
        progress.setAttribute('aria-valuenow', String(Math.round(completedBase * 100)));

        const result = await upload(file, value => {
          const fileProgress = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
          const totalProgress = Math.round((completedBase + fileProgress / 100 / files.length) * 100);
          progress.setAttribute('aria-valuenow', String(totalProgress));
          progressBar.style.width = `${Math.max(8, totalProgress)}%`;
          status.textContent = fileProgress >= 100
            ? `Upload complete for ${file.name}. Processing image and creating web-ready versions...`
            : `Uploading ${file.name}... ${Math.round(fileProgress)}%`;
        });

        if (!result.file.url) {
          throw new Error(`Upload completed without an image URL for ${file.name}.`);
        }

        appendImage({
          url: result.file.url,
          alt: result.file.alt?.trim() || file.name,
          ...(result.file.width ? {width: result.file.width} : {}),
          ...(result.file.height ? {height: result.file.height} : {}),
        });
      }

      status.textContent = `Added ${files.length} uploaded image${files.length === 1 ? '' : 's'} to the gallery.`;
    } catch (error) {
      status.textContent = getErrorMessage(error, 'Unable to upload the gallery images.');
    } finally {
      progress.hidden = true;
      progress.setAttribute('aria-valuenow', '0');
      progressBar.style.width = '0';
      refreshStatus();
    }
  }
}

function normalizeGalleryData(data: CmsGalleryBlockData | undefined): Required<CmsGalleryBlockData> {
  return {
    title: typeof data?.title === 'string' ? data.title : '',
    caption: typeof data?.caption === 'string' ? data.caption : '',
    layout: isGalleryLayout(data?.layout) ? data.layout : 'grid',
    images: Array.isArray(data?.images)
      ? data.images.slice(0, CMS_GALLERY_MAX_IMAGES).map(normalizeGalleryImage)
      : [],
  };
}

function normalizeGalleryImage(value: BlogGalleryImage): BlogGalleryImage {
  const width = getPositiveNumber(value?.width);
  const height = getPositiveNumber(value?.height);
  const caption = typeof value?.caption === 'string' ? value.caption : '';

  return {
    url: typeof value?.url === 'string' ? value.url : '',
    alt: typeof value?.alt === 'string' ? value.alt : '',
    ...(caption ? {caption} : {}),
    ...(width ? {width} : {}),
    ...(height ? {height} : {}),
  };
}

function createGalleryImageRow(
  image: BlogGalleryImage,
  readOnly: boolean,
  list: HTMLElement,
  refreshStatus: () => void
): HTMLElement {
  const row = createElement('article');
  row.dataset['galleryImageRow'] = 'true';
  row.dataset['galleryWidth'] = image.width ? String(image.width) : '';
  row.dataset['galleryHeight'] = image.height ? String(image.height) : '';
  row.style.cssText = 'display:grid;grid-template-columns:minmax(120px,180px) minmax(0,1fr);gap:12px;border:1px solid #d4d4d8;background:#fff;padding:12px';

  const preview = createElement('figure');
  preview.style.cssText = 'margin:0;min-height:120px;display:grid;place-items:center;overflow:hidden;background:#f4f4f5';
  const imageElement = createElement('img');
  imageElement.src = image.url;
  imageElement.alt = image.alt || 'Gallery image preview';
  imageElement.style.cssText = 'display:block;width:100%;height:100%;max-height:180px;object-fit:contain';
  const emptyPreview = createElement('span', '', 'Add an image URL');
  emptyPreview.style.cssText = 'padding:16px;text-align:center;font-size:12px;color:#71717a';

  const renderPreview = (url: string): void => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      preview.replaceChildren(emptyPreview);
      return;
    }

    try {
      const parsedUrl = new URL(trimmedUrl);
      const isSafeProtocol = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
      if (!isSafeProtocol) {
        preview.replaceChildren(emptyPreview);
        return;
      }
      imageElement.src = parsedUrl.toString();
      preview.replaceChildren(imageElement);
    } catch {
      preview.replaceChildren(emptyPreview);
    }
  };
  renderPreview(image.url);

  const fields = createElement('div');
  fields.style.cssText = 'display:grid;gap:8px;min-width:0';
  const urlInput = createTextInput('Image URL', 'https://...', image.url, readOnly);
  const url = urlInput.querySelector('input');
  url?.setAttribute('type', 'url');
  url?.setAttribute('data-gallery-image-url', 'true');
  url?.addEventListener('input', () => renderPreview(url.value));

  const altInput = createTextInput('Alt text', 'Describe this image for screen readers', image.alt, readOnly);
  const alt = altInput.querySelector('input');
  alt?.setAttribute('data-gallery-image-alt', 'true');
  alt?.addEventListener('input', () => {
    imageElement.alt = alt.value.trim() || 'Gallery image preview';
  });

  const captionInput = createTextInput('Image caption', 'Optional caption for this image', image.caption ?? '', readOnly);
  captionInput.querySelector('input')?.setAttribute('data-gallery-image-caption', 'true');

  const controls = createElement('div');
  controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
  const moveUp = createRowButton('Move up', readOnly);
  moveUp.dataset['galleryMoveUp'] = 'true';
  moveUp.addEventListener('click', () => {
    const previous = row.previousElementSibling;
    if (previous) {
      list.insertBefore(row, previous);
    }
  });
  const moveDown = createRowButton('Move down', readOnly);
  moveDown.dataset['galleryMoveDown'] = 'true';
  moveDown.addEventListener('click', () => {
    const next = row.nextElementSibling;
    if (next) {
      list.insertBefore(next, row);
    }
  });
  const remove = createRowButton('Remove', readOnly);
  remove.dataset['galleryRemove'] = 'true';
  remove.style.color = '#b91c1c';
  remove.addEventListener('click', () => {
    row.remove();
    refreshStatus();
  });
  controls.append(moveUp, moveDown, remove);

  fields.append(urlInput, altInput, captionInput, controls);
  row.append(preview, fields);
  return row;
}

function createTextInput(labelText: string, placeholder: string, value: string, readOnly: boolean): HTMLLabelElement {
  const label = createElement('label');
  label.style.cssText = 'display:grid;gap:5px;margin-top:10px';
  const text = createElement('span', '', labelText);
  text.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#52525b';
  const input = createElement('input');
  input.type = 'text';
  input.value = value;
  input.placeholder = placeholder;
  input.readOnly = readOnly;
  input.style.cssText = fieldStyle();
  label.append(text, input);
  return label;
}

function createTextArea(labelText: string, placeholder: string, value: string, readOnly: boolean): HTMLLabelElement {
  const label = createElement('label');
  label.style.cssText = 'display:grid;gap:5px;margin-top:10px';
  const text = createElement('span', '', labelText);
  text.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#52525b';
  const textarea = createElement('textarea');
  textarea.value = value;
  textarea.placeholder = placeholder;
  textarea.readOnly = readOnly;
  textarea.rows = 2;
  textarea.style.cssText = `${fieldStyle()}resize:vertical;line-height:1.5`;
  label.append(text, textarea);
  return label;
}

function createActionButton(text: string): HTMLButtonElement {
  const button = createElement('button', '', text);
  button.type = 'button';
  button.style.cssText = 'border:1px solid #0891b2;background:#ecfeff;padding:8px 12px;font:inherit;font-size:12px;font-weight:700;color:#155e75;cursor:pointer';
  return button;
}

function createRowButton(text: string, disabled: boolean): HTMLButtonElement {
  const button = createElement('button', '', text);
  button.type = 'button';
  button.disabled = disabled;
  button.style.cssText = 'border:1px solid #d4d4d8;background:#fff;padding:7px 9px;font:inherit;font-size:11px;font-weight:700;color:#52525b;cursor:pointer';
  return button;
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

function fieldStyle(): string {
  return 'box-sizing:border-box;width:100%;border:1px solid #a1a1aa;background:#fff;padding:9px 10px;font:inherit;font-size:13px;color:#18181b;outline:none';
}

function getFieldValue(parent: ParentNode, selector: string): string {
  const field = parent.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  return field?.value.trim() ?? '';
}

function getPositiveNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function isGalleryLayout(value: unknown): value is BlogGalleryLayout {
  return typeof value === 'string' && (BLOG_GALLERY_LAYOUTS as readonly string[]).includes(value);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
