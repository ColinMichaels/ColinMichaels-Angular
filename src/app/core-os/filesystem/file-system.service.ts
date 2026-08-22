import {HttpClient} from '@angular/common/http';
import {Injectable, Optional} from '@angular/core';
import {BehaviorSubject, distinctUntilChanged, firstValueFrom, map} from 'rxjs';
import {StorageService} from '@core-os/storage';
import {AuthService} from '../../services/auth.service';

export interface FileEntry {
  id: string;
  name: string;
  type: string;
  path: string;
  isDir: boolean;
  created: string;
  modified: string;
  parentId?: string;
  tags: string[];
  size?: number;
  mimeType?: string;
  children?: FileEntry[];
}

interface LegacyFileEntry extends Partial<Omit<FileEntry, 'children'>> {
  name: string;
  path: string;
  isDir: boolean;
  children?: LegacyFileEntry[];
}

export interface TrashedFileEntry {
  entry: FileEntry;
  originalParentId: string;
  originalPath: string;
  trashedAt: string;
}

export interface VirtualFileSystemSnapshot {
  version: 1;
  revision: number;
  root: FileEntry;
  trash: TrashedFileEntry[];
  updatedAt: string;
}

export interface FavoriteDirectory {
  name: string;
  path: string;
}

export interface FileTypeIcon {
  name: string;
  type: 'custom';
  ext: string;
  label: string;
  icon: string;
}

export const FILE_TYPE_ICONS: FileTypeIcon[] = [
  {name: 'folder', type: 'custom', ext: 'folder', label: 'Folder', icon: '📁'},
  {name: 'image', type: 'custom', ext: 'image', label: 'Image', icon: '🖼️'},
  {name: 'video', type: 'custom', ext: 'video', label: 'Video', icon: '🎬'},
  {name: 'audio', type: 'custom', ext: 'audio', label: 'Audio', icon: '🎵'},
  {name: 'document', type: 'custom', ext: 'document', label: 'Document', icon: '📄'},
  {name: 'code', type: 'custom', ext: 'code', label: 'Code', icon: '💻'},
  {name: 'archive', type: 'custom', ext: 'archive', label: 'Archive', icon: '🗜️'},
  {name: 'app', type: 'custom', ext: 'app', label: 'Application', icon: '🧩'},
];

export enum FileExtensions {
  avi = 'avi',
  css = 'css',
  doc = 'doc',
  gif = 'gif',
  htm = 'htm',
  jpg = 'jpg',
  mov = 'mov',
  mp3 = 'mp3',
  pdf = 'pdf',
  png = 'png',
  ppt = 'ppt',
  rar = 'rar',
  txt = 'txt',
  xls = 'xls',
  zip = 'zip',
  svg = 'svg'
}

export enum SvgIcons {
  Calculator = 'calculator',
  Calendar = 'calendar',
  Camera = 'camera',
  Clock = 'clock',
  Gif = 'gif',
  IMessage = 'imessage',
  ITunes = 'itunes',
  Mail = 'mail',
  Notes = 'notes',
  Phone = 'phone',
  Photos = 'photos',
  Safari = 'safari',
  Weather = 'weather',
}

export enum FileTypes {
  folder = 'folder',
  image = 'image',
  video = 'video',
  audio = 'audio',
  document = 'document',
  code = 'code',
  archive = 'archive',
  system = 'system',
  app = 'app',
}

export enum VIEW_MODES {
  list = 'list',
  columns = 'columns',
  grid = 'grid'
}

export const CORE_OS_FILE_SYSTEM_STORAGE_KEY = 'core-os.virtual-file-system';
export const coreOsFileSystemStorageKeyForUser = (uid: string): string => (
  `${CORE_OS_FILE_SYSTEM_STORAGE_KEY}.user.${encodeURIComponent(uid)}`
);
const FILE_SYSTEM_VERSION = 1 as const;
const ROOT_ID = 'root';
const TRASH_ID = 'trash';
const SEED_TIMESTAMP = '2026-01-01T00:00:00.000Z';
const MAX_UNDO_DEPTH = 20;
const MAX_NAME_LENGTH = 120;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 24;
const MAX_ENTRY_COUNT = 10_000;
const MAX_TREE_DEPTH = 64;
const MAX_ID_LENGTH = 200;
const MAX_PATH_LENGTH = 4_096;
const MAX_TYPE_LENGTH = 32;
const MAX_MIME_TYPE_LENGTH = 255;
const MAX_SNAPSHOT_BYTES = 5_000_000;
const ALLOWED_FILE_TYPES = new Set<string>(Object.values(FileTypes));

const GENERATED_FILE_EXTENSIONS: string[] = [
  FileExtensions.txt,
  FileExtensions.htm,
  FileExtensions.pdf,
  FileExtensions.jpg,
  FileExtensions.mp3,
  FileExtensions.css,
  FileExtensions.zip
];

interface UndoRecord {
  label: string;
  snapshot: VirtualFileSystemSnapshot;
  locationId: string;
  selectedId?: string;
}

@Injectable({providedIn: 'root'})
export class FileSystemService {
  private snapshot = this.createEmptySnapshot();
  private locationId = ROOT_ID;
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly undoStack: UndoRecord[] = [];
  private generatedIdCounter = 0;
  private storageKey: string | null = CORE_OS_FILE_SYSTEM_STORAGE_KEY;
  private identityRevision = 0;
  private recoveryRawValue: unknown;

  private readonly currentDirSubject = new BehaviorSubject<FileEntry>(this.cloneEntry(this.snapshot.root));
  readonly currentDir$ = this.currentDirSubject.pipe(map((entry) => this.cloneEntry(entry)));

  private readonly selectedFileSubject = new BehaviorSubject<FileEntry | undefined>(undefined);
  readonly selectedFile$ = this.selectedFileSubject.pipe(
    map((entry) => entry ? this.cloneEntry(entry) : undefined)
  );

  private readonly viewModeSubject = new BehaviorSubject<VIEW_MODES>(VIEW_MODES.list);
  readonly viewMode$ = this.viewModeSubject.asObservable();

  private readonly readySubject = new BehaviorSubject(false);
  readonly ready$ = this.readySubject.asObservable();

  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  readonly error$ = this.errorSubject.asObservable();

  private readonly undoLabelSubject = new BehaviorSubject<string | null>(null);
  readonly undoLabel$ = this.undoLabelSubject.asObservable();

  private readonly recoveryAvailableSubject = new BehaviorSubject(false);
  readonly recoveryAvailable$ = this.recoveryAvailableSubject.asObservable();

  sortBy: 'name' | 'type' | 'modified' = 'name';

  private readonly favoriteDirs: FavoriteDirectory[] = [
    {name: 'Home', path: '/'},
    {name: 'Desktop', path: '/Desktop'},
    {name: 'Downloads', path: '/Downloads'},
    {name: 'Documents', path: '/Documents'},
    {name: 'Projects', path: '/Projects'},
    {name: 'Photos', path: '/Photos'},
    {name: 'Music', path: '/Music'},
    {name: 'Videos', path: '/Videos'},
    {name: 'Sites', path: '/Sites'},
    {name: 'Recents', path: '/Recents'},
    {name: 'Trash', path: TRASH_ID},
  ];

  private readonly initialization: Promise<void>;

  constructor(
    private readonly http: HttpClient,
    private readonly storage: StorageService,
    @Optional() authService: AuthService | null = null,
  ) {
    if (!authService) {
      this.initialization = this.initializeForStorageKey(CORE_OS_FILE_SYSTEM_STORAGE_KEY);
      return;
    }

    this.storageKey = null;
    this.initialization = new Promise<void>((resolve) => {
      let firstIdentity = true;
      authService.user$
        .pipe(
          map((user) => user?.uid ?? null),
          distinctUntilChanged(),
        )
        .subscribe({
          next: (uid) => {
            const identityRevision = this.suspendForIdentityChange();
            const switchIdentity = this.enqueueMutation(() => this.switchIdentity(uid, identityRevision));
            if (firstIdentity) {
              firstIdentity = false;
              void switchIdentity.then(resolve, resolve);
            }
          },
          error: (error) => {
            this.readySubject.next(false);
            this.errorSubject.next(this.describeError(error, 'Finder could not verify the signed-in account.'));
            this.clearRecoveryData();
            if (firstIdentity) {
              firstIdentity = false;
              resolve();
            }
          },
        });
    });
  }

