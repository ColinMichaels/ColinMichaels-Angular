import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

import {
  BLOG_BLOCK_PLACEMENTS,
  BLOG_POLL_RESULTS_VISIBILITIES,
  BlogBlockPlacement,
  BlogPollOption,
  BlogPollResultsVisibility,
} from '../../../../../features/blog/models/blog-post.model';

export interface PollBlockData {
  placement?: BlogBlockPlacement;
  question?: string;
  description?: string;
  pollOptions?: readonly BlogPollOption[];
  pollResultsVisibility?: BlogPollResultsVisibility;
}

const MIN_POLL_OPTIONS = 2;
const MAX_POLL_OPTIONS = 8;
const textFieldSanitizer: SanitizerConfig = {};

const resultsVisibilityLabels: Record<BlogPollResultsVisibility, string> = {
  afterVote: 'After a reader votes',
  always: 'Always show results',
  hidden: 'Keep results private',
};

const placementLabels: Record<BlogBlockPlacement, string> = {
  rail: 'Right reading rail',
  content: 'Inside the article',
};

export class PollBlockTool implements BlockTool {
  static get toolbox(): {title: string; icon: string} {
    return {
      title: 'Poll',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 3.25h10v1.5H4v-1.5Zm0 5h10v1.5H4v-1.5Zm0 5h10v1.5H4v-1.5ZM1.75 3h1.5v2h-1.5V3Zm0 5h1.5v2h-1.5V8Zm0 5h1.5v2h-1.5v-2Z" fill="currentColor"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      placement: textFieldSanitizer,
      question: textFieldSanitizer,
      description: textFieldSanitizer,
      pollOptions: textFieldSanitizer,
      pollResultsVisibility: textFieldSanitizer,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<PollBlockData>;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<PollBlockData>) {
    this.data = normalizePollData(options.data);
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-poll-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #06b6d4',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const heading = document.createElement('p');
    heading.textContent = 'Poll block';
    heading.style.cssText = 'margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#0e7490';

    const question = createInput('Question', 'Which topic should I break down next?', this.data.question, this.readOnly, 'pollQuestion');
    const description = createInput('Supporting copy', 'Choose one answer. You can change your vote later.', this.data.description, this.readOnly, 'pollDescription');
    description.style.marginTop = '10px';

    const list = document.createElement('div');
    list.dataset['pollOptionList'] = 'true';
    list.style.cssText = 'display:grid;gap:8px;margin-top:12px';

    const addOption = (option?: BlogPollOption): void => {
      if (list.childElementCount < MAX_POLL_OPTIONS) {
        list.append(createOptionRow(option, this.readOnly, list));
      }
    };

    for (const option of this.data.pollOptions) {
      addOption(option);
    }

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = 'Add answer';
    addButton.disabled = this.readOnly;
    addButton.style.cssText = 'margin-top:10px;border:1px solid #06b6d4;background:#ecfeff;padding:8px 12px;font:inherit;font-size:13px;font-weight:700;color:#164e63;cursor:pointer';
    addButton.addEventListener('click', () => addOption());

    const visibilityLabel = document.createElement('label');
    visibilityLabel.style.cssText = 'display:grid;gap:5px;margin-top:14px;font-size:12px;font-weight:700;color:#3f3f46';
    visibilityLabel.textContent = 'Results visibility';

    const visibility = document.createElement('select');
    visibility.dataset['pollResultsVisibility'] = 'true';
    visibility.disabled = this.readOnly;
    visibility.style.cssText = 'border:1px solid #a1a1aa;background:#fff;padding:9px 10px;font:inherit;font-size:13px;color:#18181b;outline:none';

    for (const value of BLOG_POLL_RESULTS_VISIBILITIES) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = resultsVisibilityLabels[value];
      option.selected = value === this.data.pollResultsVisibility;
      visibility.append(option);
    }

    visibilityLabel.append(visibility);

    const placementLabel = document.createElement('label');
    placementLabel.style.cssText = 'display:grid;gap:5px;margin-top:14px;font-size:12px;font-weight:700;color:#3f3f46';
    placementLabel.textContent = 'Post placement';

    const placement = document.createElement('select');
    placement.dataset['pollPlacement'] = 'true';
    placement.disabled = this.readOnly;
    placement.style.cssText = 'border:1px solid #a1a1aa;background:#fff;padding:9px 10px;font:inherit;font-size:13px;color:#18181b;outline:none';

    for (const value of BLOG_BLOCK_PLACEMENTS) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = placementLabels[value];
      option.selected = value === this.data.placement;
      placement.append(option);
    }

    placementLabel.append(placement);

    const note = document.createElement('p');
    note.textContent = 'Readers must sign in to vote. Each account has one answer and may update it later. After voting begins, edit answer labels only for typo fixes; remove and add an answer to create a new choice.';
    note.style.cssText = 'margin:12px 0 0;font-size:12px;line-height:1.5;color:#71717a';

