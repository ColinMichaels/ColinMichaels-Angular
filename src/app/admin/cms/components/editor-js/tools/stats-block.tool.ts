import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

import {BlogStatItem} from '../../../../../features/blog/models/blog-post.model';
import {
  downloadTextImportExample,
  parseStatsImport,
  readTextImportFile,
  STATS_IMPORT_EXAMPLE_CSV,
  STATS_IMPORT_EXAMPLE_JSON,
} from './tabular-block-import.util';

export interface StatsBlockData {
  title?: string;
  caption?: string;
  stats?: readonly BlogStatItem[];
}

const textFieldSanitizer: SanitizerConfig = {};

export class StatsBlockTool implements BlockTool {
  static get toolbox(): { title: string; icon: string } {
    return {
      title: 'Stats',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 14h12v1.5H3V14Zm1-6h2.5v5H4V8Zm4-4h2.5v9H8V4Zm4 2h2.5v7H12V6Z" fill="currentColor"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      title: textFieldSanitizer,
      caption: textFieldSanitizer,
      stats: textFieldSanitizer,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<StatsBlockData>;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<StatsBlockData>) {
    this.data = normalizeStatsData(options.data);
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-stats-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #22c55e',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const heading = document.createElement('p');
    heading.textContent = 'Stats block';
    heading.style.cssText = 'margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#15803d';

    const titleInput = createInput('Title', 'Optional title, for example Performance Snapshot', this.data.title, this.readOnly);
    setFieldDataset(titleInput, 'statsTitle');

    const list = document.createElement('div');
    list.dataset['statsList'] = 'true';
    list.style.cssText = 'display:grid;gap:10px;margin-top:12px';

    const addRow = (item?: BlogStatItem): void => {
      list.append(createStatRow(item, this.readOnly));
    };

    const replaceRows = (items: readonly BlogStatItem[]): void => {
      list.replaceChildren();

      for (const item of items) {
        addRow(item);
      }

      if (items.length === 0) {
        addRow();
      }
    };

    for (const item of this.data.stats) {
      addRow(item);
    }

    if (this.data.stats.length === 0) {
      addRow();
    }

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = 'Add stat';
    addButton.disabled = this.readOnly;
    addButton.style.cssText = 'margin-top:12px;border:1px solid #22c55e;background:#ecfdf5;padding:8px 12px;font:inherit;font-size:13px;font-weight:700;color:#14532d;cursor:pointer';
    addButton.addEventListener('click', () => addRow());

    const importPanel = createStatsImportPanel(this.readOnly, replaceRows);

    const caption = createTextArea('Caption', 'Optional context below the stats...', this.data.caption, this.readOnly, 2);
    setFieldDataset(caption, 'statsCaption');
    caption.style.marginTop = '12px';

    wrapper.append(heading, titleInput, list, addButton, importPanel, caption);

    return wrapper;
  }

  save(block: HTMLElement): StatsBlockData {
    const title = getFieldValue(block, '[data-stats-title]');
    const caption = getFieldValue(block, '[data-stats-caption]');
    const stats = [...block.querySelectorAll<HTMLElement>('[data-stat-row]')]
      .map(row => ({
        label: getFieldValue(row, '[data-stat-label]'),
        value: getFieldValue(row, '[data-stat-value]'),
        caption: getFieldValue(row, '[data-stat-caption]'),
      }))
      .filter(item => item.label.length > 0 || item.value.length > 0);

    return {
      title,
      caption,
      stats,
    };
  }

  validate(data: StatsBlockData): boolean {
    return normalizeStatsData(data).stats.length > 0;
  }
}

function createStatRow(item: BlogStatItem | undefined, readOnly: boolean): HTMLElement {
  const row = document.createElement('div');
  row.dataset['statRow'] = 'true';
  row.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,.45fr) auto;gap:8px;align-items:end;border:1px solid #e4e4e7;background:#fff;padding:10px';

  const label = createInput('Label', 'Horsepower', item?.label ?? '', readOnly);
  setFieldDataset(label, 'statLabel');

  const value = createInput('Value', '480 hp', item?.value ?? '', readOnly);
  setFieldDataset(value, 'statValue');

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.textContent = 'Remove';
  removeButton.disabled = readOnly;
  removeButton.style.cssText = 'border:1px solid #d4d4d8;background:#fff;padding:9px 10px;font:inherit;font-size:12px;color:#52525b;cursor:pointer';
  removeButton.addEventListener('click', () => row.remove());

  const caption = createInput('Caption', 'Optional note', item?.caption ?? '', readOnly);
  setFieldDataset(caption, 'statCaption');
  caption.style.gridColumn = '1 / -1';

  row.append(label, value, removeButton, caption);

  return row;
}

