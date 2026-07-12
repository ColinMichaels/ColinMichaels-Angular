import type {BlockTool, BlockToolConstructorOptions} from '@editorjs/editorjs';

export type CatCornerUnlockBlockData = Record<string, never>;

export class CatCornerUnlockBlockTool implements BlockTool {
  static get toolbox(): { title: string; icon: string } {
    return {
      title: 'Cat Corner Unlock',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="currentColor" d="M4.2 3.2 7 5.1A7.8 7.8 0 0 1 9 4.8c.7 0 1.4.1 2 .3l2.8-1.9.4 4A5.6 5.6 0 0 1 15 10c0 2.8-2.7 5-6 5s-6-2.2-6-5c0-1 .3-2 .8-2.8l.4-4ZM6.5 9.1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM7 11.2c.5.7 1.2 1 2 1s1.5-.3 2-1H7Z"/></svg>',
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<CatCornerUnlockBlockData>) {
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-cat-corner-unlock-tool';
    wrapper.dataset['catCornerUnlock'] = 'true';
    wrapper.style.cssText = [
      'border:1px solid #d6d3d1',
      'border-left:4px solid #a16207',
      'background:#fffbeb',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#292524',
    ].join(';');

    const eyebrow = document.createElement('p');
    eyebrow.textContent = 'Cat Corner';
    eyebrow.style.cssText = 'margin:0;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#a16207';

    const title = document.createElement('p');
    title.textContent = 'Gretchen Easter egg';
    title.style.cssText = 'margin:6px 0 0;font-size:16px;font-weight:700;color:#1c1917';

    const description = document.createElement('p');
    description.textContent = this.readOnly
      ? 'Readers can discover Gretchen here and unlock Cat Corner access.'
      : 'This renders the shared Gretchen unlock experience. The image and behavior are managed by Cat Corner, so there is nothing to configure in this block.';
    description.style.cssText = 'margin:5px 0 0;font-size:13px;line-height:1.55;color:#57534e';

    wrapper.append(eyebrow, title, description);
    return wrapper;
  }

  save(): CatCornerUnlockBlockData {
    return {};
  }

  validate(): boolean {
    return true;
  }
}
