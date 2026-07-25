import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

import {
  BLOG_CHART_TYPES,
  BlogChartDataset,
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
  labels?: readonly string[];
  datasets?: readonly BlogChartDataset[];
  xAxisTitle?: string;
  yAxisTitle?: string;
  yMax?: number;
  valueSuffix?: string;
  decimals?: number;
  showLegend?: boolean;
  sourceLabel?: string;
  sourceUrl?: string;
  accessibilitySummary?: string;
}

interface NormalizedChartBlockData {
  title: string;
  caption: string;
  chartType: BlogChartType;
  unit: string;
  chartPoints: readonly BlogChartPoint[];
  labels: readonly string[];
  datasets: readonly BlogChartDataset[];
  xAxisTitle: string;
  yAxisTitle: string;
  yMax: number | undefined;
  valueSuffix: string;
  decimals: number | undefined;
  showLegend: boolean | undefined;
  sourceLabel: string;
  sourceUrl: string;
  accessibilitySummary: string;
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
      labels: textFieldSanitizer,
      datasets: textFieldSanitizer,
      xAxisTitle: textFieldSanitizer,
      yAxisTitle: textFieldSanitizer,
      yMax: textFieldSanitizer,
      valueSuffix: textFieldSanitizer,
      decimals: textFieldSanitizer,
      showLegend: textFieldSanitizer,
      sourceLabel: textFieldSanitizer,
      sourceUrl: textFieldSanitizer,
      accessibilitySummary: textFieldSanitizer,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: NormalizedChartBlockData;
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
    const hasDatasets = this.data.datasets.length > 0;

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

    if (this.data.chartPoints.length === 0 && !hasDatasets) {
      addRow();
    }

    list.hidden = hasDatasets;

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = 'Add point';
    addButton.disabled = this.readOnly;
    addButton.hidden = hasDatasets;
    addButton.style.cssText = 'margin-top:12px;border:1px solid #38bdf8;background:#f0f9ff;padding:8px 12px;font:inherit;font-size:13px;font-weight:700;color:#0c4a6e;cursor:pointer';
    addButton.addEventListener('click', () => addRow());

    const importPanel = createChartImportPanel(this.readOnly, replaceRows);
    importPanel.hidden = hasDatasets;
    const chartJsPanel = createChartJsPanel(this.data, this.readOnly);

    const caption = createTextArea('Caption', 'Optional chart note or data source...', this.data.caption, this.readOnly, 2);
    setFieldDataset(caption, 'chartCaption');
    caption.style.marginTop = '12px';

    wrapper.append(header, meta, list, addButton, importPanel, chartJsPanel, caption);

