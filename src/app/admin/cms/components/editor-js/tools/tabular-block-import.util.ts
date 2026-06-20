import {BlogChartPoint, BlogStatItem} from '../../../../../features/blog/models/blog-post.model';

type ImportFormat = 'CSV' | 'JSON';
type ParsedRow = Record<string, string>;

interface ParsedImportRows {
  format: ImportFormat;
  rows: readonly ParsedRow[];
}

export interface TabularImportResult<T> {
  items: readonly T[];
  message: string;
}

const statsLabelAliases = ['label', 'name', 'metric', 'stat', 'spec', 'feature'];
const statsValueAliases = ['value', 'figure', 'amount', 'measurement', 'result'];
const statsCaptionAliases = ['caption', 'note', 'notes', 'description', 'detail', 'details'];
const chartLabelAliases = ['label', 'name', 'x', 'category', 'trim', 'model'];
const chartValueAliases = ['value', 'y', 'amount', 'score', 'number', 'metric'];
const chartNoteAliases = ['note', 'notes', 'caption', 'description', 'detail', 'details'];
const statsHeaderKeys = new Set([
  ...statsLabelAliases,
  ...statsValueAliases,
  ...statsCaptionAliases,
].map(normalizeColumnKey));
const chartHeaderKeys = new Set([
  ...chartLabelAliases,
  ...chartValueAliases,
  ...chartNoteAliases,
].map(normalizeColumnKey));

export const STATS_IMPORT_EXAMPLE_CSV = [
  'label,value,caption',
  'Horsepower,480 hp,5.0L V8',
  'Torque,415 lb-ft,Peak torque',
  'Base Price,"$43,090",MSRP',
].join('\n');

export const STATS_IMPORT_EXAMPLE_JSON = JSON.stringify({
  stats: [
    {label: 'Horsepower', value: '480 hp', caption: '5.0L V8'},
    {label: 'Torque', value: '415 lb-ft', caption: 'Peak torque'},
    {label: 'Base Price', value: '$43,090', caption: 'MSRP'},
  ],
}, null, 2);

export const CHART_IMPORT_EXAMPLE_CSV = [
  'label,value,note',
  'EcoBoost,315,Turbo four',
  'GT,480,Manual coupe',
  'Dark Horse,500,Track-focused trim',
].join('\n');

export const CHART_IMPORT_EXAMPLE_JSON = JSON.stringify({
  chartPoints: [
    {label: 'EcoBoost', value: 315, note: 'Turbo four'},
    {label: 'GT', value: 480, note: 'Manual coupe'},
    {label: 'Dark Horse', value: 500, note: 'Track-focused trim'},
  ],
}, null, 2);

export function parseStatsImport(source: string): TabularImportResult<BlogStatItem> {
  const parsed = parseImportRows(source, 'stats');
  const stats = parsed.rows
    .map(row => {
      const label = getCellValue(row, statsLabelAliases);
      const value = getCellValue(row, statsValueAliases);
      const caption = getCellValue(row, statsCaptionAliases);

      return {
        label,
        value,
        ...(caption ? {caption} : {}),
      };
    })
    .filter(item => item.label.length > 0 || item.value.length > 0);

  if (stats.length === 0) {
    throw new Error('No stat rows were found. Use label,value,caption columns or JSON with a stats array.');
  }

  return {
    items: stats,
    message: `Imported ${stats.length} ${stats.length === 1 ? 'stat' : 'stats'} from ${parsed.format}.`,
  };
}

export function parseChartImport(source: string): TabularImportResult<BlogChartPoint> {
  const parsed = parseImportRows(source, 'chart');
  const chartPoints = parsed.rows
    .map((row, index) => {
      const label = getCellValue(row, chartLabelAliases) || `Point ${index + 1}`;
      const value = parseNumericCell(getCellValue(row, chartValueAliases));
      const note = getCellValue(row, chartNoteAliases);

      return {
        label,
        value,
        ...(note ? {note} : {}),
      };
    })
    .filter(point => Number.isFinite(point.value));

  if (chartPoints.length === 0) {
    throw new Error('No numeric chart values were found. Use label,value,note columns or JSON with chartPoints/points.');
  }

  return {
    items: chartPoints,
    message: `Imported ${chartPoints.length} chart ${chartPoints.length === 1 ? 'point' : 'points'} from ${parsed.format}.`,
  };
}