  whenReady(): Promise<void> {
    return this.initialization.then(() => this.mutationQueue);
  }

  isReady(): boolean {
    return this.readySubject.value;
  }

  setViewMode(mode: VIEW_MODES): void {
    this.viewModeSubject.next(mode);
  }

  getCurrentDirectory(): FileEntry {
    return this.cloneEntry(this.currentDirSubject.value);
  }

  getDirectory(path: string): FileEntry | undefined {
    const normalizedPath = path.trim().toLowerCase() === TRASH_ID ? TRASH_ID : this.normalizePath(path);
    if (normalizedPath === TRASH_ID) {
      return this.cloneEntry(this.createTrashDirectory());
    }
    const directory = this.findByPath(normalizedPath, this.snapshot.root);
    return directory?.isDir ? this.cloneEntry(directory) : undefined;
  }

  getFavoriteDirs(): readonly FavoriteDirectory[] {
    return this.favoriteDirs.map((favorite) => ({...favorite}));
  }

  getSelectedEntry(): FileEntry | undefined {
    const selected = this.selectedFileSubject.value;
    return selected ? this.cloneEntry(selected) : undefined;
  }

  getUndoLabel(): string | null {
    return this.undoLabelSubject.value;
  }

  hasRecoverableData(): boolean {
    return this.recoveryAvailableSubject.value;
  }

  isTrashView(): boolean {
    return this.locationId === TRASH_ID;
  }

  selectEntry(entry?: FileEntry): void {
    this.selectedFileSubject.next(entry ? this.cloneEntry(entry) : undefined);
  }

  navigateTo(path: string): boolean {
    const normalizedPath = path.trim().toLowerCase() === TRASH_ID ? TRASH_ID : this.normalizePath(path);
    if (normalizedPath === TRASH_ID) {
      this.locationId = TRASH_ID;
      this.selectedFileSubject.next(undefined);
      this.refreshCurrentDirectory();
      return true;
    }

    const target = this.findByPath(normalizedPath, this.snapshot.root);
    if (!target?.isDir) {
      return false;
    }

    this.locationId = target.id;
    this.selectedFileSubject.next(undefined);
    this.refreshCurrentDirectory();
    return true;
  }

  navigateToId(id: string): boolean {
    if (id === TRASH_ID) {
      return this.navigateTo(TRASH_ID);
    }
    const target = this.findById(id, this.snapshot.root);
    return target?.isDir ? this.navigateTo(target.path) : false;
  }

  sortFiles(
    files: FileEntry[] | undefined,
    order: 'asc' | 'desc' = 'asc',
    criterion: 'name' | 'type' | 'modified' = this.sortBy,
  ): FileEntry[] {
    const direction = order === 'asc' ? 1 : -1;
    return [...(files ?? [])].sort((a, b) => {
      if (a.isDir !== b.isDir) {
        return a.isDir ? -1 : 1;
      }
      switch (criterion) {
        case 'name':
          return direction * a.name.localeCompare(b.name, undefined, {sensitivity: 'base'});
        case 'type':
          return direction * a.type.localeCompare(b.type, undefined, {sensitivity: 'base'});
        case 'modified':
          return direction * (new Date(a.modified).getTime() - new Date(b.modified).getTime());
      }
    });
  }

  search(query: string, withinId?: string): FileEntry[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const root = withinId ? this.findById(withinId, this.snapshot.root) : this.snapshot.root;
    if (!root) {
      return [];
    }

    const matches: FileEntry[] = [];
    this.walk(root, (entry) => {
      if (entry.id === root.id) {
        return;
      }
      const searchable = `${entry.name} ${entry.tags.join(' ')}`.toLocaleLowerCase();
      if (searchable.includes(normalizedQuery)) {
        matches.push(entry);
      }
    });
    return matches.map((entry) => this.cloneEntry(entry));
  }

  getFolderOptions(excludedEntryId?: string): FileEntry[] {
    const excludedIds = new Set<string>();
    const excluded = excludedEntryId ? this.findById(excludedEntryId, this.snapshot.root) : undefined;
    if (excluded) {
      this.walk(excluded, (entry) => excludedIds.add(entry.id));
    }

    const folders: FileEntry[] = [];
    this.walk(this.snapshot.root, (entry) => {
      if (entry.isDir && !excludedIds.has(entry.id)) {
        folders.push(entry);
      }
    });
    return folders
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((entry) => this.cloneEntry(entry));
  }

  async createFolder(parentId: string, name: string): Promise<FileEntry> {
    let createdId = '';
    await this.commit('New Folder', (next) => {
      const parent = this.requireDirectory(parentId, next.root);
      const normalizedName = this.validateName(name);
      this.assertUniqueName(parent, normalizedName);
      const timestamp = new Date().toISOString();
      const entry: FileEntry = {
        id: this.createId(),
        name: normalizedName,
        type: FileTypes.folder,
        path: this.joinPath(parent.path, normalizedName),
        isDir: true,
        created: timestamp,
        modified: timestamp,
        parentId: parent.id,
        tags: [],
        children: [],
      };
      parent.children = [...(parent.children ?? []), entry];
      parent.modified = timestamp;
      createdId = entry.id;
    });
    return this.cloneEntry(this.requireEntry(createdId, this.snapshot.root));
  }

  async renameEntry(id: string, name: string): Promise<FileEntry> {
    await this.commit('Rename', (next) => {
      const entry = this.requireMutableEntry(id, next.root);
      const parent = this.requireDirectory(entry.parentId ?? ROOT_ID, next.root);
      const normalizedName = this.validateName(name);
      this.assertUniqueName(parent, normalizedName, entry.id);
      entry.name = normalizedName;
      entry.modified = new Date().toISOString();
      this.rebuildPaths(entry, parent.path);
      parent.modified = entry.modified;
    });
    return this.cloneEntry(this.requireEntry(id, this.snapshot.root));
  }

  async moveEntry(id: string, targetParentId: string): Promise<FileEntry> {
    await this.commit('Move', (next) => {
      const entry = this.requireMutableEntry(id, next.root);
      const currentParent = this.requireDirectory(entry.parentId ?? ROOT_ID, next.root);
      const targetParent = this.requireDirectory(targetParentId, next.root);
      if (entry.id === targetParent.id || this.findById(targetParent.id, entry)) {
        throw new Error('A folder cannot be moved inside itself.');
      }
      if (currentParent.id === targetParent.id) {
        throw new Error('The item is already in that folder.');
      }
      this.assertUniqueName(targetParent, entry.name);
      this.detachEntry(entry.id, currentParent);
      entry.parentId = targetParent.id;
      entry.modified = new Date().toISOString();
      this.rebuildPaths(entry, targetParent.path);
      targetParent.children = [...(targetParent.children ?? []), entry];
      currentParent.modified = entry.modified;
      targetParent.modified = entry.modified;
    });
    return this.cloneEntry(this.requireEntry(id, this.snapshot.root));
  }

  async duplicateEntry(id: string): Promise<FileEntry> {
    let duplicateId = '';
    await this.commit('Duplicate', (next) => {
      const source = this.requireMutableEntry(id, next.root);
      const parent = this.requireDirectory(source.parentId ?? ROOT_ID, next.root);
      const duplicateName = this.nextAvailableCopyName(parent, source.name, source.isDir);
      const duplicate = this.cloneEntryWithNewIds(source, parent.id, parent.path, duplicateName);
      parent.children = [...(parent.children ?? []), duplicate];
      parent.modified = duplicate.modified;
      duplicateId = duplicate.id;
    });
    return this.cloneEntry(this.requireEntry(duplicateId, this.snapshot.root));
  }