    wrapper.append(heading, question, description, list, addButton, visibilityLabel, placementLabel, note);
    return wrapper;
  }

  save(block: HTMLElement): PollBlockData {
    const pollOptions = [...block.querySelectorAll<HTMLElement>('[data-poll-option-row]')]
      .map(row => ({
        id: row.dataset['pollOptionId'] ?? createPollOptionId(),
        label: getInputValue(row, '[data-poll-option-label]'),
      }))
      .filter(option => option.label.length > 0)
      .slice(0, MAX_POLL_OPTIONS);

    return {
      placement: normalizePlacement(
        block.querySelector<HTMLSelectElement>('[data-poll-placement]')?.value
      ),
      question: getInputValue(block, '[data-poll-question]'),
      description: getInputValue(block, '[data-poll-description]'),
      pollOptions,
      pollResultsVisibility: normalizeResultsVisibility(
        block.querySelector<HTMLSelectElement>('[data-poll-results-visibility]')?.value
      ),
    };
  }

  validate(data: PollBlockData): boolean {
    const normalized = normalizePollData(data);
    const normalizedLabels = normalized.pollOptions.map(option => option.label.toLocaleLowerCase());
    return normalized.question.length > 0
      && normalized.pollOptions.length >= MIN_POLL_OPTIONS
      && normalized.pollOptions.every(option => option.label.length > 0)
      && new Set(normalized.pollOptions.map(option => option.id)).size === normalized.pollOptions.length
      && new Set(normalizedLabels).size === normalizedLabels.length;
  }
}

function createOptionRow(option: BlogPollOption | undefined, readOnly: boolean, list: HTMLElement): HTMLElement {
  const row = document.createElement('div');
  row.dataset['pollOptionRow'] = 'true';
  row.dataset['pollOptionId'] = option?.id || createPollOptionId();
  row.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;border:1px solid #e4e4e7;background:#fff;padding:10px';

  const input = createInput('Answer', 'Answer text', option?.label ?? '', readOnly, 'pollOptionLabel');
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.textContent = 'Remove';
  removeButton.disabled = readOnly;
  removeButton.style.cssText = 'border:1px solid #d4d4d8;background:#fff;padding:9px 10px;font:inherit;font-size:12px;color:#52525b;cursor:pointer';
  removeButton.addEventListener('click', () => {
    if (list.childElementCount > MIN_POLL_OPTIONS) {
      row.remove();
    }
  });

  row.append(input, removeButton);
  return row;
}

function createInput(
  label: string,
  placeholder: string,
  value: string,
  readOnly: boolean,
  datasetKey: string
): HTMLLabelElement {
  const wrapper = document.createElement('label');
  wrapper.style.cssText = 'display:grid;gap:5px;font-size:12px;font-weight:700;color:#3f3f46';
  wrapper.textContent = label;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.placeholder = placeholder;
  input.readOnly = readOnly;
  input.dataset[datasetKey] = 'true';
  input.style.cssText = 'border:1px solid #a1a1aa;background:#fff;padding:9px 10px;font:inherit;font-size:13px;color:#18181b;outline:none';
  wrapper.append(input);
  return wrapper;
}

function getInputValue(block: HTMLElement, selector: string): string {
  return block.querySelector<HTMLInputElement>(selector)?.value.trim() ?? '';
}

function normalizePollData(data: PollBlockData | undefined): Required<PollBlockData> {
  const pollOptions = (data?.pollOptions ?? [])
    .map(option => ({id: option.id.trim() || createPollOptionId(), label: option.label.trim()}))
    .filter(option => option.label.length > 0)
    .slice(0, MAX_POLL_OPTIONS);

  while (pollOptions.length < MIN_POLL_OPTIONS) {
    pollOptions.push({id: createPollOptionId(), label: ''});
  }

  return {
    placement: normalizePlacement(data?.placement),
    question: data?.question?.trim() ?? '',
    description: data?.description?.trim() ?? '',
    pollOptions,
    pollResultsVisibility: normalizeResultsVisibility(data?.pollResultsVisibility),
  };
}

function normalizePlacement(value: unknown): BlogBlockPlacement {
  return typeof value === 'string' && (BLOG_BLOCK_PLACEMENTS as readonly string[]).includes(value)
    ? value as BlogBlockPlacement
    : 'rail';
}

function normalizeResultsVisibility(value: unknown): BlogPollResultsVisibility {
  return typeof value === 'string' && (BLOG_POLL_RESULTS_VISIBILITIES as readonly string[]).includes(value)
    ? value as BlogPollResultsVisibility
    : 'afterVote';
}

function createPollOptionId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `option-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
