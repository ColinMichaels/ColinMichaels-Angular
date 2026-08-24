import type {BlockTool, BlockToolConstructorOptions} from '@editorjs/editorjs';

import type {
  BlogJsonObject,
} from '../../../../../features/blog/models/blog-post.model';
import type {DecodedBlogUnsupportedBlockEnvelope} from '../../../../../features/blog/utils/blog-unsupported-block.util';
import {isJsonObject} from '../../../utils/blog-editor-document-validation.util';

export type UnsupportedEditorBlockData = DecodedBlogUnsupportedBlockEnvelope;

export class UnsupportedBlockTool implements BlockTool {
  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: UnsupportedEditorBlockData;

  constructor(options: BlockToolConstructorOptions<UnsupportedEditorBlockData>) {
    this.data = normalizeUnsupportedBlockData(options.data);
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-unsupported-block-tool';
    wrapper.dataset['unsupportedBlock'] = 'true';
    wrapper.style.cssText = [
      'border:1px solid #f59e0b',
      'border-left:4px solid #b45309',
      'background:#fffbeb',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#292524',
    ].join(';');

    const eyebrow = document.createElement('p');
    eyebrow.textContent = 'Compatibility protection';
    eyebrow.style.cssText = 'margin:0;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#b45309';

    const title = document.createElement('p');
    title.textContent = `Unsupported block preserved: ${this.data.originalType}`;
    title.style.cssText = 'margin:6px 0 0;font-size:16px;font-weight:700;color:#1c1917';

    const description = document.createElement('p');
    description.textContent = 'This block is kept losslessly but is not rendered on the public article. Do not remove it unless you intend to remove the original content.';
    description.style.cssText = 'margin:6px 0 0;font-size:13px;line-height:1.55;color:#57534e';

    const details = document.createElement('details');
    details.style.cssText = 'margin-top:12px;border-top:1px solid #fde68a;padding-top:10px';

    const summary = document.createElement('summary');
    summary.textContent = 'View preserved JSON';
    summary.style.cssText = 'cursor:pointer;font-size:12px;font-weight:700;color:#92400e';

    const source = document.createElement('pre');
    source.dataset['unsupportedBlockSource'] = 'true';
    source.textContent = JSON.stringify(createPreservedSource(this.data), null, 2);
    source.style.cssText = [
      'margin:10px 0 0',
      'max-height:280px',
      'overflow:auto',
      'border:1px solid #fde68a',
      'background:#fff',
      'padding:12px',
      'font-family:SFMono-Regular,Consolas,Liberation Mono,monospace',
      'font-size:12px',
      'line-height:1.55',
      'white-space:pre-wrap',
      'overflow-wrap:anywhere',
      'color:#451a03',
    ].join(';');

    details.append(summary, source);
    wrapper.append(eyebrow, title, description, details);
    return wrapper;
  }

  save(): UnsupportedEditorBlockData {
    return this.data;
  }

  validate(data: UnsupportedEditorBlockData): boolean {
    return isUnsupportedEditorBlockData(data);
  }
}

function normalizeUnsupportedBlockData(data: UnsupportedEditorBlockData | undefined): UnsupportedEditorBlockData {
  return {
    originalType: data?.originalType?.trim() || 'unknown',
    originalData: isJsonObject(data?.originalData) ? data.originalData : {},
    ...(isJsonObject(data?.originalTunes) ? {originalTunes: data.originalTunes} : {}),
  };
}

function isUnsupportedEditorBlockData(data: UnsupportedEditorBlockData | undefined): data is UnsupportedEditorBlockData {
  return typeof data?.originalType === 'string'
    && data.originalType.trim().length > 0
    && isJsonObject(data.originalData)
    && (data.originalTunes === undefined || isJsonObject(data.originalTunes));
}

function createPreservedSource(data: UnsupportedEditorBlockData): BlogJsonObject {
  return {
    type: data.originalType,
    data: data.originalData,
    ...(data.originalTunes ? {tunes: data.originalTunes} : {}),
  };
}