  async moveToTrash(id: string): Promise<void> {
    await this.commit('Move to Trash', (next) => {
      const entry = this.requireMutableEntry(id, next.root);
      const parent = this.requireDirectory(entry.parentId ?? ROOT_ID, next.root);
      this.detachEntry(entry.id, parent);
      const timestamp = new Date().toISOString();
      parent.modified = timestamp;
      next.trash = [
        ...next.trash,
        {
          entry,
          originalParentId: parent.id,
          originalPath: entry.path,
          trashedAt: timestamp,
        }
      ];
    });
  }

  async restoreFromTrash(id: string): Promise<FileEntry> {
    let restoredId = '';
    await this.commit('Put Back', (next) => {
      const recordIndex = next.trash.findIndex((record) => record.entry.id === id);
      if (recordIndex < 0) {
        throw new Error('The item is no longer in Trash.');
      }
      const record = next.trash[recordIndex];
      const targetParent = this.findById(record.originalParentId, next.root) ?? next.root;
      if (!targetParent.isDir) {
        throw new Error('The restore destination is not a folder.');
      }
      const restored = record.entry;
      restored.name = this.nextAvailableRestoreName(targetParent, restored.name, restored.isDir);
      restored.parentId = targetParent.id;
      restored.modified = new Date().toISOString();
      this.rebuildPaths(restored, targetParent.path);
      targetParent.children = [...(targetParent.children ?? []), restored];
      targetParent.modified = restored.modified;
      next.trash = next.trash.filter((_, index) => index !== recordIndex);
      restoredId = restored.id;
    });
    return this.cloneEntry(this.requireEntry(restoredId, this.snapshot.root));
  }

  async deletePermanently(id: string): Promise<void> {
    await this.commit('Delete Permanently', (next) => {
      if (!next.trash.some((record) => record.entry.id === id)) {
        throw new Error('Only items in Trash can be deleted permanently.');
      }
      next.trash = next.trash.filter((record) => record.entry.id !== id);
    });
  }

  async emptyTrash(): Promise<void> {
    await this.commit('Empty Trash', (next) => {
      if (next.trash.length === 0) {
        return false;
      }
      next.trash = [];
      return true;
    });
  }

  async setTags(id: string, tags: string[]): Promise<FileEntry> {
    await this.commit('Change Tags', (next) => {
      const entry = this.findById(id, next.root)
        ?? next.trash.find((record) => record.entry.id === id)?.entry;
      if (!entry) {
        throw new Error('The selected item no longer exists.');
      }
      entry.tags = this.normalizeTags(tags);
      entry.modified = new Date().toISOString();
    });
    const updated = this.findById(id, this.snapshot.root)
      ?? this.snapshot.trash.find((record) => record.entry.id === id)?.entry;
    if (!updated) {
      throw new Error('The selected item no longer exists.');
    }
    return this.cloneEntry(updated);
  }

  async undoLastMutation(): Promise<boolean> {
    await this.initialization;
    return this.enqueueMutation(async () => {
      const identityRevision = this.identityRevision;
      const record = this.undoStack.at(-1);
      if (!record) {
        return false;
      }
      const storageKey = this.requireStorageKey();
      const restored = this.cloneSnapshot(record.snapshot);
      restored.revision = this.nextRevisionToken(this.snapshot.revision);
      restored.updatedAt = new Date().toISOString();
      this.validateSnapshot(restored);
      try {
        const persisted = await firstValueFrom(
          this.storage.compareAndSetItem(storageKey, this.snapshot.revision, restored)
        );
        if (identityRevision !== this.identityRevision) {
          return true;
        }
        if (!persisted) {
          const reloaded = await this.reloadAfterConflict(storageKey, identityRevision);
          if (!reloaded) {
            return true;
          }
          throw new Error('Finder changed in another tab. The latest saved version was loaded; try again.');
        }
        this.undoStack.pop();
        this.snapshot = restored;
        this.locationId = record.locationId;
        const restoredSelection = record.selectedId ? this.findDisplayEntry(record.selectedId) : undefined;
        this.selectedFileSubject.next(restoredSelection ? this.cloneEntry(restoredSelection) : undefined);
        this.errorSubject.next(null);
        this.undoLabelSubject.next(this.undoStack.at(-1)?.label ?? null);
        this.refreshCurrentDirectory();
        return true;
      } catch (error) {
        if (identityRevision === this.identityRevision) {
          this.errorSubject.next(this.describeError(error, 'Finder could not undo the last change.'));
          this.undoLabelSubject.next(this.undoStack.at(-1)?.label ?? null);
        }
        throw error;
      }
    });
  }

  async exportRecoveryData(): Promise<string> {
    await this.initialization;
    const identityRevision = this.identityRevision;
    if (!this.recoveryAvailableSubject.value) {
      throw new Error('Finder has no stored recovery data.');
    }
    const exported = this.serializeRecoveryData(this.recoveryRawValue);
    if (identityRevision !== this.identityRevision) {
      throw new Error('The signed-in account changed before the Finder backup completed.');
    }
    return exported;
  }

  async resetToSeed(): Promise<void> {
    await this.initialization;
    return this.enqueueMutation(async () => {
      const identityRevision = this.identityRevision;
      const storageKey = this.requireStorageKey();
      if (!this.recoveryAvailableSubject.value) {
        throw new Error('Finder has no stored data to reset.');
      }
      const seed = await firstValueFrom(this.http.get<LegacyFileEntry>('/assets/files.json'));
      if (identityRevision !== this.identityRevision) {
        return;
      }
      const next = this.importSeed(seed);
      const storedRevision = this.readStoredRevision(this.recoveryRawValue);
      const recoveryBaseRevision = storedRevision !== null && Number.isSafeInteger(storedRevision)
          && storedRevision >= 0 && storedRevision < Number.MAX_SAFE_INTEGER
        ? storedRevision
        : 0;
      next.revision = this.nextRecoveryRevisionToken(recoveryBaseRevision);
      next.updatedAt = new Date().toISOString();
      this.validateSnapshot(next);
      const persisted = await firstValueFrom(
        this.storage.compareAndSetItem(storageKey, storedRevision ?? 0, next)
      );
      if (identityRevision !== this.identityRevision) {
        return;
      }
      if (!persisted) {
        const reloaded = await this.reloadAfterConflict(storageKey, identityRevision);
        if (!reloaded) {
          return;
        }
        throw new Error('Finder changed in another tab. The latest saved version was loaded; review it before resetting.');
      }
      this.snapshot = next;
      this.locationId = ROOT_ID;
      this.undoStack.length = 0;
      this.selectedFileSubject.next(undefined);
      this.undoLabelSubject.next(null);
      this.errorSubject.next(null);
      this.clearRecoveryData();
      this.readySubject.next(true);
      this.refreshCurrentDirectory();
    });
  }

  private async switchIdentity(uid: string | null, identityRevision: number): Promise<void> {
    if (identityRevision !== this.identityRevision) {
      return;
    }
    if (!uid) {
      this.storageKey = null;
      this.errorSubject.next('Sign in to use Finder. Virtual files are stored separately for each account.');
      return;
    }
    await this.initializeForStorageKey(coreOsFileSystemStorageKeyForUser(uid), identityRevision);
  }

