import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, of, Subject} from 'rxjs';
import {StorageService} from '@core-os/storage';
import {StorageStrategy} from '@core-os/storage/storage.service';
import {AuthService} from '../../services/auth.service';
import {
  CORE_OS_FILE_SYSTEM_STORAGE_KEY,
  coreOsFileSystemStorageKeyForUser,
  FileEntry,
  FileSystemService,
  VirtualFileSystemSnapshot,
} from './file-system.service';

const BASE_TREE = {
  name: '/',
  path: '/',
  type: 'folder',
  isDir: true,
  children: [
    {
      name: 'Photos',
      path: '/Photos',
      type: 'folder',
      isDir: true,
      children: [
        {
          name: 'sunset.jpg',
          path: '/Photos/sunset.jpg',
          type: 'image',
          isDir: false,
        }
      ],
    },
    {
      name: 'resume.pdf',
      path: '/resume.pdf',
      type: 'document',
      isDir: false,
    }
  ],
};

class MemoryStorageStrategy implements StorageStrategy {
  readonly values = new Map<string, unknown>();
  failWrites = false;
  getBlocked = false;
  private compareGate: Promise<void> | null = null;
  private releaseCompareGate: (() => void) | null = null;
  private getGate: Promise<void> | null = null;
  private releaseGetGate: (() => void) | null = null;

  deferNextCompare(): () => void {
    this.compareGate = new Promise<void>((resolve) => this.releaseCompareGate = resolve);
    return () => this.releaseCompareGate?.();
  }

  deferNextGet(): () => void {
    this.getGate = new Promise<void>((resolve) => this.releaseGetGate = resolve);
    return () => this.releaseGetGate?.();
  }

  async setItem(key: string, value: unknown): Promise<void> {
    if (this.failWrites) {
      throw new Error('quota exceeded');
    }
    this.values.set(key, structuredClone(value));
  }

  async compareAndSetItem(
    key: string,
    expectedRevision: number | null,
    value: unknown,
  ): Promise<boolean> {
    if (this.failWrites) {
      throw new Error('quota exceeded');
    }
    if (this.compareGate) {
      const gate = this.compareGate;
      this.compareGate = null;
      await gate;
      this.releaseCompareGate = null;
    }
    const exists = this.values.has(key);
    const current = this.values.get(key) as {revision?: unknown} | null | undefined;
    const currentRevision = !exists
      ? null
      : current && typeof current.revision === 'number' ? current.revision : 0;
    if (!Object.is(currentRevision, expectedRevision)) {
      return false;
    }
    this.values.set(key, structuredClone(value));
    return true;
  }

  supportsAtomicCompareAndSet(): boolean {
    return true;
  }

  async getItem<T>(key: string): Promise<T | null> {
    if (this.getGate) {
      const gate = this.getGate;
      this.getGate = null;
      this.getBlocked = true;
      await gate;
      this.getBlocked = false;
      this.releaseGetGate = null;
    }
    const value = this.values.get(key);
    return value === undefined ? null : structuredClone(value) as T;
  }

  async getRecoverableItem<T>(key: string): Promise<T | null> {
    return this.getItem<T>(key);
  }

  async getRecoveryRecord<T>(key: string): Promise<{exists: boolean; value: T | null}> {
    const value = await this.getItem<T>(key);
    return {exists: this.values.has(key), value};
  }

  async getAllKeys(): Promise<string[]> {
    return [...this.values.keys()];
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }

  async clear(): Promise<void> {
    this.values.clear();
  }
}

function createService(
  strategy = new MemoryStorageStrategy(),
  users?: BehaviorSubject<{uid: string} | null>,
): {
  service: FileSystemService;
  strategy: MemoryStorageStrategy;
  http: jasmine.SpyObj<Pick<HttpClient, 'get'>>;
} {
  const http = jasmine.createSpyObj<Pick<HttpClient, 'get'>>('HttpClient', ['get']);
  http.get.and.returnValue(of(structuredClone(BASE_TREE)));
  const service = new FileSystemService(
    http as unknown as HttpClient,
    new StorageService(strategy),
    users ? {user$: users.asObservable()} as AuthService : null,
  );
  return {service, strategy, http};
}

function childByName(directory: FileEntry, name: string): FileEntry {
  const entry = directory.children?.find((child) => child.name === name);
  if (!entry) {
    throw new Error(`Missing test entry: ${name}`);
  }
  return entry;
}

function folderLikeEntry(id: string, name: string, path: string): FileEntry {
  return {
    id,
    name,
    path,
    type: 'folder',
    isDir: true,
    created: '2026-01-01T00:00:00.000Z',
    modified: '2026-01-01T00:00:00.000Z',
    parentId: 'root',
    tags: [],
    children: [],
  };
}

