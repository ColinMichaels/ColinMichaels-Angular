import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

import {
  BLOG_CHART_TYPES,
  BlogChartPoint,
  BlogChartType,
} from '../../../../../features/blog/models/blog-post.model';
import {
  CHART_IMPORT_EXAMPLE_CSV,
  CHART_IMPORT_EXAMPLE_JSON,
  downloadTextImportExample,
  parseChartImport,
  readTextImportFile,
} from './tabular-block-import.util';

export interface ChartBlockData {
  title?: string;
  caption?: string;
  chartType?: BlogChartType;
  unit?: string;
  chartPoints?: readonly BlogChartPoint[];
}

const textFieldSanitizer: SanitizerConfig = {};

const chartTypeLabels: Record<BlogChartType, string> = {
  bar: 'Bar chart',
  line: 'Line chart',
};

export class ChartBlockTool implements BlockTool {
  static get toolbox(): { title: string; icon: string } {
    return {
      title: 'Chart',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 14.5h12V16H3V14.5Zm1-2.8 2.8-3 2.7 1.8L13.6 4 15 4.9l-5 7.7-2.9-1.9-2 2.1L4 11.7Z" fill="currentColor"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      title: textFieldSanitizer,
      caption: textFieldSanitizer,
      unit: textFieldSanitizer,
      chartType: textFieldSanitizer,
      chartPoints: textFieldSanitizer,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: Required<ChartBlockData>;
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<ChartBlockData>) {
    this.data = normalizeChartData(options.data);
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-chart-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #38bdf8',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;gap:12px;align-items:end;justify-content:space-between;margin-bottom:12px';

    const heading = document.createElement('p');
    heading.textContent = 'Chart block';
    heading.style.cssText = 'margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#0369a1';

    const chartType = document.createElement('select');
    chartType.dataset['chartType'] = 'true';
    chartType.disabled = this.readOnly;
    chartType.style.cssText = 'border:1px solid #a1a1aa;background:#fff;padding:8px 10px;font-size:13px;color:#18181b;outline:none';

    for (const type of BLOG_CHART_TYPES) {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = chartTypeLabels[type];
      option.selected = type === this.data.chartType;
      chartType.append(option);
    }

    header.append(heading, chartType);

    const meta = document.createElement('div');
    meta.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,.35fr);gap:10px';

    const titleInput = createInput('Title', 'Optional title, for example Horsepower by Trim', this.data.title, this.readOnly);
    setFieldDataset(titleInput, 'chartTitle');

    const unitInput = createInput('Unit', 'hp, lb-ft, mph...', this.data.unit, this.readOnly);
    setFieldDataset(unitInput, 'chartUnit');

    meta.append(titleInput, unitInput);

    const list = document.createElement('div');
    list.dataset['chartPointList'] = 'true';
    list.style.cssText = 'display:grid;gap:10px;margin-top:12px';

    const addRow = (point?: BlogChartPoint): void => {
      list.append(createPointRow(point, this.readOnly));
    };

    const replaceRows = (points: readonly BlogChartPoint[]): void => {
      list.replaceChildren();

      for (const point of points) {
        addRow(point);
      }

      if (points.length === 0) {
        addRow();
      }
    };

    for (const point of this.data.chartPoints) {
      addRow(point);
    }

    if (this.data.chartPoints.length === 0) {
      addRow();
    }

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = 'Add point';
    addButton.disabled = this.readOnly;
    addButton.style.cssText = 'margin-top:12px;border:1px solid #38bdf8;background:#f0f9ff;padding:8px 12px;font:inherit;font-size:13px;font-weight:700;color:#0c4a6e;cursor:pointer';
    addButton.addEventListener('click', () => addRow());

    const importPanel = createChartImportPanel(this.readOnly, replaceRows);

    const caption = createTextArea('Caption', 'Optional chart note or data source...', this.data.caption, this.readOnly, 2);
    setFieldDataset(caption, 'chartCaption');
    caption.style.marginTop = '12px';

    wrapper.append(header, meta, list, addButton, importPanel, caption);

    return wrapper;
  }

  save(block: HTMLElement): ChartBlockData {
    const title = getFieldValue(block, '[data-chart-title]');
    const caption = getFieldValue(block, '[data-chart-caption]');
    const unit = getFieldValue(block, '[data-chart-unit]');
    const chartType = toChartType(block.querySelector<HTMLSelectElement>('[data-chart-type]')?.value);
    const chartPoints = [...block.querySelectorAll<HTMLElement>('[data-chart-point-row]')]
      .map((row, index) => ({
        label: getFieldValue(row, '[data-chart-point-label]') || `Point ${index + 1}`,
        value: Number(getFieldValue(row, '[data-chart-point-value]')),
        note: getFieldValue(row, '[data-chart-point-note]'),
      }))
      .filter(point => Number.isFinite(point.value));

    return {
      title,
      caption,
      chartType,
      unit,
      chartPoints,
    };
  }

  validate(data: ChartBlockData): boolean {
    return normalizeChartData(data).chartPoints.length > 0;
  }
}

