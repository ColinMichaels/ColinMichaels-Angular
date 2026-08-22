import {
  BatchRenameRequest,
  MediaFilterChip,
  MediaFilterState,
  MediaLibraryFolder,
  MediaLibraryFolderView,
  MediaLibraryItem,
  MediaLibraryTagSummary,
  MediaQuickFilter,
  MediaSearchToken,
  MediaSortMode,
  MediaType,
  RenamePreviewRow,
} from '../models/media-library.models';

const naturalCollator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
const illegalNamePattern = /[\\/:*?"<>|]/;
const largeFileThresholdBytes = 10 * 1024 * 1024;

const documentExtensions = new Set(['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'csv', 'xls', 'xlsx', 'ppt', 'pptx']);
const archiveExtensions = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz']);

export function createDefaultFilterState(): MediaFilterState {
  return {
    mediaTypes: [],
    extensions: [],
    statuses: [],
    includeTags: [],
    excludeTags: [],
    untagged: false,
    folderId: null,
    includeSubfolders: true,
    favorites: 'all',
    ratingMin: null,
    ratingExact: null,
    uploadedFrom: null,
    uploadedTo: null,
    updatedFrom: null,
    updatedTo: null,
    sizeMinBytes: null,
    sizeMaxBytes: null,
    widthMin: null,
    widthMax: null,
    heightMin: null,
    heightMax: null,
    orientation: 'all',
    missingDimensions: false,
    missingThumbnail: false,
  };
}

export function inferMediaType(mimeType?: string, fileName?: string): MediaType {
  if (mimeType?.startsWith('image/')) {
    return 'image';
  }

  if (mimeType?.startsWith('video/')) {
    return 'video';
  }

  if (mimeType?.startsWith('audio/')) {
    return 'audio';
  }

  const extension = getFileExtension(fileName ?? '').toLowerCase();

  if (documentExtensions.has(extension)) {
    return 'document';
  }

  if (archiveExtensions.has(extension)) {
    return 'archive';
  }

  if (mimeType?.includes('pdf') || mimeType?.includes('document') || mimeType?.startsWith('text/')) {
    return 'document';
  }

  if (mimeType?.includes('zip') || mimeType?.includes('archive') || mimeType?.includes('compressed')) {
    return 'archive';
  }

  return 'other';
}

export function getFileExtension(fileName: string): string {
  const cleanName = fileName.split('?')[0] ?? fileName;
  const extension = cleanName.includes('.') ? cleanName.split('.').pop() : '';

  return (extension ?? '').toLowerCase();
}

export function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || fileName;
}

export function ensureExtension(name: string, extension?: string): string {
  if (!extension) {
    return name;
  }

  return name.toLowerCase().endsWith(`.${extension.toLowerCase()}`) ? name : `${name}.${extension}`;
}

export function formatBytes(value?: number): string {
  if (!value || value <= 0) {
    return '0 KB';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex <= 1 ? 0 : 1;

  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

export function formatDate(value?: string): string {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function parseSearchTokens(search: string): readonly MediaSearchToken[] {
  return search
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
    .map(token => {
      const separatorIndex = token.indexOf(':');

      if (separatorIndex <= 0) {
        return {key: null, value: token.toLowerCase()};
      }

      return {
        key: token.slice(0, separatorIndex).toLowerCase(),
        value: token.slice(separatorIndex + 1).toLowerCase(),
      };
    });
}

export function filterMediaItems(
  items: readonly MediaLibraryItem[],
  search: string,
  filters: MediaFilterState,
  quickFilter: MediaQuickFilter,
  selectedFolderId: string | null,
  activeType: MediaType | null,
  activeTag: string | null
): readonly MediaLibraryItem[] {
  const tokens = parseSearchTokens(search);

  return items.filter(item => {
    if (!matchesQuickFilter(item, quickFilter)) {
      return false;
    }

    if (activeType && item.mediaType !== activeType) {
      return false;
    }

    if (activeTag && !item.tags.includes(activeTag)) {
      return false;
    }

    if (selectedFolderId && !matchesFolder(item, selectedFolderId, filters.includeSubfolders)) {
      return false;
    }

    if (!matchesFilterState(item, filters)) {
      return false;
    }

    if (!matchesSearchTokens(item, tokens)) {
      return false;
    }

    return true;
  });
}

export function sortMediaItems(items: readonly MediaLibraryItem[], sortMode: MediaSortMode): readonly MediaLibraryItem[] {
  return [...items].sort((left, right) => compareMediaItems(left, right, sortMode));
}

export function createFilterChips(
  search: string,
  filters: MediaFilterState,
  quickFilter: MediaQuickFilter,
  selectedFolderId: string | null,
  activeType: MediaType | null,
  activeTag: string | null,
  folders: readonly MediaLibraryFolder[]
): readonly MediaFilterChip[] {
  const chips: MediaFilterChip[] = [];
  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    chips.push({id: 'search', label: `Search: ${trimmedSearch}`});
  }

  if (quickFilter !== 'all') {
    chips.push({id: 'quick', label: labelize(quickFilter)});
  }

  if (selectedFolderId) {
    chips.push({id: 'selected-folder', label: `Folder: ${findFolderName(folders, selectedFolderId)}`});
  }

  if (activeType) {
    chips.push({id: 'active-type', label: `Type: ${labelize(activeType)}`});
  }

  if (activeTag) {
    chips.push({id: 'active-tag', label: `Tag: ${activeTag}`});
  }

  for (const type of filters.mediaTypes) {
    chips.push({id: `type:${type}`, label: `Type: ${labelize(type)}`});
  }

  for (const extension of filters.extensions) {
    chips.push({id: `extension:${extension}`, label: `Ext: ${extension}`});
  }

  for (const status of filters.statuses) {
    chips.push({id: `status:${status}`, label: `Status: ${labelize(status)}`});
  }

  for (const tag of filters.includeTags) {
    chips.push({id: `tag:${tag}`, label: `Tag: ${tag}`});
  }

  for (const tag of filters.excludeTags) {
    chips.push({id: `exclude-tag:${tag}`, label: `Exclude tag: ${tag}`});
  }

  if (filters.untagged) {
    chips.push({id: 'untagged', label: 'Untagged'});
  }

  if (filters.folderId) {
    chips.push({id: 'folder', label: `Folder: ${findFolderName(folders, filters.folderId)}`});
  }

  if (filters.favorites !== 'all') {
    chips.push({id: 'favorites', label: filters.favorites === 'favorites' ? 'Favorites' : 'Not favorites'});
  }

  if (filters.ratingMin !== null) {
    chips.push({id: 'rating-min', label: `Rating >= ${filters.ratingMin}`});
  }

  if (filters.ratingExact !== null) {
    chips.push({id: 'rating-exact', label: `Rating ${filters.ratingExact}`});
  }

  if (filters.uploadedFrom || filters.uploadedTo) {
    chips.push({id: 'uploaded-date', label: 'Upload date'});
  }

  if (filters.updatedFrom || filters.updatedTo) {
    chips.push({id: 'updated-date', label: 'Updated date'});
  }

  if (filters.sizeMinBytes !== null || filters.sizeMaxBytes !== null) {
    chips.push({id: 'size', label: 'File size'});
  }

  if (filters.widthMin !== null || filters.widthMax !== null || filters.heightMin !== null || filters.heightMax !== null) {
    chips.push({id: 'dimensions', label: 'Dimensions'});
  }

  if (filters.orientation !== 'all') {
    chips.push({id: 'orientation', label: labelize(filters.orientation)});
  }

  if (filters.missingDimensions) {
    chips.push({id: 'missing-dimensions', label: 'Missing dimensions'});
  }

  if (filters.missingThumbnail) {
    chips.push({id: 'missing-thumbnail', label: 'Missing thumbnail'});
  }

  return chips;
}

export function summarizeTags(items: readonly MediaLibraryItem[]): readonly MediaLibraryTagSummary[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({name, count}))
    .sort((left, right) => right.count - left.count || naturalCollator.compare(left.name, right.name));
}

export function getExtensions(items: readonly MediaLibraryItem[]): readonly string[] {
  return [...new Set(items.map(item => item.extension).filter((extension): extension is string => Boolean(extension)))]
    .sort(naturalCollator.compare);
}

export function flattenFolders(folders: readonly MediaLibraryFolder[], itemCounts: ReadonlyMap<string, number>): readonly MediaLibraryFolderView[] {
  const activeFolders = folders.filter(folder => !folder.archived);
  const childrenByParent = new Map<string | null, MediaLibraryFolder[]>();

  for (const folder of activeFolders) {
    const parentId = folder.parentId ?? null;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(folder);
    childrenByParent.set(parentId, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort((left, right) => naturalCollator.compare(left.name, right.name));
  }

  const flattened: MediaLibraryFolderView[] = [];
  const visit = (parentId: string | null, depth: number): void => {
    for (const folder of childrenByParent.get(parentId) ?? []) {
      flattened.push({
        ...folder,
        depth,
        itemCount: itemCounts.get(folder.id) ?? folder.itemCount ?? 0,
      });
      visit(folder.id, depth + 1);
    }
  };

  visit(null, 0);

  return flattened;
}

export function getFolderItemCounts(items: readonly MediaLibraryItem[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (item.folderId) {
      counts.set(item.folderId, (counts.get(item.folderId) ?? 0) + 1);
    }
  }

  return counts;
}

export function buildRenamePreviewRows(
  selectedItems: readonly MediaLibraryItem[],
  allItems: readonly MediaLibraryItem[],
  request: BatchRenameRequest
): readonly RenamePreviewRow[] {
  const existingNames = new Map<string, string>();

  for (const item of allItems) {
    existingNames.set(item.id, normalizeText(item.displayName));
  }

  const generatedNames = new Map<string, number>();
  const rows = selectedItems.map((item, itemIndex) => {
    const newName = createRenamedDisplayName(item, request, itemIndex);
    const normalizedNewName = normalizeText(newName);
    generatedNames.set(normalizedNewName, (generatedNames.get(normalizedNewName) ?? 0) + 1);

    return {
      itemId: item.id,
      currentName: item.displayName,
      newName,
      status: 'OK' as const,
    };
  });

  return rows.map(row => {
    const itemExists = selectedItems.some(item => item.id === row.itemId);

    if (!itemExists) {
      return {...row, status: 'Missing item'};
    }

    if (!isValidDisplayName(row.newName)) {
      return {...row, status: 'Invalid name'};
    }

    if (normalizeText(row.currentName) === normalizeText(row.newName)) {
      return {...row, status: 'Name unchanged'};
    }

    const normalizedNewName = normalizeText(row.newName);
    const duplicateGenerated = (generatedNames.get(normalizedNewName) ?? 0) > 1;
    const duplicateExisting = [...existingNames.entries()]
      .some(([itemId, existingName]) => itemId !== row.itemId && existingName === normalizedNewName);

    if (duplicateGenerated || duplicateExisting) {
      return {...row, status: 'Duplicate name'};
    }

    return row;
  });
}

export function isValidDisplayName(value: string): boolean {
  const trimmed = value.trim();

  return trimmed.length > 0 && trimmed.length <= 180 && !illegalNamePattern.test(trimmed);
}

export function titleCase(value: string): string {
  return value.replace(/\w\S*/g, word => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`);
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'media';
}

export function labelize(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function coerceDateString(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && 'toDate' in value) {
    const maybeTimestamp = value as { toDate: () => Date };

    return maybeTimestamp.toDate().toISOString();
  }

  return undefined;
}

export function createSafePathSegment(value: string): string {
  return slugify(value).slice(0, 90) || 'media';
}

function createRenamedDisplayName(item: MediaLibraryItem, request: BatchRenameRequest, itemIndex: number): string {
  const extension = item.extension ?? getFileExtension(item.displayName);
  const baseName = stripFileExtension(item.displayName);
  const index = request.startIndex + itemIndex;
  const paddedIndex = String(index).padStart(Math.max(1, request.paddingLength), '0');
  const date = new Date().toISOString().slice(0, 10);
  const variables = new Map<string, string>([
    ['name', baseName],
    ['ext', extension],
    ['index', paddedIndex],
    ['date', date],
    ['uploaded', item.uploadedAt ? item.uploadedAt.slice(0, 10) : date],
    ['updated', item.updatedAt ? item.updatedAt.slice(0, 10) : date],
    ['width', item.width ? String(item.width) : ''],
    ['height', item.height ? String(item.height) : ''],
    ['folder', item.folderPath ? createSafePathSegment(item.folderPath.split('/').pop() ?? item.folderPath) : 'library'],
    ['rating', item.rating !== null && item.rating !== undefined ? String(item.rating) : ''],
  ]);

  let nextName = request.template.trim() || '{name}';
  nextName = nextName.replace(/\{([a-z]+)\}/gi, (_match, key: string) => variables.get(key.toLowerCase()) ?? '');

  if (request.findText) {
    nextName = nextName.split(request.findText).join(request.replaceText);
  }

  nextName = `${request.prefix}${nextName}${request.suffix}`.trim();

  switch (request.caseTransform) {
    case 'lowercase':
      nextName = nextName.toLowerCase();
      break;
    case 'uppercase':
      nextName = nextName.toUpperCase();
      break;
    case 'titlecase':
      nextName = titleCase(nextName);
      break;
    case 'slugify':
      nextName = slugify(nextName);
      break;
    case 'none':
      break;
  }

  return ensureExtension(nextName, extension);
}

function matchesQuickFilter(item: MediaLibraryItem, quickFilter: MediaQuickFilter): boolean {
  const now = Date.now();
  const uploadedTime = item.uploadedAt ? new Date(item.uploadedAt).getTime() : 0;
  const recentCutoff = now - 1000 * 60 * 60 * 24 * 14;

  switch (quickFilter) {
    case 'all':
      return item.status !== 'deleted';
    case 'recent':
      return item.status !== 'deleted' && uploadedTime >= recentCutoff;
    case 'favorites':
      return item.status !== 'deleted' && item.favorite;
    case 'uncategorized':
      return item.status !== 'deleted' && !item.folderId;
    case 'processing':
      return item.status === 'uploading' || item.status === 'processing';
    case 'failed':
      return item.status === 'failed';
    case 'archived':
      return item.status === 'archived';
    case 'deleted':
      return item.status === 'deleted';
    case 'untagged':
      return item.status !== 'deleted' && item.tags.length === 0;
    case 'large':
      return item.status !== 'deleted' && (item.sizeBytes ?? 0) >= largeFileThresholdBytes;
  }
}

function matchesFilterState(item: MediaLibraryItem, filters: MediaFilterState): boolean {
  if (filters.mediaTypes.length > 0 && !filters.mediaTypes.includes(item.mediaType)) {
    return false;
  }

  if (filters.extensions.length > 0 && (!item.extension || !filters.extensions.includes(item.extension))) {
    return false;
  }

  if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) {
    return false;
  }

  if (filters.includeTags.length > 0 && !filters.includeTags.every(tag => item.tags.includes(tag))) {
    return false;
  }

  if (filters.excludeTags.length > 0 && filters.excludeTags.some(tag => item.tags.includes(tag))) {
    return false;
  }

  if (filters.untagged && item.tags.length > 0) {
    return false;
  }

  if (filters.folderId && !matchesFolder(item, filters.folderId, filters.includeSubfolders)) {
    return false;
  }

  if (filters.favorites === 'favorites' && !item.favorite) {
    return false;
  }

  if (filters.favorites === 'not-favorites' && item.favorite) {
    return false;
  }

  const rating = item.rating ?? 0;

  if (filters.ratingMin !== null && rating < filters.ratingMin) {
    return false;
  }

  if (filters.ratingExact !== null && rating !== filters.ratingExact) {
    return false;
  }

  if (!matchesDateRange(item.uploadedAt, filters.uploadedFrom, filters.uploadedTo)) {
    return false;
  }

  if (!matchesDateRange(item.updatedAt, filters.updatedFrom, filters.updatedTo)) {
    return false;
  }

  const size = item.sizeBytes ?? 0;

  if (filters.sizeMinBytes !== null && size < filters.sizeMinBytes) {
    return false;
  }

  if (filters.sizeMaxBytes !== null && size > filters.sizeMaxBytes) {
    return false;
  }

  if (!matchesNumberRange(item.width, filters.widthMin, filters.widthMax)) {
    return false;
  }

  if (!matchesNumberRange(item.height, filters.heightMin, filters.heightMax)) {
    return false;
  }

  if (!matchesOrientation(item, filters.orientation)) {
    return false;
  }

  if (filters.missingDimensions && item.width && item.height) {
    return false;
  }

  if (filters.missingThumbnail && item.thumbnailUrl) {
    return false;
  }

  return true;
}

function matchesSearchTokens(item: MediaLibraryItem, tokens: readonly MediaSearchToken[]): boolean {
  if (tokens.length === 0) {
    return true;
  }

  return tokens.every(token => matchesSearchToken(item, token));
}

function matchesSearchToken(item: MediaLibraryItem, token: MediaSearchToken): boolean {
  const value = token.value;

  switch (token.key) {
    case 'tag':
      return item.tags.some(tag => tag.toLowerCase().includes(value));
    case 'type':
      return item.mediaType.includes(value);
    case 'ext':
      return (item.extension ?? '').includes(value);
    case 'favorite':
      return String(item.favorite) === value;
    case 'status':
      return item.status.includes(value);
    case 'folder':
      return normalizeText(item.folderPath).includes(value);
    case 'width':
      return item.width !== undefined && String(item.width) === value;
    case 'height':
      return item.height !== undefined && String(item.height) === value;
    case null:
      return [
        item.displayName,
        item.originalFileName,
        item.fileName,
        item.extension,
        item.mediaType,
        item.mimeType,
        item.folderPath,
        item.notes,
        item.altText,
        item.description,
        ...item.tags,
      ].some(field => normalizeText(field).includes(value));
    default:
      return [item.displayName, item.originalFileName, item.fileName].some(field => normalizeText(field).includes(value));
  }
}

function matchesFolder(item: MediaLibraryItem, folderId: string, includeSubfolders: boolean): boolean {
  if (item.folderId === folderId) {
    return true;
  }

  if (!includeSubfolders || !item.folderPath) {
    return false;
  }

  return item.folderPath.split('/').includes(folderId);
}

function matchesDateRange(value: string | undefined, from: string | null, to: string | null): boolean {
  if (!from && !to) {
    return true;
  }

  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return false;
  }

  if (from && time < new Date(from).getTime()) {
    return false;
  }

  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    if (time > toDate.getTime()) {
      return false;
    }
  }

  return true;
}

function matchesNumberRange(value: number | undefined, min: number | null, max: number | null): boolean {
  if (min === null && max === null) {
    return true;
  }

  if (value === undefined || value === null) {
    return false;
  }

  if (min !== null && value < min) {
    return false;
  }

  if (max !== null && value > max) {
    return false;
  }

  return true;
}

function matchesOrientation(item: MediaLibraryItem, orientation: string): boolean {
  if (orientation === 'all') {
    return true;
  }

  if (!item.width || !item.height) {
    return false;
  }

  switch (orientation) {
    case 'square':
      return Math.abs(item.width - item.height) <= 2;
    case 'portrait':
      return item.height > item.width;
    case 'landscape':
      return item.width > item.height;
    default:
      return true;
  }
}

function compareMediaItems(left: MediaLibraryItem, right: MediaLibraryItem, sortMode: MediaSortMode): number {
  switch (sortMode) {
    case 'name-asc':
      return naturalCollator.compare(left.displayName, right.displayName);
    case 'name-desc':
      return naturalCollator.compare(right.displayName, left.displayName);
    case 'uploaded-desc':
      return compareDates(right.uploadedAt, left.uploadedAt);
    case 'uploaded-asc':
      return compareDates(left.uploadedAt, right.uploadedAt);
    case 'updated-desc':
      return compareDates(right.updatedAt, left.updatedAt);
    case 'updated-asc':
      return compareDates(left.updatedAt, right.updatedAt);
    case 'size-desc':
      return (right.sizeBytes ?? 0) - (left.sizeBytes ?? 0);
    case 'size-asc':
      return (left.sizeBytes ?? 0) - (right.sizeBytes ?? 0);
    case 'type-asc':
      return naturalCollator.compare(left.mediaType, right.mediaType) || naturalCollator.compare(left.displayName, right.displayName);
    case 'extension-asc':
      return naturalCollator.compare(left.extension ?? '', right.extension ?? '') || naturalCollator.compare(left.displayName, right.displayName);
    case 'width-desc':
      return (right.width ?? 0) - (left.width ?? 0);
    case 'height-desc':
      return (right.height ?? 0) - (left.height ?? 0);
    case 'aspect-ratio-desc':
      return (right.aspectRatio ?? 0) - (left.aspectRatio ?? 0);
    case 'rating-desc':
      return (right.rating ?? 0) - (left.rating ?? 0);
    case 'favorite-desc':
      return Number(right.favorite) - Number(left.favorite) || naturalCollator.compare(left.displayName, right.displayName);
  }
}

function compareDates(left?: string, right?: string): number {
  return getDateTime(left) - getDateTime(right);
}

function getDateTime(value?: string): number {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function findFolderName(folders: readonly MediaLibraryFolder[], folderId: string): string {
  return folders.find(folder => folder.id === folderId)?.name ?? 'Unknown';
}