    return wrapper;
  }

  save(block: HTMLElement): ChartBlockData {
    const title = getFieldValue(block, '[data-chart-title]');
    const caption = getFieldValue(block, '[data-chart-caption]');
    const unit = getFieldValue(block, '[data-chart-unit]');
    const chartType = toChartType(block.querySelector<HTMLSelectElement>('[data-chart-type]')?.value);
    const chartPoints = [...block.querySelectorAll<HTMLElement>('[data-chart-point-row]')]
      .flatMap((row, index) => {
        const value = getFieldValue(row, '[data-chart-point-value]');

        if (!value) {
          return [];
        }

        const numericValue = Number(value);

        return Number.isFinite(numericValue)
          ? [{
            label: getFieldValue(row, '[data-chart-point-label]') || `Point ${index + 1}`,
            value: numericValue,
            note: getFieldValue(row, '[data-chart-point-note]'),
          }]
          : [];
      });
    const chartJsConfiguration = parseChartJsConfiguration(
      getFieldValue(block, '[data-chart-js-configuration]')
    );
    const labels = chartJsConfiguration?.labels ?? this.data.labels;
    const datasets = chartJsConfiguration?.datasets ?? this.data.datasets;
    const xAxisTitle = getFieldValue(block, '[data-chart-x-axis-title]');
    const yAxisTitle = getFieldValue(block, '[data-chart-y-axis-title]');
    const yMax = getOptionalNumberFieldValue(block, '[data-chart-y-max]');
    const valueSuffix = getFieldValue(block, '[data-chart-value-suffix]');
    const decimals = getOptionalNumberFieldValue(block, '[data-chart-decimals]');
    const showLegend = block.querySelector<HTMLInputElement>('[data-chart-show-legend]')?.checked;
    const sourceLabel = getFieldValue(block, '[data-chart-source-label]');
    const sourceUrl = getFieldValue(block, '[data-chart-source-url]');
    const accessibilitySummary = getFieldValue(block, '[data-chart-accessibility-summary]');

    return {
      title,
      caption,
      chartType,
      unit,
      ...(datasets.length > 0 ? {labels, datasets} : {chartPoints}),
      ...(xAxisTitle ? {xAxisTitle} : {}),
      ...(yAxisTitle ? {yAxisTitle} : {}),
      ...(yMax !== undefined ? {yMax} : {}),
      ...(valueSuffix ? {valueSuffix} : {}),
      ...(decimals !== undefined ? {decimals} : {}),
      ...(showLegend !== undefined ? {showLegend} : {}),
      ...(sourceLabel ? {sourceLabel} : {}),
      ...(sourceUrl ? {sourceUrl} : {}),
      ...(accessibilitySummary ? {accessibilitySummary} : {}),
    };
  }

  validate(data: ChartBlockData): boolean {
    const normalized = normalizeChartData(data);
    return normalized.chartPoints.length > 0
      || (normalized.labels.length > 0 && normalized.datasets.length > 0);
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

function createChartJsPanel(data: NormalizedChartBlockData, readOnly: boolean): HTMLElement {
  const panel = document.createElement('section');
  panel.setAttribute('aria-label', 'Chart.js dataset configuration');
  panel.style.cssText = 'margin-top:12px;border:1px solid #bae6fd;background:#f8fafc;padding:12px';

  const heading = document.createElement('p');
  heading.textContent = 'Chart.js datasets';
  heading.style.cssText = 'margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#075985';

  const helpText = document.createElement('p');
  helpText.textContent = 'Use labels plus one or more datasets for grouped bars or multiple lines. Leave this blank to use the simple point editor above.';
  helpText.style.cssText = 'margin:0 0 10px;font-size:12px;line-height:1.45;color:#0c4a6e';

  const configuration = createTextArea(
    'Labels and datasets JSON',
    '{\n  "labels": ["Q1", "Q2"],\n  "datasets": [{"label": "Series", "data": [10, 12]}]\n}',
    data.datasets.length > 0
      ? JSON.stringify({labels: data.labels, datasets: data.datasets}, null, 2)
      : '',
    readOnly,
    9
  );
  setFieldDataset(configuration, 'chartJsConfiguration');

  const axes = document.createElement('div');
  axes.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:10px';

  const xAxisTitle = createInput('X-axis title', 'Billboard year-end era', data.xAxisTitle, readOnly);
  setFieldDataset(xAxisTitle, 'chartXAxisTitle');
  const yAxisTitle = createInput('Y-axis title', 'Share of titles', data.yAxisTitle, readOnly);
  setFieldDataset(yAxisTitle, 'chartYAxisTitle');
  const yMax = createNumberInput('Y-axis maximum', '30', data.yMax, readOnly);
  setFieldDataset(yMax, 'chartYMax');
  const valueSuffix = createInput('Value suffix', '%', data.valueSuffix, readOnly);
  setFieldDataset(valueSuffix, 'chartValueSuffix');
  const decimals = createNumberInput('Decimal places', '1', data.decimals, readOnly, 0, 6);
  setFieldDataset(decimals, 'chartDecimals');
  const showLegend = createCheckbox('Show dataset legend', data.showLegend ?? data.datasets.length > 1, readOnly);
  showLegend.querySelector<HTMLInputElement>('input')!.dataset['chartShowLegend'] = 'true';
  axes.append(xAxisTitle, yAxisTitle, yMax, valueSuffix, decimals, showLegend);

  const sourceFields = document.createElement('div');
  sourceFields.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:10px';
  const sourceLabel = createInput('Source label', 'Billboard analysis', data.sourceLabel, readOnly);
  setFieldDataset(sourceLabel, 'chartSourceLabel');
  const sourceUrl = createInput('Source URL', 'https://example.com/data', data.sourceUrl, readOnly);
  setFieldDataset(sourceUrl, 'chartSourceUrl');
  sourceFields.append(sourceLabel, sourceUrl);

  const accessibilitySummary = createTextArea(
    'Accessibility summary',
    'Summarize the main comparison and trend for readers who cannot see the chart.',
    data.accessibilitySummary,
    readOnly,
    2
  );
  setFieldDataset(accessibilitySummary, 'chartAccessibilitySummary');
  accessibilitySummary.style.marginTop = '10px';

  panel.append(heading, helpText, configuration, axes, sourceFields, accessibilitySummary);

  return panel;
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

function createNumberInput(
  labelText: string,
  placeholder: string,
  value: number | undefined,
  readOnly: boolean,
  min?: number,
  max?: number
): HTMLLabelElement {
  const label = createInput(labelText, placeholder, value === undefined ? '' : String(value), readOnly);
  const input = label.querySelector<HTMLInputElement>('input');

  if (input) {
    input.type = 'number';
    input.step = 'any';

    if (min !== undefined) {
      input.min = String(min);
    }

    if (max !== undefined) {
      input.max = String(max);
    }
  }

  return label;
}

function createCheckbox(labelText: string, checked: boolean, readOnly: boolean): HTMLLabelElement {
  const label = document.createElement('label');
  label.style.cssText = 'display:flex;min-height:41px;align-items:center;gap:8px;border:1px solid #d4d4d8;background:#fff;padding:9px 10px;font-size:13px;color:#3f3f46';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.disabled = readOnly;

  const text = document.createElement('span');
  text.textContent = labelText;
  label.append(input, text);

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

function getOptionalNumberFieldValue(root: ParentNode, selector: string): number | undefined {
  const value = getFieldValue(root, selector);

  if (!value) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
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

function normalizeChartData(data: ChartBlockData | undefined): NormalizedChartBlockData {
  const chartPoints = Array.isArray(data?.chartPoints)
    ? data.chartPoints
      .map((point, index) => ({
        label: typeof point.label === 'string' && point.label.trim() ? point.label.trim() : `Point ${index + 1}`,
        value: typeof point.value === 'number' && Number.isFinite(point.value) ? point.value : Number.NaN,
        note: typeof point.note === 'string' ? point.note.trim() : '',
      }))
      .filter(point => Number.isFinite(point.value))
    : [];
  const datasets = normalizeChartDatasets(data?.datasets);
  const longestDataset = Math.max(0, ...datasets.map(dataset => dataset.data.length));
  const labels = Array.isArray(data?.labels)
    ? data.labels.map((label, index) => normalizeText(label) || `Label ${index + 1}`)
    : Array.from({length: longestDataset}, (_, index) => `Label ${index + 1}`);

  return {
    title: typeof data?.title === 'string' ? data.title : '',
    caption: typeof data?.caption === 'string' ? data.caption : '',
    chartType: toChartType(data?.chartType),
    unit: typeof data?.unit === 'string' ? data.unit : '',
    chartPoints,
    labels,
    datasets,
    xAxisTitle: normalizeText(data?.xAxisTitle),
    yAxisTitle: normalizeText(data?.yAxisTitle),
    yMax: toFiniteNumber(data?.yMax),
    valueSuffix: typeof data?.valueSuffix === 'string' ? data.valueSuffix : '',
    decimals: clampDecimals(data?.decimals),
    showLegend: typeof data?.showLegend === 'boolean' ? data.showLegend : undefined,
    sourceLabel: normalizeText(data?.sourceLabel),
    sourceUrl: normalizeText(data?.sourceUrl),
    accessibilitySummary: normalizeText(data?.accessibilitySummary),
  };
}

function parseChartJsConfiguration(
  value: string
): Pick<NormalizedChartBlockData, 'labels' | 'datasets'> | null {
  if (!value) {
    return {labels: [], datasets: []};
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const normalized = normalizeChartData({
      labels: Array.isArray(record['labels']) ? record['labels'].map(label => String(label)) : [],
      datasets: Array.isArray(record['datasets']) ? record['datasets'] as readonly BlogChartDataset[] : [],
    });

    return normalized.datasets.length > 0
      ? {labels: normalized.labels, datasets: normalized.datasets}
      : null;
  } catch {
    return null;
  }
}

function normalizeChartDatasets(value: readonly BlogChartDataset[] | undefined): readonly BlogChartDataset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((dataset, index) => {
    if (typeof dataset !== 'object' || dataset === null || !Array.isArray(dataset.data)) {
      return [];
    }

    const values: readonly (number | null)[] = dataset.data
      .map((item: unknown) => toFiniteNumber(item) ?? null);

    if (!values.some((item: number | null) => item !== null)) {
      return [];
    }

    const borderColor = normalizeText(dataset.borderColor);
    const backgroundColor = normalizeText(dataset.backgroundColor);

    return [{
      label: normalizeText(dataset.label) || `Series ${index + 1}`,
      data: values,
      ...(borderColor ? {borderColor} : {}),
      ...(backgroundColor ? {backgroundColor} : {}),
    }];
  });
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function clampDecimals(value: unknown): number | undefined {
  const number = toFiniteNumber(value);
  return number === undefined ? undefined : Math.max(0, Math.min(6, Math.round(number)));
}

function toChartType(value: unknown): BlogChartType {
  return typeof value === 'string' && (BLOG_CHART_TYPES as readonly string[]).includes(value) ? value as BlogChartType : 'bar';
}