function createPointRow(point: BlogChartPoint | undefined, readOnly: boolean): HTMLElement {
  const row = document.createElement('div');
  row.dataset['chartPointRow'] = 'true';
  row.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) minmax(110px,.3fr) auto;gap:8px;align-items:end;border:1px solid #e4e4e7;background:#fff;padding:10px';

  const label = createInput('Label', 'Mustang GT', point?.label ?? '', readOnly);
  setFieldDataset(label, 'chartPointLabel');

  const value = createInput(
    'Value',
    '480',
    typeof point?.value === 'number' && Number.isFinite(point.value) ? String(point.value) : '',
    readOnly
  );
  const valueInput = value.querySelector('input');
  if (valueInput) {
    valueInput.dataset['chartPointValue'] = 'true';
    valueInput.type = 'number';
    valueInput.step = 'any';
  }

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.textContent = 'Remove';
  removeButton.disabled = readOnly;
  removeButton.style.cssText = 'border:1px solid #d4d4d8;background:#fff;padding:9px 10px;font:inherit;font-size:12px;color:#52525b;cursor:pointer';
  removeButton.addEventListener('click', () => row.remove());

  const note = createInput('Note', 'Optional detail', point?.note ?? '', readOnly);
  setFieldDataset(note, 'chartPointNote');
  note.style.gridColumn = '1 / -1';

  row.append(label, value, removeButton, note);

  return row;
}

function createChartImportPanel(readOnly: boolean, replaceRows: (points: readonly BlogChartPoint[]) => void): HTMLElement {
  const panel = document.createElement('section');
  panel.setAttribute('aria-label', 'Import chart data');
  panel.style.cssText = 'margin-top:12px;border:1px dashed #7dd3fc;background:#f0f9ff;padding:12px';

  const heading = document.createElement('p');
  heading.textContent = 'Import chart data';
  heading.style.cssText = 'margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#075985';

  const helpText = document.createElement('p');
  helpText.textContent = 'Required fields: label and numeric value. Optional field: note. Paste CSV with a header row like label,value,note, or use JSON with a chartPoints, points, rows, items, or data array.';
  helpText.style.cssText = 'margin:0 0 8px;font-size:12px;line-height:1.45;color:#0c4a6e';

  const formatText = document.createElement('p');
  formatText.textContent = 'Copy/paste format: one chart point per line. If you skip the header row, columns are read as label, value, then note.';
  formatText.style.cssText = 'margin:0 0 10px;font-size:12px;line-height:1.45;color:#0c4a6e';

  const exampleControls = document.createElement('div');
  exampleControls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px';

  const csvExampleButton = createExampleDownloadButton('Download CSV example', readOnly);
  csvExampleButton.addEventListener('click', () => {
    downloadTextImportExample('chart-import-example.csv', CHART_IMPORT_EXAMPLE_CSV, 'text/csv;charset=utf-8');
  });

  const jsonExampleButton = createExampleDownloadButton('Download JSON example', readOnly);
  jsonExampleButton.addEventListener('click', () => {
    downloadTextImportExample('chart-import-example.json', CHART_IMPORT_EXAMPLE_JSON, 'application/json;charset=utf-8');
  });

  exampleControls.append(csvExampleButton, jsonExampleButton);

  const textareaLabel = createTextArea(
    'Paste CSV or JSON',
    'label,value,note\nEcoBoost,315,Turbo four\nGT,480,Manual coupe',
    '',
    readOnly,
    4
  );
  const textarea = textareaLabel.querySelector('textarea');

  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px';

  const message = document.createElement('p');
  message.setAttribute('role', 'status');
  message.style.cssText = 'margin:8px 0 0;font-size:12px;line-height:1.45;color:#0c4a6e';

  const importButton = createImportButton('Import pasted rows', readOnly);
  importButton.addEventListener('click', () => {
    importChartText(textarea?.value ?? '', replaceRows, message);
  });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv,.json,text/csv,application/json';
  fileInput.disabled = readOnly;
  fileInput.style.cssText = 'max-width:220px;font:inherit;font-size:12px;color:#075985';

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];

    if (!file) {
      return;
    }

    void readTextImportFile(file)
      .then(text => importChartText(text, replaceRows, message))
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
  button.style.cssText = 'border:1px solid #7dd3fc;background:#fff;padding:7px 10px;font:inherit;font-size:12px;font-weight:700;color:#075985;cursor:pointer';

  return button;
}

function createImportButton(text: string, readOnly: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.disabled = readOnly;
  button.style.cssText = 'border:1px solid #38bdf8;background:#e0f2fe;padding:8px 12px;font:inherit;font-size:12px;font-weight:700;color:#0c4a6e;cursor:pointer';

  return button;
}

function importChartText(source: string, replaceRows: (points: readonly BlogChartPoint[]) => void, message: HTMLElement): void {
  try {
    const result = parseChartImport(source);
    replaceRows(result.items);
    showImportMessage(message, `${result.message} Current rows were replaced.`, false);
  } catch (error) {
    showImportMessage(message, getErrorMessage(error), true);
  }
}

function showImportMessage(message: HTMLElement, text: string, isError: boolean): void {
  message.textContent = text;
  message.style.color = isError ? '#b91c1c' : '#075985';
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
  return error instanceof Error ? error.message : 'Unable to import chart data.';
}

function normalizeChartData(data: ChartBlockData | undefined): Required<ChartBlockData> {
  const chartPoints = Array.isArray(data?.chartPoints)
    ? data.chartPoints
      .map((point, index) => ({
        label: typeof point.label === 'string' && point.label.trim() ? point.label.trim() : `Point ${index + 1}`,
        value: typeof point.value === 'number' && Number.isFinite(point.value) ? point.value : Number.NaN,
        note: typeof point.note === 'string' ? point.note.trim() : '',
      }))
      .filter(point => Number.isFinite(point.value))
    : [];

  return {
    title: typeof data?.title === 'string' ? data.title : '',
    caption: typeof data?.caption === 'string' ? data.caption : '',
    chartType: toChartType(data?.chartType),
    unit: typeof data?.unit === 'string' ? data.unit : '',
    chartPoints,
  };
}

function toChartType(value: unknown): BlogChartType {
  return typeof value === 'string' && (BLOG_CHART_TYPES as readonly string[]).includes(value) ? value as BlogChartType : 'bar';
}