  private async initializeForStorageKey(
    storageKey: string,
    identityRevision = this.identityRevision,
  ): Promise<void> {
    this.storageKey = storageKey;
    let hasStoredData = false;
    let storedValue: unknown = null;
    try {
      const storedRecord = await firstValueFrom(this.storage.getRecoveryRecord<unknown>(storageKey));
      const stored = storedRecord.value;
      storedValue = stored;
      hasStoredData = storedRecord.exists;
      if (storedRecord.exists && !this.isSnapshot(stored)) {
        throw new Error('Finder found an unsupported virtual filesystem version and left it unchanged.');
      }
      let loaded: VirtualFileSystemSnapshot;
      if (storedRecord.exists && this.isSnapshot(stored)) {
        loaded = this.normalizeSnapshot(stored);
        this.validateSnapshot(loaded);
      } else {
        const seed = await firstValueFrom(this.http.get<LegacyFileEntry>('/assets/files.json'));
        loaded = this.importSeed(seed);
        this.validateSnapshot(loaded);
        if (identityRevision !== this.identityRevision) {
          return;
        }
        const persisted = await firstValueFrom(
          this.storage.compareAndSetItem(storageKey, null, loaded)
        );
        if (!persisted) {
          const winnerRecord = await firstValueFrom(this.storage.getRecoveryRecord<unknown>(storageKey));
          const winner = winnerRecord.value;
          storedValue = winner;
          hasStoredData = winnerRecord.exists;
          if (identityRevision !== this.identityRevision) {
            return;
          }
          if (!winnerRecord.exists || !this.isSnapshot(winner)) {
            throw new Error('Finder could not load the filesystem created in another tab.');
          }
          loaded = this.normalizeSnapshot(winner);
          this.validateSnapshot(loaded);
        }
      }
      if (identityRevision !== this.identityRevision) {
        return;
      }
      this.snapshot = loaded;
      this.errorSubject.next(null);
      this.clearRecoveryData();
      this.readySubject.next(true);
      this.refreshCurrentDirectory();
    } catch (error) {
      if (identityRevision !== this.identityRevision) {
        return;
      }
      this.readySubject.next(false);
      if (hasStoredData) {
        this.setRecoveryData(storedValue);
      } else {
        this.clearRecoveryData();
      }
      this.errorSubject.next(this.describeError(error, 'Finder could not load its virtual filesystem.'));
    }
  }

  private async commit(
    label: string,
    mutate: (next: VirtualFileSystemSnapshot) => boolean | void,
  ): Promise<void> {
    await this.initialization;
    if (!this.readySubject.value) {
      throw new Error(this.errorSubject.value ?? 'Finder is not ready.');
    }

    return this.enqueueMutation(async () => {
      const identityRevision = this.identityRevision;
      const storageKey = this.requireStorageKey();
      const previous = this.cloneSnapshot(this.snapshot);
      const previousLocationId = this.locationId;
      const previousSelectedId = this.selectedFileSubject.value?.id;
      const next = this.cloneSnapshot(this.snapshot);
      if (mutate(next) === false) {
        return;
      }
      next.revision = this.nextRevisionToken(previous.revision);
      next.updatedAt = new Date().toISOString();
      this.validateSnapshot(next);

      try {
        const persisted = await firstValueFrom(
          this.storage.compareAndSetItem(storageKey, previous.revision, next)
        );
        if (identityRevision !== this.identityRevision) {
          return;
        }
        if (!persisted) {
          const reloaded = await this.reloadAfterConflict(storageKey, identityRevision);
          if (!reloaded) {
            return;
          }
          throw new Error('Finder changed in another tab. The latest saved version was loaded; try again.');
        }
      } catch (error) {
        if (identityRevision === this.identityRevision) {
          this.errorSubject.next(this.describeError(error, 'Finder could not save the change.'));
        }
        throw error;
      }

      this.undoStack.push({
        label,
        snapshot: previous,
        locationId: previousLocationId,
        selectedId: previousSelectedId,
      });
      if (this.undoStack.length > MAX_UNDO_DEPTH) {
        this.undoStack.shift();
      }
      this.snapshot = next;
      this.errorSubject.next(null);
      this.undoLabelSubject.next(label);
      this.refreshCurrentDirectory();
    });
  }