describe('FileSystemService', () => {
  it('imports the seed tree with stable IDs and deterministic favorite content', async () => {
    const first = createService();
    await first.service.whenReady();
    const firstRoot = first.service.getCurrentDirectory();

    const second = createService();
    await second.service.whenReady();
    const secondRoot = second.service.getCurrentDirectory();

    expect(first.service.isReady()).toBeTrue();
    expect(firstRoot.id).toBe('root');
    expect(firstRoot.children?.some((entry) => entry.path === '/Desktop')).toBeTrue();
    expect(firstRoot.children?.filter((entry) => entry.path === '/').length).toBe(0);
    expect(childByName(firstRoot, 'Desktop').children?.map((entry) => [entry.id, entry.name]))
      .toEqual(childByName(secondRoot, 'Desktop').children?.map((entry) => [entry.id, entry.name]));

    const persisted = first.strategy.values.get(
      CORE_OS_FILE_SYSTEM_STORAGE_KEY
    ) as VirtualFileSystemSnapshot;
    expect(persisted.version).toBe(1);
    expect(persisted.root.id).toBe('root');
  });

  it('loads a persisted snapshot without rebuilding the seed tree', async () => {
    const first = createService();
    await first.service.whenReady();
    const projects = childByName(first.service.getCurrentDirectory(), 'Projects');
    await first.service.createFolder(projects.id, 'Saved Work');

    const http = jasmine.createSpyObj<Pick<HttpClient, 'get'>>('HttpClient', ['get']);
    http.get.and.throwError('seed should not load');
    const restored = new FileSystemService(
      http as unknown as HttpClient,
      new StorageService(first.strategy),
    );
    await restored.whenReady();

    expect(restored.navigateTo('/Projects')).toBeTrue();
    expect(restored.getCurrentDirectory().children?.map((entry) => entry.name)).toContain('Saved Work');
    expect(http.get).not.toHaveBeenCalled();
  });

  it('leaves unsupported persisted data untouched instead of overwriting it with seeds', async () => {
    const strategy = new MemoryStorageStrategy();
    const unsupported = {version: 99, root: {id: 'future'}};
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, unsupported);

    const {service, http} = createService(strategy);
    await service.whenReady();

    expect(service.isReady()).toBeFalse();
    expect(service.hasRecoverableData()).toBeTrue();
    expect(await service.exportRecoveryData()).toContain('"version":99');
    expect(strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)).toEqual(unsupported);
    expect(http.get).not.toHaveBeenCalled();

    await service.resetToSeed();
    expect(service.isReady()).toBeTrue();
    expect(service.hasRecoverableData()).toBeFalse();
    expect((strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY) as VirtualFileSystemSnapshot).version).toBe(1);
  });

  it('preserves a present null value as recoverable data instead of treating it as first use', async () => {
    const strategy = new MemoryStorageStrategy();
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, null);
    const {service, http} = createService(strategy);
    await service.whenReady();

    expect(service.isReady()).toBeFalse();
    expect(service.hasRecoverableData()).toBeTrue();
    expect(await service.exportRecoveryData()).toContain('"value":null');
    expect(http.get).not.toHaveBeenCalled();
    expect(strategy.values.has(CORE_OS_FILE_SYSTEM_STORAGE_KEY)).toBeTrue();
  });

  it('namespaces persisted files by authenticated UID and resets live state on account changes', async () => {
    const strategy = new MemoryStorageStrategy();
    const users = new BehaviorSubject<{uid: string} | null>({uid: 'reader-a'});
    const {service} = createService(strategy, users);
    await service.whenReady();
    const projectsA = childByName(service.getCurrentDirectory(), 'Projects');
    await service.createFolder(projectsA.id, 'Account A Only');
    await service.createFolder(projectsA.id, 'Transient History');
    expect(await service.undoLastMutation()).toBeTrue();
    expect(service.getRedoLabel()).toBe('New Folder');

    users.next({uid: 'reader-b'});
    expect(service.isReady()).toBeFalse();
    expect(service.getCurrentDirectory().children).toEqual([]);
    expect(service.getSelectedEntry()).toBeUndefined();
    expect(service.getRedoLabel()).toBeNull();
    await service.whenReady();
    expect(childByName(service.getCurrentDirectory(), 'Projects').children?.map((entry) => entry.name))
      .not.toContain('Account A Only');
    expect(service.getUndoLabel()).toBeNull();
    const projectsB = childByName(service.getCurrentDirectory(), 'Projects');
    await service.createFolder(projectsB.id, 'Account B Only');

    users.next({uid: 'reader-a'});
    await service.whenReady();
    const names = childByName(service.getCurrentDirectory(), 'Projects').children?.map((entry) => entry.name);
    expect(names).toContain('Account A Only');
    expect(names).not.toContain('Account B Only');
    expect(strategy.values.has(coreOsFileSystemStorageKeyForUser('reader-a'))).toBeTrue();
    expect(strategy.values.has(coreOsFileSystemStorageKeyForUser('reader-b'))).toBeTrue();
  });

  it('does not migrate the former origin-wide key into an authenticated account', async () => {
    const strategy = new MemoryStorageStrategy();
    const legacy = createService(strategy);
    await legacy.service.whenReady();
    const projects = childByName(legacy.service.getCurrentDirectory(), 'Projects');
    await legacy.service.createFolder(projects.id, 'Legacy Browser Data');
    const preservedLegacy = structuredClone(strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY));

    const users = new BehaviorSubject<{uid: string} | null>({uid: 'reader-c'});
    const authenticated = createService(strategy, users);
    await authenticated.service.whenReady();

    expect(childByName(authenticated.service.getCurrentDirectory(), 'Projects').children?.map((entry) => entry.name))
      .not.toContain('Legacy Browser Data');
    expect(strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)).toEqual(preservedLegacy);
  });

  it('creates, renames, moves, duplicates, tags, and searches durable entries', async () => {
    const {service, strategy} = createService();
    await service.whenReady();
    const root = service.getCurrentDirectory();
    const projects = childByName(root, 'Projects');
    const documents = childByName(root, 'Documents');

    const created = await service.createFolder(projects.id, 'Launch Notes');
    const stableId = created.id;
    const renamed = await service.renameEntry(created.id, 'Release Notes');
    expect(renamed.id).toBe(stableId);
    expect(renamed.path).toBe('/Projects/Release Notes');

    const moved = await service.moveEntry(created.id, documents.id);
    expect(moved.id).toBe(stableId);
    expect(moved.path).toBe('/Documents/Release Notes');

    const duplicate = await service.duplicateEntry(moved.id);
    expect(duplicate.id).not.toBe(stableId);
    expect(duplicate.name).toBe('Release Notes copy');
    await service.setTags(moved.id, ['Work', 'launch', 'work']);
    expect(service.search('launch').map((entry) => entry.id)).toContain(moved.id);

    const persisted = strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY) as VirtualFileSystemSnapshot;
    const persistedDocuments = childByName(persisted.root, 'Documents');
    expect(persistedDocuments.children?.map((entry) => entry.name)).toContain('Release Notes copy');
    expect(childByName(persistedDocuments, 'Release Notes').tags).toEqual(['Work', 'launch']);
  });

  it('moves items to Trash, restores them, and opens Trash from its virtual path', async () => {
    const {service} = createService();
    await service.whenReady();
    const resume = childByName(service.getCurrentDirectory(), 'resume.pdf');

    await service.moveToTrash(resume.id);
    expect(service.navigateTo('trash')).toBeTrue();
    expect(service.isTrashView()).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.id)).toEqual([resume.id]);

    const restored = await service.restoreFromTrash(resume.id);
    expect(restored.id).toBe(resume.id);
    expect(restored.path).toBe('/resume.pdf');
    expect(service.getCurrentDirectory().children).toEqual([]);
    expect(service.navigateTo('/')).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name)).toContain('resume.pdf');
  });

  it('undoes and redoes persisted mutations in history order', async () => {
    const {service, strategy} = createService();
    await service.whenReady();
    const projects = childByName(service.getCurrentDirectory(), 'Projects');
    const created = await service.createFolder(projects.id, 'Draft');
    await service.renameEntry(created.id, 'Final');

    expect(service.getUndoLabel()).toBe('Rename');
    expect(service.getRedoLabel()).toBeNull();
    expect(await service.undoLastMutation()).toBeTrue();
    expect(service.getUndoLabel()).toBe('New Folder');
    expect(service.getRedoLabel()).toBe('Rename');
    expect(service.navigateTo('/Projects')).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name)).toContain('Draft');

    expect(await service.undoLastMutation()).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name)).not.toContain('Draft');
    expect(await service.undoLastMutation()).toBeFalse();

    expect(service.getRedoLabel()).toBe('New Folder');
    expect(await service.redoLastMutation()).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name)).toContain('Draft');
    expect(service.getRedoLabel()).toBe('Rename');
    expect(await service.redoLastMutation()).toBeTrue();
    expect(service.navigateTo('/Projects')).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name)).toContain('Final');
    expect(service.getRedoLabel()).toBeNull();
    expect(await service.redoLastMutation()).toBeFalse();
    expect(strategy.values.has(CORE_OS_FILE_SYSTEM_STORAGE_KEY)).toBeTrue();
  });

  it('keeps redo available after a failed replay and clears it after a new saved mutation', async () => {
    const {service, strategy} = createService();
    await service.whenReady();
    const projects = childByName(service.getCurrentDirectory(), 'Projects');
    await service.createFolder(projects.id, 'Draft');
    expect(await service.undoLastMutation()).toBeTrue();
    expect(service.getRedoLabel()).toBe('New Folder');

    strategy.failWrites = true;
    await expectAsync(service.redoLastMutation()).toBeRejectedWithError(/quota exceeded/);
    expect(service.getRedoLabel()).toBe('New Folder');
    expect(service.navigateTo('/Projects')).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name)).not.toContain('Draft');

    strategy.failWrites = false;
    await service.createFolder(projects.id, 'Replacement');
    expect(service.getRedoLabel()).toBeNull();
    expect(await service.redoLastMutation()).toBeFalse();
  });

  it('serializes overlapping mutations against the latest successful snapshot', async () => {
    const {service} = createService();
    await service.whenReady();
    const projects = childByName(service.getCurrentDirectory(), 'Projects');

    await Promise.all([
      service.createFolder(projects.id, 'First'),
      service.createFolder(projects.id, 'Second'),
    ]);

    expect(service.navigateTo('/Projects')).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name))
      .toEqual(jasmine.arrayContaining(['First', 'Second']));
  });

  it('rejects stale-label undo while a normal mutation is pending', async () => {
    const {service, strategy} = createService();
    await service.whenReady();
    const projects = childByName(service.getCurrentDirectory(), 'Projects');
    const draft = await service.createFolder(projects.id, 'Draft');
    const release = strategy.deferNextCompare();

    const rename = service.renameEntry(draft.id, 'Final');
    const undo = service.undoLastMutation();
    expect(await undo).toBeFalse();
    release();
    await rename;

    expect(service.navigateTo('/Projects')).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name)).toContain('Final');
    expect(service.getUndoLabel()).toBe('Rename');
    expect(await service.undoLastMutation()).toBeTrue();
    expect(service.navigateTo('/Projects')).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name)).toContain('Draft');
  });

  it('allows only one cross-window history replay while persistence is pending', async () => {
    const {service, strategy} = createService();
    await service.whenReady();
    const projects = childByName(service.getCurrentDirectory(), 'Projects');
    await service.createFolder(projects.id, 'First');
    await service.createFolder(projects.id, 'Second');
    const mutationBusy: boolean[] = [];
    service.mutationBusy$.subscribe((busy) => mutationBusy.push(busy));
    const release = strategy.deferNextCompare();

    const firstFinderUndo = service.undoLastMutation();
    const secondFinderUndo = service.undoLastMutation();
    expect(await secondFinderUndo).toBeFalse();
    release();
    expect(await firstFinderUndo).toBeTrue();

    expect(service.navigateTo('/Projects')).toBeTrue();
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name)).toContain('First');
    expect(service.getCurrentDirectory().children?.map((entry) => entry.name)).not.toContain('Second');
    expect(service.getUndoLabel()).toBe('New Folder');
    expect(service.getRedoLabel()).toBe('New Folder');
    expect(mutationBusy).toEqual([false, true, false]);
  });

  it('serializes Move to Trash and Empty Trash in invocation order', async () => {
    const first = createService();
    await first.service.whenReady();
    const firstResume = childByName(first.service.getCurrentDirectory(), 'resume.pdf');
    await Promise.all([
      first.service.moveToTrash(firstResume.id),
      first.service.emptyTrash(),
    ]);
    first.service.navigateTo('trash');
    expect(first.service.getCurrentDirectory().children).toEqual([]);

    const second = createService();
    await second.service.whenReady();
    const secondResume = childByName(second.service.getCurrentDirectory(), 'resume.pdf');
    await Promise.all([
      second.service.emptyTrash(),
      second.service.moveToTrash(secondResume.id),
    ]);
    second.service.navigateTo('trash');
    expect(second.service.getCurrentDirectory().children?.map((entry) => entry.id)).toEqual([secondResume.id]);
  });

  it('detects cross-service revision conflicts and reloads instead of losing saved data', async () => {
    const strategy = new MemoryStorageStrategy();
    const first = createService(strategy);
    await first.service.whenReady();
    const second = createService(strategy);
    await second.service.whenReady();
    const firstProjects = childByName(first.service.getCurrentDirectory(), 'Projects');
    const secondProjects = childByName(second.service.getCurrentDirectory(), 'Projects');

    await first.service.createFolder(firstProjects.id, 'First Tab');
    await expectAsync(second.service.createFolder(secondProjects.id, 'Second Tab'))
      .toBeRejectedWithError(/changed in another tab/);

    expect(second.service.navigateTo('/Projects')).toBeTrue();
    expect(second.service.getCurrentDirectory().children?.map((entry) => entry.name)).toContain('First Tab');
    expect(second.service.getCurrentDirectory().children?.map((entry) => entry.name)).not.toContain('Second Tab');
  });

  it('rejects candidate mutations beyond the depth limit without corrupting the saved snapshot', async () => {
    const {service, strategy} = createService();
    await service.whenReady();
    const projects = childByName(service.getCurrentDirectory(), 'Projects');
    let parent = projects;
    for (let depth = 0; depth < 63; depth++) {
      parent = await service.createFolder(parent.id, `Level ${depth + 1}`);
    }

    await expectAsync(service.createFolder(parent.id, 'Too Deep'))
      .toBeRejectedWithError(/safe size limits/);

    const restored = new FileSystemService(
      jasmine.createSpyObj<Pick<HttpClient, 'get'>>('HttpClient', ['get']) as unknown as HttpClient,
      new StorageService(strategy),
    );
    await restored.whenReady();
    expect(restored.isReady()).toBeTrue();
  });

  it('rejects candidate mutations beyond the entry-count limit without corrupting the saved snapshot', async () => {
    const seeded = createService();
    await seeded.service.whenReady();
    const persisted = structuredClone(
      seeded.strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)
    ) as VirtualFileSystemSnapshot;
    persisted.root.children = Array.from({length: 9_999}, (_, index): FileEntry => ({
      id: `limit-${index}`,
      name: `item-${index}.txt`,
      path: `/item-${index}.txt`,
      type: 'document',
      isDir: false,
      created: '2026-01-01T00:00:00.000Z',
      modified: '2026-01-01T00:00:00.000Z',
      parentId: 'root',
      tags: [],
    }));
    seeded.strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, persisted);
    const atLimit = createService(seeded.strategy);
    await atLimit.service.whenReady();
    expect(atLimit.service.isReady()).toBeTrue();

    await expectAsync(atLimit.service.createFolder('root', 'One Too Many'))
      .toBeRejectedWithError(/safe size limits/);

    const restored = createService(seeded.strategy);
    await restored.service.whenReady();
    expect(restored.service.isReady()).toBeTrue();
    expect(restored.service.getCurrentDirectory().children?.length).toBe(9_999);
  });

  it('rejects persisted entries that violate path, metadata, and child invariants', async () => {
    const seeded = createService();
    await seeded.service.whenReady();
    const persisted = structuredClone(
      seeded.strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)
    ) as VirtualFileSystemSnapshot;
    const resume = childByName(persisted.root, 'resume.pdf');
    resume.name = '../escape';
    resume.path = '/../escape';
    resume.size = Number.POSITIVE_INFINITY;
    seeded.strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, persisted);

    const restored = createService(seeded.strategy);
    await restored.service.whenReady();
    expect(restored.service.isReady()).toBeFalse();
    expect(restored.service.hasRecoverableData()).toBeTrue();
  });

  it('rejects invalid names, duplicate siblings, and recursive moves', async () => {
    const {service} = createService();
    await service.whenReady();
    const projects = childByName(service.getCurrentDirectory(), 'Projects');
    const parent = await service.createFolder(projects.id, 'Parent');
    const child = await service.createFolder(parent.id, 'Child');

    await expectAsync(service.createFolder(projects.id, 'Parent'))
      .toBeRejectedWithError(/already exists/);
    await expectAsync(service.renameEntry(parent.id, '../Unsafe'))
      .toBeRejectedWithError(/contain a slash/);
    await expectAsync(service.moveEntry(parent.id, child.id))
      .toBeRejectedWithError(/inside itself/);
  });

  it('keeps the in-memory tree unchanged when persistence fails', async () => {
    const {service, strategy} = createService();
    await service.whenReady();
    const projects = childByName(service.getCurrentDirectory(), 'Projects');
    const before = projects.children?.map((entry) => entry.name);
    strategy.failWrites = true;

    await expectAsync(service.createFolder(projects.id, 'Unsaved'))
      .toBeRejectedWithError('quota exceeded');

    expect(childByName(service.getCurrentDirectory(), 'Projects').children?.map((entry) => entry.name))
      .toEqual(before);
  });

  it('keeps externally mutated view entries out of later persisted commits', async () => {
    const {service, strategy} = createService();
    await service.whenReady();
    const directory = service.getCurrentDirectory();
    const projects = childByName(directory, 'Projects');
    projects.name = 'Injected through getter';
    directory.children?.push(folderLikeEntry('external', 'External', '/External'));

    const subscription = service.currentDir$.subscribe((emitted) => {
      emitted.name = 'Injected through observable';
      emitted.children = [];
    });
    const created = await service.createFolder('root', 'Persisted Normally');
    created.name = 'Injected through mutation result';
    await service.createFolder('root', 'Second Commit');
    subscription.unsubscribe();

    const persisted = strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY) as VirtualFileSystemSnapshot;
    expect(persisted.root.name).toBe('/');
    expect(persisted.root.children?.map((entry) => entry.name)).toContain('Projects');
    expect(persisted.root.children?.map((entry) => entry.name)).not.toContain('External');
    expect(persisted.root.children?.map((entry) => entry.name)).toContain('Persisted Normally');
    expect(persisted.root.children?.map((entry) => entry.name)).not.toContain('Injected through mutation result');
  });

  it('uses first-use compare-and-set so a delayed seed cannot replace another tab', async () => {
    const strategy = new MemoryStorageStrategy();
    const seed = new Subject<typeof BASE_TREE>();
    const delayedHttp = jasmine.createSpyObj<Pick<HttpClient, 'get'>>('HttpClient', ['get']);
    delayedHttp.get.and.returnValue(seed.asObservable());
    const delayed = new FileSystemService(
      delayedHttp as unknown as HttpClient,
      new StorageService(strategy),
    );
    for (let attempt = 0; attempt < 10 && !delayedHttp.get.calls.any(); attempt++) {
      await Promise.resolve();
    }
    expect(delayedHttp.get).toHaveBeenCalled();

    const winner = createService(strategy);
    await winner.service.whenReady();
    const winnerProjects = childByName(winner.service.getCurrentDirectory(), 'Projects');
    await winner.service.createFolder(winnerProjects.id, 'Saved by Winner');

    seed.next(structuredClone(BASE_TREE));
    seed.complete();
    await delayed.whenReady();

    expect(childByName(delayed.getCurrentDirectory(), 'Projects').children?.map((entry) => entry.name))
      .toContain('Saved by Winner');
  });

  it('preserves a malformed first-use compare-and-set winner for recovery', async () => {
    const strategy = new MemoryStorageStrategy();
    const releaseCompare = strategy.deferNextCompare();
    const initializing = createService(strategy);
    for (let attempt = 0; attempt < 10 && !initializing.http.get.calls.any(); attempt++) {
      await Promise.resolve();
    }
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, {version: 99, revision: 4, root: {id: 'future'}});
    releaseCompare();
    await initializing.service.whenReady();

    expect(initializing.service.isReady()).toBeFalse();
    expect(initializing.service.hasRecoverableData()).toBeTrue();
    expect(await initializing.service.exportRecoveryData()).toContain('"version":99');
  });

  it('does not treat a concurrently stored null value as first-use absence', async () => {
    const strategy = new MemoryStorageStrategy();
    const releaseCompare = strategy.deferNextCompare();
    const initializing = createService(strategy);
    for (let attempt = 0; attempt < 10 && !initializing.http.get.calls.any(); attempt++) {
      await Promise.resolve();
    }
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, null);
    releaseCompare();
    await initializing.service.whenReady();

    expect(initializing.service.isReady()).toBeFalse();
    expect(initializing.service.hasRecoverableData()).toBeTrue();
    expect(strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)).toBeNull();
  });

  it('prevents a stale recovery tab from resetting a newer recovered snapshot', async () => {
    const strategy = new MemoryStorageStrategy();
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, {version: 99, revision: 5, root: {id: 'future'}});
    const first = createService(strategy);
    const second = createService(strategy);
    await Promise.all([first.service.whenReady(), second.service.whenReady()]);

    await first.service.resetToSeed();
    const winner = structuredClone(
      strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)
    ) as VirtualFileSystemSnapshot;
    await expectAsync(second.service.resetToSeed()).toBeRejectedWithError(/changed in another tab/);

    expect(strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)).toEqual(winner);
    expect(second.service.isReady()).toBeTrue();
    expect(second.service.hasRecoverableData()).toBeFalse();
  });

  it('uses the confirmed reset to replace the current revisionless corrupt value', async () => {
    const strategy = new MemoryStorageStrategy();
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, {version: 99, payload: 'malformed-a'});
    const stale = createService(strategy);
    await stale.service.whenReady();
    const replacement = {version: 100, payload: 'malformed-b'};
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, replacement);

    await stale.service.resetToSeed();

    const reset = strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY) as VirtualFileSystemSnapshot;
    expect(reset.version).toBe(1);
    expect(reset).not.toEqual(replacement as unknown as VirtualFileSystemSnapshot);
    expect(stale.service.isReady()).toBeTrue();
    expect(stale.service.hasRecoverableData()).toBeFalse();
  });

  it('does not let a revisionless recovery reset overwrite a newer valid snapshot', async () => {
    const strategy = new MemoryStorageStrategy();
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, {version: 99, payload: 'malformed'});
    const stale = createService(strategy);
    await stale.service.whenReady();

    const clean = createService();
    await clean.service.whenReady();
    const winner = structuredClone(
      clean.strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)
    ) as VirtualFileSystemSnapshot;
    winner.revision = 8;
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, winner);

    await expectAsync(stale.service.resetToSeed()).toBeRejectedWithError(/changed in another tab/);

    expect(strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)).toEqual(winner);
    expect(stale.service.isReady()).toBeTrue();
    expect(stale.service.hasRecoverableData()).toBeFalse();
  });

  it('does not apply a conflict reload after the authenticated identity changes', async () => {
    const strategy = new MemoryStorageStrategy();
    const users = new BehaviorSubject<{uid: string} | null>({uid: 'reader-a'});
    const first = createService(strategy, users);
    const second = createService(strategy, users);
    await Promise.all([first.service.whenReady(), second.service.whenReady()]);
    const firstProjects = childByName(first.service.getCurrentDirectory(), 'Projects');
    const staleProjects = childByName(second.service.getCurrentDirectory(), 'Projects');
    await first.service.createFolder(firstProjects.id, 'Account A Winner');

    const releaseGet = strategy.deferNextGet();
    const staleMutation = second.service.createFolder(staleProjects.id, 'Account A Loser');
    for (let attempt = 0; attempt < 20 && !strategy.getBlocked; attempt++) {
      await Promise.resolve();
    }
    expect(strategy.getBlocked).toBeTrue();
    users.next({uid: 'reader-b'});
    releaseGet();
    await staleMutation.catch(() => undefined);
    await second.service.whenReady();

    const accountBNames = childByName(second.service.getCurrentDirectory(), 'Projects')
      .children?.map((entry) => entry.name);
    expect(accountBNames).not.toContain('Account A Winner');
    expect(accountBNames).not.toContain('Account A Loser');
  });

  it('promotes a strictly invalid conflict winner into recovery state', async () => {
    const stale = createService();
    await stale.service.whenReady();
    const invalidWinner = structuredClone(
      stale.strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)
    ) as VirtualFileSystemSnapshot & {unexpected?: ArrayBuffer};
    invalidWinner.revision++;
    invalidWinner.unexpected = new ArrayBuffer(8);
    stale.strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, invalidWinner);

    await expectAsync(stale.service.createFolder('root', 'Stale Mutation')).toBeRejected();

    expect(stale.service.isReady()).toBeFalse();
    expect(stale.service.hasRecoverableData()).toBeTrue();
    expect(await stale.service.exportRecoveryData()).toContain('ArrayBuffer');
  });

  it('bounds derived duplicate and restore names at the maximum input length', async () => {
    const {service} = createService();
    await service.whenReady();
    const projects = childByName(service.getCurrentDirectory(), 'Projects');
    const maximumName = 'x'.repeat(120);
    const original = await service.createFolder(projects.id, maximumName);

    const duplicate = await service.duplicateEntry(original.id);
    expect(duplicate.name.length).toBeLessThanOrEqual(120);
    expect(duplicate.name).toContain(' copy');

    await service.moveToTrash(original.id);
    await service.createFolder(projects.id, maximumName);
    const restored = await service.restoreFromTrash(original.id);
    expect(restored.name.length).toBeLessThanOrEqual(120);
    expect(restored.name).toContain(' restored');
  });

  it('measures the snapshot storage bound in UTF-8 bytes', async () => {
    const seeded = createService();
    await seeded.service.whenReady();
    const persisted = structuredClone(
      seeded.strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)
    ) as VirtualFileSystemSnapshot;
    persisted.root.children = Array.from({length: 5_000}, (_, index): FileEntry => {
      const name = `${'界'.repeat(110)}-${index}`;
      return {
        id: `unicode-${index}`,
        name,
        path: `/${name}`,
        type: 'document',
        isDir: false,
        created: '2026-01-01T00:00:00.000Z',
        modified: '2026-01-01T00:00:00.000Z',
        parentId: 'root',
        tags: Array.from({length: 10}, (_, tagIndex) => `${'界'.repeat(21)}-${tagIndex}`),
      };
    });
    expect(JSON.stringify(persisted).length).toBeLessThan(5_000_000);
    expect(new TextEncoder().encode(JSON.stringify(persisted)).byteLength).toBeGreaterThan(5_000_000);
    seeded.strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, persisted);

    const restored = createService(seeded.strategy);
    await restored.service.whenReady();

    expect(restored.service.isReady()).toBeFalse();
    expect(restored.service.hasRecoverableData()).toBeTrue();
  });

  it('rejects an exhausted revision and safely rotates the token during recovery', async () => {
    const seeded = createService();
    await seeded.service.whenReady();
    const persisted = structuredClone(
      seeded.strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)
    ) as VirtualFileSystemSnapshot;
    persisted.revision = Number.MAX_SAFE_INTEGER;
    seeded.strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, persisted);
    const restored = createService(seeded.strategy);
    await restored.service.whenReady();

    expect(restored.service.isReady()).toBeFalse();
    expect(restored.service.hasRecoverableData()).toBeTrue();
    await restored.service.resetToSeed();

    const recovered = seeded.strategy.values.get(
      CORE_OS_FILE_SYSTEM_STORAGE_KEY
    ) as VirtualFileSystemSnapshot;
    expect(Number.isSafeInteger(recovered.revision)).toBeTrue();
    expect(recovered.revision).toBeGreaterThanOrEqual(0);
    expect(recovered.revision).toBeLessThan(Number.MAX_SAFE_INTEGER);
    await restored.service.createFolder('root', 'After Recovery');
  });

  it('rejects unknown structured-clone fields before cloning or persistence', async () => {
    const seeded = createService();
    await seeded.service.whenReady();
    const persisted = structuredClone(
      seeded.strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)
    ) as VirtualFileSystemSnapshot & {binary?: ArrayBuffer};
    persisted.binary = new ArrayBuffer(6_000_000);
    seeded.strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, persisted);

    const restored = createService(seeded.strategy);
    await restored.service.whenReady();

    expect(restored.service.isReady()).toBeFalse();
    expect(restored.service.hasRecoverableData()).toBeTrue();
    const backup = await restored.service.exportRecoveryData();
    expect(backup).toContain('ArrayBuffer');
    expect(backup).toContain('"complete":false');
  });

  it('rejects sparse snapshot arrays before canonical cloning', async () => {
    const seeded = createService();
    await seeded.service.whenReady();
    const persisted = structuredClone(
      seeded.strategy.values.get(CORE_OS_FILE_SYSTEM_STORAGE_KEY)
    ) as VirtualFileSystemSnapshot;
    const sparse = new Array<FileEntry>(2);
    sparse[1] = childByName(persisted.root, 'resume.pdf');
    persisted.root.children = sparse;
    seeded.strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, persisted);

    const restored = createService(seeded.strategy);
    await restored.service.whenReady();

    expect(restored.service.isReady()).toBeFalse();
    expect(restored.service.hasRecoverableData()).toBeTrue();
  });

  it('exports cyclic and BigInt recovery data without losing the reset path', async () => {
    const strategy = new MemoryStorageStrategy();
    const unsupported: {version: number; revision: number; count: bigint; self?: unknown} = {
      version: 99,
      revision: 7,
      count: 9n,
    };
    unsupported.self = unsupported;
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, unsupported);
    const {service} = createService(strategy);
    await service.whenReady();

    const backup = await service.exportRecoveryData();
    expect(backup).toContain('bigint');
    expect(backup).toContain('"$ref"');
    expect(backup).toContain('"complete":false');
    await service.resetToSeed();
    expect(service.isReady()).toBeTrue();
  });

  it('bounds recovery diagnostics with compact references and preserves prototype-named keys', async () => {
    const strategy = new MemoryStorageStrategy();
    const shared = {label: 'shared'};
    const unsupported: Record<string, unknown> = {
      version: 99,
      revision: 12,
      largeInteger: 1n << 100_000n,
    };
    Object.defineProperty(unsupported, '__proto__', {
      value: 'diagnostic-value',
      enumerable: true,
      configurable: true,
      writable: true,
    });
    unsupported['references'] = Array.from({length: 10_000}, () => shared);
    strategy.values.set(CORE_OS_FILE_SYSTEM_STORAGE_KEY, unsupported);
    const {service} = createService(strategy);
    await service.whenReady();

    const backup = await service.exportRecoveryData();
    expect(new TextEncoder().encode(backup).byteLength).toBeLessThanOrEqual(1_250_000);
    expect(backup).toContain('"$ref":');
    expect(backup).toContain('"__proto__":"diagnostic-value"');
    expect(backup).toContain('omitted for safe diagnostics');
    expect(backup).toContain('"complete":false');
  });

  it('duplicates a non-directory entry without persisting undefined optional fields', async () => {
    const {service} = createService();
    await service.whenReady();
    const resume = childByName(service.getCurrentDirectory(), 'resume.pdf');

    const duplicate = await service.duplicateEntry(resume.id);

    expect(duplicate.name).toBe('resume copy.pdf');
    expect(Object.prototype.hasOwnProperty.call(duplicate, 'children')).toBeFalse();
  });
});
