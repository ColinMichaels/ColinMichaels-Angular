import type {BlockAPI, BlockTune} from '@editorjs/editorjs';
import type {MenuConfig} from '@editorjs/editorjs/types/tools';

import {BlogListPresentation} from '../../../../../features/blog/models/blog-post.model';

export interface ListPresentationTuneData {
  presentation?: BlogListPresentation;
}

interface ListPresentationTuneConstructorOptions {
  block: BlockAPI;
  data?: ListPresentationTuneData;
}

const STANDARD_LIST_ICON = `
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="4" cy="5" r="1.25" fill="currentColor"/>
    <circle cx="4" cy="10" r="1.25" fill="currentColor"/>
    <circle cx="4" cy="15" r="1.25" fill="currentColor"/>
    <path d="M8 5h8M8 10h8M8 15h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;

const STEP_LIST_ICON = `
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="5" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="5" cy="15" r="3" stroke="currentColor" stroke-width="1.5"/>
    <path d="M5 8v4M10 5h6M10 15h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;

/**
 * Adds one bounded presentation choice to the existing Editor.js List tool.
 * Standard remains implicit so opening and saving a legacy post does not add
 * presentation data unless the author explicitly selects Steps.
 */
export class ListPresentationTune implements BlockTune {
  static get isTune(): boolean {
    return true;
  }

  private readonly block: BlockAPI;
  private presentation: BlogListPresentation;
  private presentationExplicit: boolean;
  private wrapper: HTMLElement | null = null;

  constructor({block, data}: ListPresentationTuneConstructorOptions) {
    this.block = block;
    this.presentation = data?.presentation === 'steps' ? 'steps' : 'standard';
    this.presentationExplicit = data?.presentation === 'standard' || data?.presentation === 'steps';
  }

  wrap(pluginContent: HTMLElement): HTMLElement {
    const wrapper = pluginContent.ownerDocument.createElement('div');
    wrapper.className = 'cms-list-presentation';
    wrapper.append(pluginContent);
    this.wrapper = wrapper;
    this.syncWrapperState();

    return wrapper;
  }

  render(): MenuConfig {
    const stepsAvailable = this.isOrderedList();

    return [
      {
        title: 'Standard list',
        icon: STANDARD_LIST_ICON,
        isActive: this.presentation === 'standard' || !stepsAvailable,
        closeOnActivate: true,
        onActivate: () => this.setPresentation('standard'),
      },
      {
        title: 'Step sequence',
        secondaryLabel: 'Ordered lists only',
        icon: STEP_LIST_ICON,
        isActive: this.presentation === 'steps' && stepsAvailable,
        isDisabled: !stepsAvailable,
        closeOnActivate: true,
        onActivate: () => this.setPresentation('steps'),
      },
    ];
  }

  save(): ListPresentationTuneData {
    if (!this.presentationExplicit || (this.presentation === 'steps' && !this.isOrderedList())) {
      return {};
    }

    return {presentation: this.presentation};
  }

  private setPresentation(presentation: BlogListPresentation): void {
    if (presentation === 'steps' && !this.isOrderedList()) {
      return;
    }

    this.presentation = presentation;
    this.presentationExplicit = true;
    this.syncWrapperState();
    this.block.dispatchChange();
  }

  private isOrderedList(): boolean {
    const root = this.wrapper ?? this.block.holder;
    return root.querySelector('.cdx-list-ordered') !== null;
  }

  private syncWrapperState(): void {
    if (this.wrapper) {
      const renderedPresentation = this.presentation === 'steps' && this.isOrderedList()
        ? 'steps'
        : 'standard';
      this.wrapper.dataset['listPresentation'] = renderedPresentation;
    }
  }
}
