import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
  FILE_TYPE_ICONS,
  FileExtensions,
  FileSystemService as CoreOsFileSystemService,
  FileTypes,
  SvgIcons,
  VIEW_MODES,
} from '@core-os/filesystem';
import type {
  FavoriteDirectory,
  FileEntry as CoreOsFileEntry,
  FileTypeIcon,
  TrashedFileEntry,
  VirtualFileSystemSnapshot,
} from '@core-os/filesystem';
import type {MediaItem} from './media.service';

/** @deprecated Import FileEntry from @core-os/filesystem for persistent Finder work. */
export interface FileEntry {
  name: string;
  type: string;
  path: string;
  isDir: boolean;
  created: string;
  modified: string;
  media?: MediaItem;
  children?: FileEntry[];
}

/** @deprecated Legacy favorite shape retained for callers that render its icon metadata. */
export interface LegacyFavoriteDirectory extends FavoriteDirectory {
  icon: FileTypeIcon | undefined;
}

export {FILE_TYPE_ICONS, FileExtensions, FileTypes, SvgIcons, VIEW_MODES};
export type {FavoriteDirectory, FileTypeIcon, TrashedFileEntry, VirtualFileSystemSnapshot};

/**
 * Compatibility facade for the original mock filesystem API.
 * Live Finder code uses the canonical persistent service directly.
 */
@Injectable({providedIn: 'root'})
export class FileSystemService {
  readonly currentDir$: Observable<CoreOsFileEntry>;
  readonly selectedFile$: Observable<CoreOsFileEntry | undefined>;
  readonly viewMode$: CoreOsFileSystemService['viewMode$'];

  constructor(private readonly core: CoreOsFileSystemService) {
    this.currentDir$ = core.currentDir$;
    this.selectedFile$ = core.selectedFile$;
    this.viewMode$ = core.viewMode$;
  }

  get sortBy(): 'name' | 'type' | 'modified' {
    return this.core.sortBy;
  }

  set sortBy(value: 'name' | 'type' | 'modified') {
    this.core.sortBy = value;
  }

  setViewMode(mode: VIEW_MODES): void {
    this.core.setViewMode(mode);
  }

  sortFiles(files: FileEntry[] | undefined): FileEntry[] {
    return this.core.sortFiles(files as CoreOsFileEntry[] | undefined) as unknown as FileEntry[];
  }

  getCurrentDirectory(): CoreOsFileEntry {
    return this.core.getCurrentDirectory();
  }

  getFavoriteDirs(): readonly LegacyFavoriteDirectory[] {
    const folderIcon = FILE_TYPE_ICONS.find((icon) => icon.name === FileTypes.folder);
    return this.core.getFavoriteDirs().map((favorite) => ({
      ...favorite,
      icon: folderIcon,
    }));
  }

  navigateTo(path: string): boolean {
    return this.core.navigateTo(path);
  }

  createMockFilesForFolder(folder: FileEntry, numFiles = 1): FileEntry[] {
    const files = Array.isArray(folder.children) ? folder.children : [];
    for (let index = 0; index < numFiles; index++) {
      const name = `mock-file-${index + 1}.txt`;
      files.push(this.createFile(name, `${folder.path}/${name}`));
    }
    return files;
  }

  createFile(name: string, path: string): FileEntry {
    const timestamp = new Date().toISOString();
    return {
      name,
      path: path.replace(/\/+/g, '/'),
      created: timestamp,
      modified: timestamp,
      type: FileTypes.document,
      isDir: false,
    };
  }

  createFolder(name: string, path: string, withFiles = true): FileEntry {
    if (!name || !path.trim()) {
      throw new Error('Name and path are required.');
    }
    const timestamp = new Date().toISOString();
    const folder: FileEntry = {
      name,
      path: path.replace(/\/+/g, '/'),
      created: timestamp,
      modified: timestamp,
      type: FileTypes.folder,
      isDir: true,
      children: [],
    };
    if (withFiles) {
      folder.children = this.createMockFilesForFolder(folder);
    }
    return folder;
  }

  createNestedFolders(name: string, path: string, depth = 3, withFiles = true): FileEntry {
    const folderPath = `${path.replace(/\/+$/, '')}/${name}`.replace(/\/+/g, '/');
    const folder = this.createFolder(name, folderPath, withFiles);
    if (depth > 0) {
      const childName = `${name}-child-${depth}`;
      folder.children = [
        this.createNestedFolders(childName, folderPath, depth - 1, withFiles),
        ...(folder.children ?? []),
      ];
    }
    return folder;
  }
}