export function readTextImportFile(file: File): Promise<string> {
  return file.text();
}

export function downloadTextImportExample(fileName: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], {type: mimeType});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function parseImportRows(source: string, kind: 'stats' | 'chart'): ParsedImportRows {
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    throw new Error('Paste rows or choose a CSV/JSON file before importing.');
  }

  if (looksLikeJson(trimmedSource)) {
    return {
      format: 'JSON',
      rows: parseJsonRows(trimmedSource, kind),
    };
  }

  return {
    format: 'CSV',
    rows: parseCsvImportRows(trimmedSource, kind),
  };
}

function looksLikeJson(source: string): boolean {
  return source.startsWith('{') || source.startsWith('[');
}

function parseJsonRows(source: string, kind: 'stats' | 'chart'): readonly ParsedRow[] {
  let value: unknown;

  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('The pasted JSON could not be parsed.');
  }

  const collection = getJsonCollection(value, kind);

  if (!collection) {
    throw new Error(kind === 'stats'
      ? 'JSON imports need an array or an object with stats, rows, items, or data.'
      : 'JSON imports need an array or an object with chartPoints, points, rows, items, or data.');
  }

  return collection
    .map(item => normalizeJsonItem(item, kind))
    .filter((row): row is ParsedRow => Boolean(row));
}

function getJsonCollection(value: unknown, kind: 'stats' | 'chart'): readonly unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  const keys = kind === 'stats'
    ? ['stats', 'rows', 'items', 'data']
    : ['chartPoints', 'points', 'rows', 'items', 'data'];

  for (const key of keys) {
    const candidate = value[key];

    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  const data = value['data'];

  if (!isRecord(data)) {
    return null;
  }

  for (const key of keys) {
    const candidate = data[key];

    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return null;
}

function normalizeJsonItem(item: unknown, kind: 'stats' | 'chart'): ParsedRow | null {
  if (Array.isArray(item)) {
    const keys = kind === 'stats'
      ? ['label', 'value', 'caption']
      : ['label', 'value', 'note'];

    return keys.reduce<ParsedRow>((row, key, index) => ({
      ...row,
      [key]: stringifyCell(item[index]),
    }), {});
  }

  if (!isRecord(item)) {
    return null;
  }

  return Object.entries(item).reduce<ParsedRow>((row, [key, value]) => ({
    ...row,
    [normalizeColumnKey(key)]: stringifyCell(value),
  }), {});
}

function parseCsvImportRows(source: string, kind: 'stats' | 'chart'): readonly ParsedRow[] {
  const rows = parseCsvRows(source)
    .map(row => row.map(cell => cell.trim()))
    .filter(row => row.some(cell => cell.length > 0));

  if (rows.length === 0) {
    return [];
  }

  const firstRow = rows[0] ?? [];
  const headerKeys = kind === 'stats' ? statsHeaderKeys : chartHeaderKeys;
  const hasHeader = firstRow
    .map(normalizeColumnKey)
    .some(key => headerKeys.has(key));

  if (hasHeader) {
    const header = firstRow.map((key, index) => normalizeColumnKey(key) || `column${index + 1}`);

    return rows.slice(1).map(row => header.reduce<ParsedRow>((record, key, index) => ({
      ...record,
      [key]: row[index] ?? '',
    }), {}));
  }

  const keys = kind === 'stats'
    ? ['label', 'value', 'caption']
    : ['label', 'value', 'note'];

  return rows.map(row => keys.reduce<ParsedRow>((record, key, index) => ({
    ...record,
    [key]: row[index] ?? '',
  }), {}));
}

function parseCsvRows(source: string): readonly string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

function getCellValue(row: ParsedRow, aliases: readonly string[]): string {
  for (const alias of aliases) {
    const value = row[normalizeColumnKey(alias)]?.trim();

    if (value) {
      return value;
    }
  }

  return '';
}

function parseNumericCell(value: string): number {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return Number.NaN;
  }

  const normalizedValue = trimmedValue.replace(/,/g, '');

  if (/^[+-]?(?:\d+|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(normalizedValue)) {
    return Number(normalizedValue);
  }

  const firstNumber = trimmedValue.match(/[+-]?\d[\d,]*(?:\.\d+)?/);

  return firstNumber ? Number(firstNumber[0].replace(/,/g, '')) : Number.NaN;
}

function normalizeColumnKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function stringifyCell(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