  private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const pending = this.mutationQueue.then(operation, operation);
    this.mutationQueue = pending.then(() => undefined, () => undefined);
    return pending;
  }

  private importSeed(seed: LegacyFileEntry): VirtualFileSystemSnapshot {
    const root = this.importEntry(seed, undefined, ROOT_ID);
    root.id = ROOT_ID;
    root.name = '/';
    root.path = '/';
    root.isDir = true;
    root.type = FileTypes.folder;

    for (const favorite of this.favoriteDirs) {
      if (favorite.path === '/' || favorite.path === TRASH_ID || this.findByPath(favorite.path, root)) {
        continue;
      }
      const folder = this.createSeedFolder(favorite.name, favorite.path, root.id);
      folder.children = this.createFavoriteFolderChildren(folder);
      root.children = [...(root.children ?? []), folder];
    }

    return {
      version: FILE_SYSTEM_VERSION,
      revision: 0,
      root,
      trash: [],
      updatedAt: SEED_TIMESTAMP,
    };
  }

  private importEntry(entry: LegacyFileEntry, parentId?: string, forcedId?: string): FileEntry {
    const normalizedPath = this.normalizePath(entry.path);
    const imported: FileEntry = {
      id: forcedId ?? this.stableSeedId(normalizedPath),
      name: entry.name,
      path: normalizedPath,
      type: entry.isDir ? FileTypes.folder : this.inferFileType(entry.name),
      isDir: entry.isDir,
      created: entry.created ?? SEED_TIMESTAMP,
      modified: entry.modified ?? SEED_TIMESTAMP,
      tags: this.normalizeTags(entry.tags ?? []),
    };
    if (parentId !== undefined) {
      imported.parentId = parentId;
    }
    if (entry.size !== undefined) {
      imported.size = entry.size;
    }
    if (entry.mimeType !== undefined) {
      imported.mimeType = entry.mimeType;
    }
    if (entry.isDir) {
      imported.children = (entry.children ?? []).map((child) => this.importEntry(child, imported.id));
    }
    return imported;
  }

  private createSeedFolder(name: string, path: string, parentId: string): FileEntry {
    return {
      id: this.stableSeedId(path),
      name,
      path: this.normalizePath(path),
      type: FileTypes.folder,
      isDir: true,
      created: SEED_TIMESTAMP,
      modified: SEED_TIMESTAMP,
      parentId,
      tags: [],
      children: [],
    };
  }

  private createFavoriteFolderChildren(folder: FileEntry): FileEntry[] {
    const baseName = folder.name.toLowerCase();
    const hash = this.hashPath(folder.path);
    const fileCount = (hash % 3) + 2;
    const subfolderCount = (hash % 2) + 1;
    const children: FileEntry[] = [];

    for (let index = 0; index < subfolderCount; index++) {
      const name = `${baseName}-folder-${index + 1}`;
      const path = this.joinPath(folder.path, name);
      children.push(this.createSeedFolder(name, path, folder.id));
    }

    for (let index = 0; index < fileCount; index++) {
      const extension = GENERATED_FILE_EXTENSIONS[(hash + index) % GENERATED_FILE_EXTENSIONS.length];
      const name = `${baseName}-${index + 1}.${extension}`;
      const path = this.joinPath(folder.path, name);
      children.push({
        id: this.stableSeedId(path),
        name,
        path,
        type: this.inferFileType(name),
        isDir: false,
        created: SEED_TIMESTAMP,
        modified: SEED_TIMESTAMP,
        parentId: folder.id,
        tags: [],
      });
    }
    return children;
  }

  private refreshCurrentDirectory(): void {
    if (this.locationId === TRASH_ID) {
      this.currentDirSubject.next(this.cloneEntry(this.createTrashDirectory()));
      this.refreshSelection();
      return;
    }

    const current = this.findById(this.locationId, this.snapshot.root) ?? this.snapshot.root;
    this.locationId = current.id;
    this.currentDirSubject.next(this.cloneEntry(current));
    this.refreshSelection();
  }

  private createTrashDirectory(): FileEntry {
    return {
      id: TRASH_ID,
      name: 'Trash',
      path: TRASH_ID,
      type: FileTypes.folder,
      isDir: true,
      created: this.snapshot.updatedAt,
      modified: this.snapshot.updatedAt,
      tags: [],
      children: this.snapshot.trash.map((record) => record.entry),
    };
  }

  private refreshSelection(): void {
    const selectedId = this.selectedFileSubject.value?.id;
    if (!selectedId) {
      return;
    }
    const selected = this.findDisplayEntry(selectedId);
    this.selectedFileSubject.next(selected ? this.cloneEntry(selected) : undefined);
  }

  private findDisplayEntry(id: string): FileEntry | undefined {
    if (this.locationId === TRASH_ID) {
      return this.snapshot.trash.find((record) => record.entry.id === id)?.entry;
    }
    return this.findById(id, this.snapshot.root);
  }

  private findById(id: string, node: FileEntry): FileEntry | undefined {
    if (node.id === id) {
      return node;
    }
    for (const child of node.children ?? []) {
      const found = this.findById(id, child);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  private findByPath(path: string, node: FileEntry): FileEntry | undefined {
    if (node.path === path) {
      return node;
    }
    for (const child of node.children ?? []) {
      const found = this.findByPath(path, child);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  private walk(node: FileEntry, visit: (entry: FileEntry) => void): void {
    visit(node);
    for (const child of node.children ?? []) {
      this.walk(child, visit);
    }
  }

  private detachEntry(id: string, parent: FileEntry): void {
    const before = parent.children?.length ?? 0;
    parent.children = (parent.children ?? []).filter((entry) => entry.id !== id);
    if (parent.children.length === before) {
      throw new Error('The selected item is no longer in its folder.');
    }
  }

  private rebuildPaths(entry: FileEntry, parentPath: string): void {
    entry.path = this.joinPath(parentPath, entry.name);
    for (const child of entry.children ?? []) {
      child.parentId = entry.id;
      this.rebuildPaths(child, entry.path);
    }
  }

  private cloneEntryWithNewIds(
    source: FileEntry,
    parentId: string,
    parentPath: string,
    name = source.name,
  ): FileEntry {
    const timestamp = new Date().toISOString();
    const clone: FileEntry = {
      ...source,
      id: this.createId(),
      name,
      path: this.joinPath(parentPath, name),
      parentId,
      created: timestamp,
      modified: timestamp,
      tags: [...source.tags],
    };
    if (source.children) {
      clone.children = source.children.map((child) => (
        this.cloneEntryWithNewIds(child, clone.id, clone.path)
      ));
    }
    return clone;
  }

  private requireEntry(id: string, root: FileEntry): FileEntry {
    const entry = this.findById(id, root);
    if (!entry) {
      throw new Error('The selected item no longer exists.');
    }
    return entry;
  }

  private requireMutableEntry(id: string, root: FileEntry): FileEntry {
    if (id === ROOT_ID) {
      throw new Error('The Home folder cannot be changed.');
    }
    return this.requireEntry(id, root);
  }

  private requireDirectory(id: string, root: FileEntry): FileEntry {
    const directory = this.requireEntry(id, root);
    if (!directory.isDir) {
      throw new Error('The selected destination is not a folder.');
    }
    return directory;
  }

  private assertUniqueName(parent: FileEntry, name: string, excludedId?: string): void {
    if ((parent.children ?? []).some((entry) => (
      entry.id !== excludedId && entry.name.localeCompare(name, undefined, {sensitivity: 'accent'}) === 0
    ))) {
      throw new Error(`An item named “${name}” already exists in this folder.`);
    }
  }

  private validateName(name: string): string {
    const normalized = name.trim();
    if (!normalized) {
      throw new Error('Enter a name.');
    }
    if (normalized === '.' || normalized === '..' || normalized.includes('/') || normalized.includes('\0')) {
      throw new Error('Names cannot be “.”, “..”, or contain a slash.');
    }
    if (normalized.length > MAX_NAME_LENGTH) {
      throw new Error(`Names must be ${MAX_NAME_LENGTH} characters or fewer.`);
    }
    return normalized;
  }

  private normalizeTags(tags: string[]): string[] {
    const normalized = tags
      .map((tag) => tag.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .map((tag) => tag.slice(0, MAX_TAG_LENGTH));
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const tag of normalized) {
      const key = tag.toLocaleLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(tag);
      }
    }
    return unique.slice(0, MAX_TAGS);
  }

  private nextAvailableCopyName(parent: FileEntry, originalName: string, isDir: boolean): string {
    let sequence = 1;
    let candidate = this.derivedName(originalName, isDir, ' copy');
    while (this.hasName(parent, candidate)) {
      sequence++;
      candidate = this.derivedName(originalName, isDir, ` copy ${sequence}`);
    }
    return candidate;
  }

  private nextAvailableRestoreName(parent: FileEntry, originalName: string, isDir: boolean): string {
    if (!this.hasName(parent, originalName)) {
      return originalName;
    }
    let sequence = 1;
    let candidate = this.derivedName(originalName, isDir, ' restored');
    while (this.hasName(parent, candidate)) {
      sequence++;
      candidate = this.derivedName(originalName, isDir, ` restored ${sequence}`);
    }
    return candidate;
  }

  private derivedName(originalName: string, isDir: boolean, suffix: string): string {
    const dotIndex = isDir ? -1 : originalName.lastIndexOf('.');
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const extension = dotIndex > 0 ? originalName.slice(dotIndex) : '';
    const maxExtensionLength = Math.max(0, MAX_NAME_LENGTH - suffix.length - 1);
    const boundedExtension = extension.slice(0, maxExtensionLength);
    const maxBaseLength = Math.max(1, MAX_NAME_LENGTH - suffix.length - boundedExtension.length);
    const boundedBase = base.slice(0, maxBaseLength).trimEnd() || 'Item'.slice(0, maxBaseLength);
    return `${boundedBase}${suffix}${boundedExtension}`;
  }

  private hasName(parent: FileEntry, name: string): boolean {
    return (parent.children ?? []).some((entry) => (
      entry.name.localeCompare(name, undefined, {sensitivity: 'accent'}) === 0
    ));
  }

  private inferFileType(filename: string): FileTypes {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return FileTypes.image;
      case 'mp3':
      case 'wav':
        return FileTypes.audio;
      case 'mp4':
      case 'mov':
      case 'avi':
        return FileTypes.video;
      case 'zip':
      case 'rar':
      case '7z':
        return FileTypes.archive;
      case 'js':
      case 'ts':
      case 'html':
      case 'htm':
      case 'css':
      case 'json':
        return FileTypes.code;
      default:
        return FileTypes.document;
    }
  }

  private normalizePath(path: string): string {
    const normalized = `/${path}`.replace(/\/+/g, '/');
    return normalized.length > 1 ? normalized.replace(/\/$/, '') : '/';
  }

  private joinPath(parentPath: string, name: string): string {
    return this.normalizePath(`${parentPath}/${name}`);
  }

  private stableSeedId(path: string): string {
    return `seed-${this.hashPath(this.normalizePath(path)).toString(36)}`;
  }

  private hashPath(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private createId(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return `entry-${globalThis.crypto.randomUUID()}`;
    }
    this.generatedIdCounter++;
    return `entry-${Date.now().toString(36)}-${this.generatedIdCounter.toString(36)}`;
  }

  private nextRevisionToken(current: number): number {
    if (!Number.isSafeInteger(current) || current < 0 || current >= Number.MAX_SAFE_INTEGER) {
      throw new Error('Finder virtual filesystem revision metadata is invalid.');
    }
    return current >= Number.MAX_SAFE_INTEGER - 1
      ? this.createRevisionToken(current)
      : current + 1;
  }

  private nextRecoveryRevisionToken(expected: number): number {
    return Number.isSafeInteger(expected) && expected >= 0 && expected < Number.MAX_SAFE_INTEGER
      ? this.nextRevisionToken(expected)
      : this.createRevisionToken(expected);
  }

  private createRevisionToken(excluded?: number): number {
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      for (let attempt = 0; attempt < 4; attempt++) {
        const values = new Uint32Array(2);
        globalThis.crypto.getRandomValues(values);
        const token = (
          (values[0] & 0x1fffff) * 0x100000000 + values[1]
        ) % Number.MAX_SAFE_INTEGER;
        if (token > 0 && !Object.is(token, excluded)) {
          return token;
        }
      }
    }
    this.generatedIdCounter++;
    const fallback = (Date.now() * 1_000 + this.generatedIdCounter) % Number.MAX_SAFE_INTEGER;
    return fallback > 0 && !Object.is(fallback, excluded) ? fallback : 1;
  }

  private cloneSnapshot(snapshot: VirtualFileSystemSnapshot): VirtualFileSystemSnapshot {
    if (typeof globalThis.structuredClone === 'function') {
      return globalThis.structuredClone(snapshot);
    }
    return JSON.parse(JSON.stringify(snapshot)) as VirtualFileSystemSnapshot;
  }

  private cloneEntry(entry: FileEntry): FileEntry {
    if (typeof globalThis.structuredClone === 'function') {
      return globalThis.structuredClone(entry);
    }
    return JSON.parse(JSON.stringify(entry)) as FileEntry;
  }

  private createEmptySnapshot(): VirtualFileSystemSnapshot {
    return {
      version: FILE_SYSTEM_VERSION,
      revision: 0,
      root: {
        id: ROOT_ID,
        name: '/',
        path: '/',
        type: FileTypes.folder,
        isDir: true,
        created: SEED_TIMESTAMP,
        modified: SEED_TIMESTAMP,
        tags: [],
        children: [],
      },
      trash: [],
      updatedAt: SEED_TIMESTAMP,
    };
  }

  private isSnapshot(value: unknown): value is VirtualFileSystemSnapshot {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const candidate = value as Partial<VirtualFileSystemSnapshot>;
    return candidate.version === FILE_SYSTEM_VERSION
      && Array.isArray(candidate.trash)
      && !!candidate.root
      && candidate.root.id === ROOT_ID
      && candidate.root.path === '/';
  }

  private normalizeSnapshot(snapshot: VirtualFileSystemSnapshot): VirtualFileSystemSnapshot {
    this.measureSnapshotBytes(snapshot, true);
    const normalized = this.cloneSnapshot(snapshot);
    const revision = (normalized as unknown as {revision?: unknown}).revision;
    if (revision === undefined) {
      normalized.revision = 0;
    }
    return normalized;
  }

  private validateSnapshot(snapshot: VirtualFileSystemSnapshot): void {
    this.measureSnapshotBytes(snapshot, false);
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0
      || snapshot.revision >= Number.MAX_SAFE_INTEGER
      || !this.isValidTimestamp(snapshot.updatedAt)) {
      throw new Error('Finder virtual filesystem metadata is invalid.');
    }
    const ids = new Set<string>();
    let entryCount = 0;

    const validateEntry = (
      entry: FileEntry,
      expectedParentId: string | undefined,
      expectedPath: string,
      depth: number,
    ): void => {
      entryCount++;
      if (entryCount > MAX_ENTRY_COUNT || depth > MAX_TREE_DEPTH) {
        throw new Error('Finder virtual filesystem exceeds its safe size limits.');
      }
      if (!entry || typeof entry !== 'object'
        || typeof entry.id !== 'string' || !entry.id || entry.id.length > MAX_ID_LENGTH
        || typeof entry.name !== 'string' || entry.name.length > MAX_NAME_LENGTH
        || typeof entry.path !== 'string' || entry.path.length > MAX_PATH_LENGTH
        || typeof entry.type !== 'string' || entry.type.length > MAX_TYPE_LENGTH
        || !ALLOWED_FILE_TYPES.has(entry.type)
        || typeof entry.isDir !== 'boolean'
        || !this.isValidTimestamp(entry.created)
        || !this.isValidTimestamp(entry.modified)
        || !Array.isArray(entry.tags)
        || entry.tags.some((tag) => typeof tag !== 'string'
          || !tag.trim()
          || tag !== tag.trim().replace(/\s+/g, ' ')
          || tag.length > MAX_TAG_LENGTH)
        || entry.tags.length > MAX_TAGS
        || new Set(entry.tags.map((tag) => tag.toLocaleLowerCase())).size !== entry.tags.length
        || (entry.size !== undefined
          && (!Number.isFinite(entry.size) || entry.size < 0 || !Number.isInteger(entry.size)))
        || (entry.mimeType !== undefined
          && (typeof entry.mimeType !== 'string' || !entry.mimeType || entry.mimeType.length > MAX_MIME_TYPE_LENGTH))
        || entry.parentId !== expectedParentId
        || entry.path !== expectedPath
        || ids.has(entry.id)) {
        throw new Error('Finder virtual filesystem contains an invalid entry.');
      }
      if (entry.id === ROOT_ID) {
        if (entry.name !== '/' || entry.path !== '/' || !entry.isDir || entry.type !== FileTypes.folder) {
          throw new Error('Finder virtual filesystem root is invalid.');
        }
      } else if (this.validateName(entry.name) !== entry.name) {
        throw new Error('Finder virtual filesystem contains an invalid name.');
      }
      ids.add(entry.id);
      if (entry.isDir && (entry.type !== FileTypes.folder || !Array.isArray(entry.children))) {
        throw new Error('Finder virtual filesystem contains an invalid folder.');
      }
      if (!entry.isDir && entry.children !== undefined) {
        throw new Error('Finder virtual filesystem contains an invalid file.');
      }
      if (!entry.isDir && entry.type === FileTypes.folder) {
        throw new Error('Finder virtual filesystem contains an invalid file type.');
      }
      const siblingNames = new Set<string>();
      for (const child of entry.children ?? []) {
        if (!child || typeof child !== 'object' || typeof child.name !== 'string') {
          throw new Error('Finder virtual filesystem contains an invalid child entry.');
        }
        const nameKey = child.name.toLocaleLowerCase();
        if (siblingNames.has(nameKey)) {
          throw new Error('Finder virtual filesystem contains duplicate sibling names.');
        }
        siblingNames.add(nameKey);
        validateEntry(child, entry.id, this.joinPath(entry.path, child.name), depth + 1);
      }
    };

    validateEntry(snapshot.root, undefined, '/', 0);
    for (const record of snapshot.trash) {
      if (!record || typeof record !== 'object'
        || typeof record.originalParentId !== 'string'
        || !record.originalParentId || record.originalParentId.length > MAX_ID_LENGTH
        || typeof record.originalPath !== 'string' || record.originalPath.length > MAX_PATH_LENGTH
        || record.originalPath !== this.normalizePath(record.originalPath)
        || !record.originalPath.endsWith(`/${record.entry?.name ?? ''}`)
        || !this.isValidTimestamp(record.trashedAt)) {
        throw new Error('Finder Trash metadata is invalid.');
      }
      validateEntry(record.entry, record.originalParentId, record.originalPath, 0);
    }
  }

  private measureSnapshotBytes(value: unknown, allowMissingRevision: boolean): number {
    const encoder = new TextEncoder();
    let totalBytes = 0;
    let entryCount = 0;

    const addBytes = (amount: number): void => {
      totalBytes += amount;
      if (totalBytes > MAX_SNAPSHOT_BYTES) {
        throw new Error('Finder virtual filesystem exceeds its safe storage limit.');
      }
    };
    const stringBytes = (text: string): number => encoder.encode(JSON.stringify(text)).byteLength;
    const requirePlainRecord = (
      candidate: unknown,
      allowedKeys: ReadonlySet<string>,
      requiredKeys: readonly string[],
      errorMessage: string,
    ): Record<string, unknown> => {
      if (!candidate || typeof candidate !== 'object'
        || (Object.getPrototypeOf(candidate) !== Object.prototype
          && Object.getPrototypeOf(candidate) !== null)) {
        throw new Error(errorMessage);
      }
      const record = candidate as Record<string, unknown>;
      const keys: string[] = [];
      for (const key in record) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) {
          continue;
        }
        if (!allowedKeys.has(key)) {
          throw new Error(errorMessage);
        }
        keys.push(key);
      }
      if (Object.getOwnPropertySymbols(record).length > 0
        || requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(record, key))) {
        throw new Error(errorMessage);
      }
      addBytes(2 + Math.max(0, keys.length - 1));
      for (const key of keys) {
        addBytes(stringBytes(key) + 1);
      }
      return record;
    };
    const requireDenseArray = (
      candidate: unknown,
      maxLength: number,
      errorMessage: string,
    ): unknown[] => {
      if (!Array.isArray(candidate) || candidate.length > maxLength) {
        throw new Error(errorMessage);
      }
      for (let index = 0; index < candidate.length; index++) {
        if (!Object.prototype.hasOwnProperty.call(candidate, index)) {
          throw new Error(errorMessage);
        }
      }
      if (Object.keys(candidate).some((key) => !/^(0|[1-9]\d*)$/.test(key))) {
        throw new Error(errorMessage);
      }
      addBytes(2 + Math.max(0, candidate.length - 1));
      return candidate;
    };
    const measureString = (candidate: unknown, maxLength: number, errorMessage: string): void => {
      if (typeof candidate !== 'string' || candidate.length > maxLength) {
        throw new Error(errorMessage);
      }
      addBytes(stringBytes(candidate));
    };
    const measureNumber = (candidate: unknown, errorMessage: string): void => {
      if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
        throw new Error(errorMessage);
      }
      addBytes(String(candidate).length);
    };
    const entryKeys = new Set([
      'id', 'name', 'path', 'type', 'isDir', 'created', 'modified', 'parentId', 'tags',
      'size', 'mimeType', 'children',
    ]);
    const measureEntry = (candidate: unknown, depth: number): void => {
      if (++entryCount > MAX_ENTRY_COUNT || depth > MAX_TREE_DEPTH) {
        throw new Error('Finder virtual filesystem exceeds its safe size limits.');
      }
      const entry = requirePlainRecord(
        candidate,
        entryKeys,
        ['id', 'name', 'path', 'type', 'isDir', 'created', 'modified', 'tags'],
        'Finder virtual filesystem contains an invalid entry.',
      );
      measureString(entry['id'], MAX_ID_LENGTH, 'Finder virtual filesystem contains an invalid entry.');
      measureString(entry['name'], MAX_NAME_LENGTH, 'Finder virtual filesystem contains an invalid entry.');
      measureString(entry['path'], MAX_PATH_LENGTH, 'Finder virtual filesystem contains an invalid entry.');
      measureString(entry['type'], MAX_TYPE_LENGTH, 'Finder virtual filesystem contains an invalid entry.');
      if (typeof entry['isDir'] !== 'boolean') {
        throw new Error('Finder virtual filesystem contains an invalid entry.');
      }
      addBytes(entry['isDir'] ? 4 : 5);
      measureString(entry['created'], 40, 'Finder virtual filesystem contains an invalid entry.');
      measureString(entry['modified'], 40, 'Finder virtual filesystem contains an invalid entry.');
      if (Object.prototype.hasOwnProperty.call(entry, 'parentId')) {
        measureString(entry['parentId'], MAX_ID_LENGTH, 'Finder virtual filesystem contains an invalid entry.');
      }
      const tags = requireDenseArray(
        entry['tags'],
        MAX_TAGS,
        'Finder virtual filesystem contains invalid tags.',
      );
      for (const tag of tags) {
        measureString(tag, MAX_TAG_LENGTH, 'Finder virtual filesystem contains invalid tags.');
      }
      if (Object.prototype.hasOwnProperty.call(entry, 'size')) {
        measureNumber(entry['size'], 'Finder virtual filesystem contains an invalid entry.');
      }
      if (Object.prototype.hasOwnProperty.call(entry, 'mimeType')) {
        measureString(
          entry['mimeType'],
          MAX_MIME_TYPE_LENGTH,
          'Finder virtual filesystem contains an invalid entry.',
        );
      }
      if (Object.prototype.hasOwnProperty.call(entry, 'children')) {
        const children = requireDenseArray(
          entry['children'],
          MAX_ENTRY_COUNT,
          'Finder virtual filesystem contains invalid children.',
        );
        for (const child of children) {
          measureEntry(child, depth + 1);
        }
      }
    };

    const snapshot = requirePlainRecord(
      value,
      new Set(['version', 'revision', 'root', 'trash', 'updatedAt']),
      allowMissingRevision
        ? ['version', 'root', 'trash', 'updatedAt']
        : ['version', 'revision', 'root', 'trash', 'updatedAt'],
      'Finder virtual filesystem metadata is invalid.',
    );
    measureNumber(snapshot['version'], 'Finder virtual filesystem metadata is invalid.');
    if (Object.prototype.hasOwnProperty.call(snapshot, 'revision')) {
      measureNumber(snapshot['revision'], 'Finder virtual filesystem metadata is invalid.');
    }
    measureString(snapshot['updatedAt'], 40, 'Finder virtual filesystem metadata is invalid.');
    measureEntry(snapshot['root'], 0);
    const trash = requireDenseArray(
      snapshot['trash'],
      MAX_ENTRY_COUNT,
      'Finder virtual filesystem contains invalid Trash data.',
    );
    const trashKeys = new Set(['entry', 'originalParentId', 'originalPath', 'trashedAt']);
    for (const candidate of trash) {
      const record = requirePlainRecord(
        candidate,
        trashKeys,
        ['entry', 'originalParentId', 'originalPath', 'trashedAt'],
        'Finder Trash metadata is invalid.',
      );
      measureString(record['originalParentId'], MAX_ID_LENGTH, 'Finder Trash metadata is invalid.');
      measureString(record['originalPath'], MAX_PATH_LENGTH, 'Finder Trash metadata is invalid.');
      measureString(record['trashedAt'], 40, 'Finder Trash metadata is invalid.');
      measureEntry(record['entry'], 0);
    }
    return totalBytes;
  }

  private serializeRecoveryData(value: unknown): string {
    const seen = new WeakMap<object, number>();
    let nextReferenceId = 1;
    let remainingStringBytes = 1_000_000;
    let remainingNodes = 10_000;
    let complete = true;
    const encoder = new TextEncoder();

    const boundedString = (input: string): string => {
      const suffix = '…[truncated]';
      const suffixBytes = encoder.encode(suffix).byteLength;
      const available = Math.max(0, Math.min(4_096, remainingStringBytes));
      let output = '';
      let outputBytes = 0;
      let consumedCodeUnits = 0;
      for (const character of input) {
        const characterBytes = encoder.encode(character).byteLength;
        const reserve = consumedCodeUnits + character.length < input.length ? suffixBytes : 0;
        if (outputBytes + characterBytes + reserve > available) {
          break;
        }
        output += character;
        outputBytes += characterBytes;
        consumedCodeUnits += character.length;
      }
      if (consumedCodeUnits !== input.length) {
        complete = false;
        const truncated = available >= suffixBytes ? `${output}${suffix}` : output;
        remainingStringBytes -= encoder.encode(truncated).byteLength;
        return truncated;
      }
      remainingStringBytes -= outputBytes;
      return output;
    };
    const visit = (candidate: unknown, depth: number): unknown => {
      if (remainingNodes-- <= 0 || depth > MAX_TREE_DEPTH) {
        complete = false;
        return {$type: 'truncated'};
      }
      if (candidate === null || typeof candidate === 'boolean') {
        return candidate;
      }
      if (typeof candidate === 'string') {
        return boundedString(candidate);
      }
      if (typeof candidate === 'number') {
        return Number.isFinite(candidate) ? candidate : {$type: 'number', value: String(candidate)};
      }
      if (typeof candidate === 'bigint') {
        complete = false;
        return {$type: 'bigint', value: 'omitted for safe diagnostics'};
      }
      if (typeof candidate === 'undefined') {
        return {$type: 'undefined'};
      }
      if (typeof candidate !== 'object') {
        complete = false;
        return {$type: typeof candidate};
      }
      const priorReferenceId = seen.get(candidate);
      if (priorReferenceId !== undefined) {
        complete = false;
        return {$ref: priorReferenceId};
      }
      seen.set(candidate, nextReferenceId++);
      if (candidate instanceof Date) {
        return {$type: 'Date', value: candidate.toISOString()};
      }
      if (typeof Blob !== 'undefined' && candidate instanceof Blob) {
        complete = false;
        return {$type: 'Blob', size: candidate.size, mimeType: boundedString(candidate.type)};
      }
      if (candidate instanceof ArrayBuffer) {
        complete = false;
        return {$type: 'ArrayBuffer', byteLength: candidate.byteLength};
      }
      if (ArrayBuffer.isView(candidate)) {
        complete = false;
        return {
          $type: candidate.constructor.name,
          byteLength: candidate.byteLength,
        };
      }
      if (candidate instanceof Map) {
        complete = false;
        const entries: unknown[] = [];
        let index = 0;
        for (const [key, entry] of candidate) {
          if (index >= 1_000) {
            break;
          }
          entries.push([
            visit(key, depth + 1),
            visit(entry, depth + 1),
          ]);
          index++;
        }
        return {
          $type: 'Map',
          entries,
        };
      }
      if (candidate instanceof Set) {
        complete = false;
        const values: unknown[] = [];
        let index = 0;
        for (const entry of candidate) {
          if (index >= 1_000) {
            break;
          }
          values.push(visit(entry, depth + 1));
          index++;
        }
        return {
          $type: 'Set',
          values,
        };
      }
      if (Array.isArray(candidate)) {
        const length = Math.min(candidate.length, MAX_ENTRY_COUNT);
        if (length !== candidate.length) {
          complete = false;
        }
        return Array.from({length}, (_, index) => (
          Object.prototype.hasOwnProperty.call(candidate, index)
            ? visit(candidate[index], depth + 1)
            : {$type: 'array-hole'}
        ));
      }
      const prototype = Object.getPrototypeOf(candidate);
      if (prototype !== Object.prototype && prototype !== null) {
        complete = false;
        return {$type: candidate.constructor?.name ?? 'object'};
      }
      const result = Object.create(null) as Record<string, unknown>;
      let propertyCount = 0;
      for (const key in candidate as Record<string, unknown>) {
        if (!Object.prototype.hasOwnProperty.call(candidate, key)) {
          continue;
        }
        if (propertyCount++ >= 1_000) {
          complete = false;
          break;
        }
        const boundedKey = boundedString(key);
        const entry = (candidate as Record<string, unknown>)[key];
        result[boundedKey] = visit(entry, depth + 1);
      }
      return result;
    };

    let sanitized: unknown;
    try {
      sanitized = visit(value, 0);
    } catch (error) {
      complete = false;
      sanitized = {
        $type: 'unserializable',
        message: this.describeError(error, 'Finder could not inspect this stored value.'),
      };
    }
    const createEnvelope = (isComplete: boolean) => ({
      format: 'core-os-finder-recovery-v1',
      complete: isComplete,
      note: isComplete
        ? 'The stored value is represented completely.'
        : 'Unsupported binary, cyclic, or oversized values are described or truncated for safe diagnostics.',
      value: sanitized,
    });
    const first = this.stringifyBoundedRecoveryJson(createEnvelope(complete), 1_250_000);
    if (!first.truncated || !complete) {
      return first.json;
    }
    return this.stringifyBoundedRecoveryJson(createEnvelope(false), 1_250_000).json;
  }

  private stringifyBoundedRecoveryJson(
    value: unknown,
    maximumBytes: number,
  ): {json: string; truncated: boolean} {
    const encoder = new TextEncoder();
    const parts: string[] = [];
    let byteLength = 0;
    let truncated = false;

    const append = (token: string, reservedBytes: number): boolean => {
      const tokenBytes = encoder.encode(token).byteLength;
      if (byteLength + tokenBytes + reservedBytes > maximumBytes) {
        return false;
      }
      parts.push(token);
      byteLength += tokenBytes;
      return true;
    };
    const restore = (partCount: number, previousByteLength: number): void => {
      parts.length = partCount;
      byteLength = previousByteLength;
    };
    const encode = (candidate: unknown, reservedBytes: number): boolean => {
      if (candidate === null || typeof candidate === 'boolean' || typeof candidate === 'number') {
        return append(JSON.stringify(candidate), reservedBytes);
      }
      if (typeof candidate === 'string') {
        return append(JSON.stringify(candidate), reservedBytes);
      }
      if (Array.isArray(candidate)) {
        const startParts = parts.length;
        const startBytes = byteLength;
        if (!append('[', reservedBytes + 1)) {
          return false;
        }
        for (let index = 0; index < candidate.length; index++) {
          const itemParts = parts.length;
          const itemBytes = byteLength;
          if ((index === 0 || append(',', reservedBytes + 1))
              && encode(candidate[index], reservedBytes + 1)) {
            continue;
          }
          restore(itemParts, itemBytes);
          truncated = true;
          break;
        }
        if (append(']', reservedBytes)) {
          return true;
        }
        restore(startParts, startBytes);
        return false;
      }
      if (typeof candidate === 'object') {
        const startParts = parts.length;
        const startBytes = byteLength;
        if (!append('{', reservedBytes + 1)) {
          return false;
        }
        const record = candidate as Record<string, unknown>;
        const keys = Object.keys(record);
        let written = 0;
        for (const key of keys) {
          const propertyParts = parts.length;
          const propertyBytes = byteLength;
          if ((written === 0 || append(',', reservedBytes + 1))
              && append(JSON.stringify(key), reservedBytes + 2)
              && append(':', reservedBytes + 1)
              && encode(record[key], reservedBytes + 1)) {
            written++;
            continue;
          }
          restore(propertyParts, propertyBytes);
          truncated = true;
          break;
        }
        if (append('}', reservedBytes)) {
          return true;
        }
        restore(startParts, startBytes);
        return false;
      }
      return append('null', reservedBytes);
    };

    if (!encode(value, 0)) {
      return {json: '{"format":"core-os-finder-recovery-v1","complete":false,"value":null}', truncated: true};
    }
    return {json: parts.join(''), truncated};
  }

  private isValidTimestamp(value: unknown): value is string {
    return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
  }

  private requireStorageKey(): string {
    if (!this.storageKey) {
      throw new Error('Sign in to use Finder.');
    }
    return this.storageKey;
  }

  private resetRuntimeState(): void {
    this.snapshot = this.createEmptySnapshot();
    this.locationId = ROOT_ID;
    this.undoStack.length = 0;
    this.selectedFileSubject.next(undefined);
    this.undoLabelSubject.next(null);
    this.readySubject.next(false);
    this.clearRecoveryData();
    this.errorSubject.next(null);
    this.refreshCurrentDirectory();
  }

  private suspendForIdentityChange(): number {
    this.identityRevision++;
    this.storageKey = null;
    this.resetRuntimeState();
    return this.identityRevision;
  }

  private async reloadAfterConflict(
    storageKey: string,
    identityRevision: number,
  ): Promise<boolean> {
    const storedRecord = await firstValueFrom(this.storage.getRecoveryRecord<unknown>(storageKey));
    const stored = storedRecord.value;
    if (identityRevision !== this.identityRevision) {
      return false;
    }
    if (!storedRecord.exists || !this.isSnapshot(stored)) {
      this.readySubject.next(false);
      if (storedRecord.exists) {
        this.setRecoveryData(stored);
      } else {
        this.clearRecoveryData();
      }
      throw new Error('Finder could not reload the latest saved version.');
    }
    let normalized: VirtualFileSystemSnapshot;
    try {
      normalized = this.normalizeSnapshot(stored);
      this.validateSnapshot(normalized);
    } catch (error) {
      this.readySubject.next(false);
      this.setRecoveryData(stored);
      const message = this.describeError(error, 'Finder could not reload the latest saved version.');
      this.errorSubject.next(message);
      throw new Error(message, {cause: error});
    }
    this.snapshot = normalized;
    this.locationId = this.findById(this.locationId, normalized.root)?.id ?? ROOT_ID;
    this.undoStack.length = 0;
    this.undoLabelSubject.next(null);
    this.selectedFileSubject.next(undefined);
    this.readySubject.next(true);
    this.clearRecoveryData();
    this.refreshCurrentDirectory();
    return true;
  }

  private readStoredRevision(value: unknown): number | null {
    if (value && typeof value === 'object') {
      const revision = (value as {revision?: unknown}).revision;
      if (typeof revision === 'number') {
        return revision;
      }
    }
    return null;
  }

  private setRecoveryData(value: unknown): void {
    this.recoveryRawValue = value;
    this.recoveryAvailableSubject.next(true);
  }

  private clearRecoveryData(): void {
    this.recoveryRawValue = undefined;
    this.recoveryAvailableSubject.next(false);
  }

  private describeError(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
