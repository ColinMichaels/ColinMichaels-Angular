import {Type} from '@angular/core';
import type {IconProp} from '@fortawesome/fontawesome-svg-core';
import type {FinderFileDescriptor, FinderFileOpenResult} from '@core-os/filesystem/file-opener';

export interface AppMetadata {
  version?: string;
  author?: string;
  license?: string;
  website?: string;
}

export interface AppWindowSize {
  width?: number;
  height?: number;
}

export interface AppIcon {
  class?: string;
  svgPath: IconProp;
}

export interface AppFileAssociations {
  extensions?: readonly string[];
  mimeTypes?: readonly string[];
  fileTypes?: readonly string[];
}

export type ApplicationFileDescriptor = FinderFileDescriptor;

export interface ApplicationFileOpenParams {
  source: 'finder';
  content: {kind: 'metadata-only'};
  file: ApplicationFileDescriptor;
}

export type ApplicationFileOpenResult = FinderFileOpenResult;

export function isApplicationFileOpenParams(value: unknown): value is ApplicationFileOpenParams {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<ApplicationFileOpenParams>;
  const file = candidate.file as Partial<ApplicationFileDescriptor> | undefined;
  return candidate.source === 'finder'
    && candidate.content?.kind === 'metadata-only'
    && !!file
    && typeof file.id === 'string'
    && typeof file.name === 'string'
    && typeof file.virtualPath === 'string'
    && typeof file.type === 'string'
    && (file.mimeType === undefined || typeof file.mimeType === 'string')
    && (file.size === undefined || (Number.isSafeInteger(file.size) && file.size >= 0));
}

export type ApplicationKind = 'system' | 'other' | 'app';

export interface AppEntry {
  id: string;
  title: string;
  description?: string;
  component: Type<unknown>;
  maxInstances: number;
  instanceIndex: number;
  type: ApplicationKind;
  icon?: AppIcon;
  memory: number;
  metadata?: AppMetadata;
  status?: 'development' | 'stable' | 'deprecated' | 'obsolete';
  autofit?: boolean;
  windowSize?: AppWindowSize;
  installed: boolean;
  running?: boolean;
  minimized?: boolean;
  focused?: boolean;
  params?: unknown;
  fileAssociations?: AppFileAssociations;
}

export interface ApplicationInstance extends AppEntry {
  autofit: boolean;
  minimized: boolean;
  parent: AppEntry | null;
  offsetX?: number;
  offsetY?: number;
}

export enum AppType {
  system = 'system',
  app = 'app',
  other = 'other'
}

export enum APP_ID {
  cli = 'cli',
  finder = 'finder',
  about = 'about',
  player_config = 'player-config',
  music_piano = 'music-piano',
  music_patch_editor = 'music-patch-editor',
  activity_monitor = 'activity-monitor',
  system_settings = 'system-settings',
  markdown_reader = 'markdown-reader',
  music_player = 'music-player',
  tailwind_preview = 'tailwind-preview',
  tasks_app = 'tasks',
  tooltip_example = 'tooltip-example',
  space_x_app = 'space-x-app',
  icon_playground = 'icon-playground',
  weather_app = 'weather-app',
  messages_app = 'messages-app',
  chat_bot = 'chat-bot',
}

export const WINDOW_WIDTH_MIN = 480;
export const WINDOW_WIDTH_MAX = 1024;
export const WINDOW_HEIGHT_MIN = 480;
export const WINDOW_HEIGHT_MAX = 1024;
export const DEFAULT_WINDOW_OFFSET_Y = 40;
export const DEFAULT_WINDOW_OFFSET_X = 40;
