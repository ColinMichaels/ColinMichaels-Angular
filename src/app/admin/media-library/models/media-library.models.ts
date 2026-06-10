export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';
export type MediaStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'archived' | 'deleted';
export type MediaViewMode = 'grid' | 'list' | 'compact';
export type MediaQuickFilter =
  'all'
  | 'recent'
  | 'favorites'
  | 'uncategorized'
  | 'processing'
  | 'failed'
  | 'archived'
  | 'untagged'
  | 'large';
export type MediaSortMode =
  | 'name-asc'
  | 'name-desc'
  | 'uploaded-desc'
  | 'uploaded-asc'
  | 'updated-desc'
  | 'updated-asc'
  | 'size-desc'
  | 'size-asc'
  | 'type-asc'
  | 'extension-asc'
  | 'width-desc'
  | 'height-desc'
  | 'aspect-ratio-desc'
  | 'rating-desc'
  | 'favorite-desc';

export type FavoriteFilter = 'all' | 'favorites' | 'not-favorites';
export type MediaOrientationFilter = 'all' | 'square' | 'portrait' | 'landscape';
export type BatchRenameCaseTransform = 'none' | 'lowercase' | 'uppercase' | 'titlecase' | 'slugify';
export type ResizeMode = 'fit' | 'fill' | 'stretch' | 'pad';
export type ResizeOutputFormat = 'same' | 'jpg' | 'png' | 'webp' | 'avif';
export type ResizeDestinationMode = 'variant' | 'new-media' | 'selected-folder';
export type ResizeOverwriteMode = 'skip' | 'replace' | 'auto-rename';

export interface MediaLibraryItem {
  id: string;
  displayName: string;
  originalFileName?: string;
  fileName?: string;
  extension?: string;
  mediaType: MediaType;
  mimeType?: string;
  storagePath?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  durationMs?: number;
  sizeBytes?: number;
  folderId?: string | null;
  folderPath?: string;
  tags: readonly string[];
  favorite: boolean;
  rating?: number | null;
  colorLabel?: string | null;
  notes?: string | null;
  altText?: string | null;
  description?: string | null;
  status: MediaStatus;
  processingError?: string | null;
  createdAt?: string;
  updatedAt?: string;
  uploadedAt?: string;
}

export interface MediaLibraryFolder {
  id: string;
  name: string;
  parentId?: string | null;
  path: string;
  color?: string | null;
  itemCount?: number;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaLibraryFolderView extends MediaLibraryFolder {
  depth: number;
}

export interface MediaLibraryTagSummary {
  name: string;
  count: number;
}

export interface MediaFilterState {
  mediaTypes: readonly MediaType[];
  extensions: readonly string[];
  statuses: readonly MediaStatus[];
  includeTags: readonly string[];
  excludeTags: readonly string[];
  untagged: boolean;
  folderId: string | null;
  includeSubfolders: boolean;
  favorites: FavoriteFilter;
  ratingMin: number | null;
  ratingExact: number | null;
  uploadedFrom: string | null;
  uploadedTo: string | null;
  updatedFrom: string | null;
  updatedTo: string | null;
  sizeMinBytes: number | null;
  sizeMaxBytes: number | null;
  widthMin: number | null;
  widthMax: number | null;
  heightMin: number | null;
  heightMax: number | null;
  orientation: MediaOrientationFilter;
  missingDimensions: boolean;
  missingThumbnail: boolean;
}

export interface MediaFilterChip {
  id: string;
  label: string;
}

export interface MediaSearchToken {
  key: string | null;
  value: string;
}

export interface BatchRenameRequest {
  template: string;
  startIndex: number;
  paddingLength: number;
  prefix: string;
  suffix: string;
  findText: string;
  replaceText: string;
  caseTransform: BatchRenameCaseTransform;
}

export type RenamePreviewStatus =
  'OK'
  | 'Name unchanged'
  | 'Invalid name'
  | 'Duplicate name'
  | 'Missing item'
  | 'Permission denied';

export interface RenamePreviewRow {
  itemId: string;
  currentName: string;
  newName: string;
  status: RenamePreviewStatus;
}

export interface ResizeMediaRequest {
  mediaIds: readonly string[];
  width: number | null;
  height: number | null;
  lockAspectRatio: boolean;
  resizeMode: ResizeMode;
  outputFormat: ResizeOutputFormat;
  quality: number;
  outputNamePattern: string;
  destinationMode: ResizeDestinationMode;
  destinationFolderId: string | null;
  overwriteMode: ResizeOverwriteMode;
}

export interface ResizeMediaResult {
  submitted: number;
  succeeded: number;
  failed: number;
  jobId?: string;
  message?: string;
}

export interface MediaUploadEvent {
  fileName: string;
  progress: number;
  status: 'uploading' | 'complete' | 'failed';
  item?: MediaLibraryItem;
  error?: string;
}

export interface MediaLibraryStats {
  total: number;
  visible: number;
  selected: number;
  processing: number;
  failed: number;
  uploading: number;
}

export interface MediaMetadataPatch {
  displayName?: string;
  folderId?: string | null;
  folderPath?: string;
  tags?: readonly string[];
  favorite?: boolean;
  rating?: number | null;
  colorLabel?: string | null;
  notes?: string | null;
  altText?: string | null;
  description?: string | null;
  status?: MediaStatus;
  processingError?: string | null;
}