function createStatsImportPanel(readOnly: boolean, replaceRows: (items: readonly BlogStatItem[]) => void): HTMLElement {
  const panel = document.createElement('section');
  panel.setAttribute('aria-label', 'Import stats');
  panel.style.cssText = 'margin-top:12px;border:1px dashed #86efac;background:#f0fdf4;padding:12px';

  const heading = document.createElement('p');
  heading.textContent = 'Import stats';
  heading.style.cssText = 'margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#166534';

  const helpText = document.createElement('p');
  helpText.textContent = 'Required fields: label and value. Optional field: caption. Paste CSV with a header row like label,value,caption, or use JSON with a stats, rows, items, or data array.';
  helpText.style.cssText = 'margin:0 0 8px;font-size:12px;line-height:1.45;color:#3f6212';

  const formatText = document.createElement('p');
  formatText.textContent = 'Copy/paste format: one stat per line. If you skip the header row, columns are read as label, value, then caption.';
  formatText.style.cssText = 'margin:0 0 10px;font-size:12px;line-height:1.45;color:#3f6212';

  const exampleControls = document.createElement('div');
  exampleControls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px';

  const csvExampleButton = createExampleDownloadButton('Download CSV example', readOnly);
  csvExampleButton.addEventListener('click', () => {
    downloadTextImportExample('stats-import-example.csv', STATS_IMPORT_EXAMPLE_CSV, 'text/csv;charset=utf-8');
  });

  const jsonExampleButton = createExampleDownloadButton('Download JSON example', readOnly);
  jsonExampleButton.addEventListener('click', () => {
    downloadTextImportExample('stats-import-example.json', STATS_IMPORT_EXAMPLE_JSON, 'application/json;charset=utf-8');
  });

  exampleControls.append(csvExampleButton, jsonExampleButton);

  const textareaLabel = createTextArea(
    'Paste CSV or JSON',
    'label,value,caption\nHorsepower,480 hp,5.0L V8\nTorque,415 lb-ft,Peak torque',
    '',
    readOnly,
    4
  );
  const textarea = textareaLabel.querySelector('textarea');

  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px';

  const message = document.createElement('p');
  message.setAttribute('role', 'status');
  message.style.cssText = 'margin:8px 0 0;font-size:12px;line-height:1.45;color:#3f6212';

  const importButton = createImportButton('Import pasted rows', readOnly);
  importButton.addEventListener('click', () => {
    importStatsText(textarea?.value ?? '', replaceRows, message);
  });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv,.json,text/csv,application/json';
  fileInput.disabled = readOnly;
  fileInput.style.cssText = 'max-width:220px;font:inherit;font-size:12px;color:#166534';

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];

    if (!file) {
      return;
    }

    void readTextImportFile(file)
      .then(text => importStatsText(text, replaceRows, message))
      .catch(error => showImportMessage(message, getErrorMessage(error), true));
  });

  controls.append(importButton, fileInput);
  panel.append(heading, helpText, formatText, exampleControls, textareaLabel, controls, message);

  return panel;
}

function createExampleDownloadButton(text: string, readOnly: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.disabled = readOnly;
  button.style.cssText = 'border:1px solid #86efac;background:#fff;padding:7px 10px;font:inherit;font-size:12px;font-weight:700;color:#166534;cursor:pointer';

  return button;
}

function createImportButton(text: string, readOnly: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.disabled = readOnly;
  button.style.cssText = 'border:1px solid #22c55e;background:#dcfce7;padding:8px 12px;font:inherit;font-size:12px;font-weight:700;color:#14532d;cursor:pointer';

  return button;
}

function importStatsText(source: string, replaceRows: (items: readonly BlogStatItem[]) => void, message: HTMLElement): void {
  try {
    const result = parseStatsImport(source);
    replaceRows(result.items);
    showImportMessage(message, `${result.message} Current rows were replaced.`, false);
  } catch (error) {
    showImportMessage(message, getErrorMessage(error), true);
  }
}

function showImportMessage(message: HTMLElement, text: string, isError: boolean): void {
  message.textContent = text;
  message.style.color = isError ? '#b91c1c' : '#166534';
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

function createTextArea(labelText: string, placeholder: string, value: string, readOnly: boolean, rows: number): HTMLLabelElement {
  const label = document.createElement('label');
  label.style.cssText = 'display:block';

  const text = document.createElement('span');
  text.textContent = labelText;
  text.style.cssText = 'display:block;margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#71717a';

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.placeholder = placeholder;
  textarea.readOnly = readOnly;
  textarea.rows = rows;
  textarea.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #d4d4d8;background:#fff;padding:10px;font:inherit;font-size:14px;line-height:1.55;color:#18181b;outline:none;resize:vertical';

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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to import stats.';
}

function normalizeStatsData(data: StatsBlockData | undefined): Required<StatsBlockData> {
  const stats = Array.isArray(data?.stats)
    ? data.stats
      .map(item => ({
        label: typeof item.label === 'string' ? item.label.trim() : '',
        value: typeof item.value === 'string' ? item.value.trim() : '',
        caption: typeof item.caption === 'string' ? item.caption.trim() : '',
      }))
      .filter(item => item.label.length > 0 || item.value.length > 0)
    : [];

  return {
    title: typeof data?.title === 'string' ? data.title : '',
    caption: typeof data?.caption === 'string' ? data.caption : '',
    stats,
  };
}
