import {ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';
import {FileEntry, FileSystemService, VIEW_MODES} from '../file-system.service';
import {FINDER_FILE_OPENER} from '../file-opener';
import {FinderAppComponent} from './finder-app.component';

function folder(id: string, name: string, path: string, parentId?: string): FileEntry {
  return {
    id,
    name,
    path,
    parentId,
    type: 'folder',
    isDir: true,
    created: '2026-01-01T00:00:00.000Z',
    modified: '2026-01-01T00:00:00.000Z',
    tags: [],
    children: [],
  };
}

class FileSystemStub {
  readonly root = folder('root', '/', '/');
  readonly projects = folder('projects', 'Projects', '/Projects', 'root');
  readonly currentDir$ = new BehaviorSubject<FileEntry>(this.root);
  readonly selectedFile$ = new BehaviorSubject<FileEntry | undefined>(undefined);
  readonly viewMode$ = new BehaviorSubject(VIEW_MODES.list);
  readonly ready$ = new BehaviorSubject(true);
  readonly error$ = new BehaviorSubject<string | null>(null);
  readonly undoLabel$ = new BehaviorSubject<string | null>(null);
  readonly recoveryAvailable$ = new BehaviorSubject(false);
  sortBy: 'name' | 'type' | 'modified' = 'name';

  readonly createFolder = jasmine.createSpy('createFolder').and.callFake(async (parentId: string, name: string) => {
    const parent = this.requireEntry(parentId);
    const created = folder(`created-${name}`, name, `${parent.path}/${name}`.replace('//', '/'), parent.id);
    parent.children = [...(parent.children ?? []), created];
    this.currentDir$.next(this.currentDir$.value);
    return created;
  });
  readonly renameEntry = jasmine.createSpy('renameEntry').and.callFake(async (id: string, name: string) => ({
    ...this.requireEntry(id),
    name,
  }));
  readonly moveEntry = jasmine.createSpy('moveEntry').and.callFake(async (id: string) => this.requireEntry(id));
  readonly duplicateEntry = jasmine.createSpy('duplicateEntry').and.callFake(async (id: string) => this.requireEntry(id));
  readonly moveToTrash = jasmine.createSpy('moveToTrash').and.resolveTo();
  readonly restoreFromTrash = jasmine.createSpy('restoreFromTrash').and.callFake(async (id: string) => this.requireEntry(id));
  readonly deletePermanently = jasmine.createSpy('deletePermanently').and.resolveTo();
  readonly emptyTrash = jasmine.createSpy('emptyTrash').and.resolveTo();
  readonly setTags = jasmine.createSpy('setTags').and.callFake(async (id: string) => this.requireEntry(id));
  readonly undoLastMutation = jasmine.createSpy('undoLastMutation').and.resolveTo(true);
  readonly exportRecoveryData = jasmine.createSpy('exportRecoveryData').and.resolveTo('{}');
  readonly resetToSeed = jasmine.createSpy('resetToSeed').and.resolveTo();

  constructor() {
    this.root.children = [this.projects];
  }

  getFavoriteDirs() {
    return [
      {name: 'Home', path: '/'},
      {name: 'Projects', path: '/Projects'},
      {name: 'Trash', path: 'trash'},
    ];
  }

  getCurrentDirectory(): FileEntry {
    return this.currentDir$.value;
  }

  getDirectory(path: string): FileEntry | undefined {
    if (path === 'trash') {
      return this.currentDir$.value.path === 'trash'
        ? this.currentDir$.value
        : folder('trash', 'Trash', 'trash');
    }
    const find = (entry: FileEntry): FileEntry | undefined => {
      if (entry.path === path && entry.isDir) {
        return entry;
      }
      for (const child of entry.children ?? []) {
        const found = find(child);
        if (found) {
          return found;
        }
      }
      return undefined;
    };
    return find(this.root);
  }

  isTrashView(): boolean {
    return this.currentDir$.value.path === 'trash';
  }

  navigateTo(path: string): boolean {
    if (path === '/') {
      this.currentDir$.next(this.root);
      return true;
    }
    if (path === '/Projects') {
      this.currentDir$.next(this.projects);
      return true;
    }
    if (path === 'trash') {
      this.currentDir$.next(folder('trash', 'Trash', 'trash'));
      return true;
    }
    return false;
  }

  setViewMode(mode: VIEW_MODES): void {
    this.viewMode$.next(mode);
  }

  selectEntry(entry?: FileEntry): void {
    this.selectedFile$.next(entry);
  }

  sortFiles(
    entries: FileEntry[],
    order: 'asc' | 'desc' = 'asc',
    criterion: 'name' | 'type' | 'modified' = this.sortBy,
  ): FileEntry[] {
    const direction = order === 'asc' ? 1 : -1;
    return [...entries].sort((first, second) => (
      direction * String(first[criterion]).localeCompare(String(second[criterion]))
    ));
  }

  search(query?: string, withinId?: string): FileEntry[] {
    void query;
    void withinId;
    return [];
  }

  getFolderOptions(): FileEntry[] {
    return [this.root, this.projects];
  }

  private requireEntry(id: string): FileEntry {
    const find = (candidate: FileEntry): FileEntry | undefined => {
      if (candidate.id === id) {
        return candidate;
      }
      for (const child of candidate.children ?? []) {
        const found = find(child);
        if (found) {
          return found;
        }
      }
      return undefined;
    };
    const entry = find(this.root);
    if (!entry) {
      throw new Error('missing fixture entry');
    }
    return entry;
  }
}

class FileOpenerStub {
  readonly open = jasmine.createSpy('open').and.returnValue({status: 'unsupported'});
}

describe('FinderAppComponent', () => {
  let component: FinderAppComponent;
  let fixture: ComponentFixture<FinderAppComponent>;
  let fileSystem: FileSystemStub;
  let fileOpener: FileOpenerStub;

  beforeEach(async () => {
    fileSystem = new FileSystemStub();
    fileOpener = new FileOpenerStub();
    await TestBed.configureTestingModule({
      imports: [FinderAppComponent],
      providers: [
        {provide: FileSystemService, useValue: fileSystem},
        {provide: FINDER_FILE_OPENER, useValue: fileOpener},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FinderAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders named navigation, organization, search, and view controls', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLButtonElement>('button[aria-label="Go back"]')?.disabled).toBeTrue();
    expect(element.querySelector('input[type="search"]')).not.toBeNull();
    expect(element.querySelector('button[aria-label="List view"]')?.getAttribute('aria-pressed')).toBe('true');
    expect([...element.querySelectorAll('button')].map((button) => button.textContent?.trim()))
      .toContain('New Folder');
  });

  it('announces bounded search result counts', () => {
    component.selectEntry(fileSystem.projects);
    component.updateSearch('missing');
    expect(component.statusMessage).toBe('No items match your search.');
    expect(component.selectedFile).toBeUndefined();

    component.updateSearch('');
    expect(component.statusMessage).toBe('Search cleared. 1 item in this folder.');
  });

  it('selects on one click and opens a folder on double click', () => {
    const entry = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.finder-entry');
    entry?.click();
    fixture.detectChanges();

    expect(component.selectedFile?.id).toBe('projects');
    expect(component.currentPath).toBe('/');
    expect(entry?.getAttribute('aria-selected')).toBe('true');
    expect(entry?.tabIndex).toBe(0);

    entry?.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    fixture.detectChanges();
    expect(component.currentPath).toBe('/Projects');
  });

  it('opens supported files through the registered application and reports unsupported files', () => {
    const notes = {
      ...folder('notes', 'Release Notes.md', '/Release Notes.md', 'root'),
      isDir: false,
      type: 'document',
      mimeType: 'text/markdown',
      children: undefined,
    };
    fileOpener.open.and.returnValue({
      status: 'metadata-preview-launched',
      appId: 'markdown-reader',
      appTitle: 'Markdown Reader',
    });

    component.activateEntry(notes);

    expect(fileOpener.open).toHaveBeenCalledOnceWith({
      file: {
        id: 'notes',
        name: 'Release Notes.md',
        virtualPath: '/Release Notes.md',
        type: 'document',
        mimeType: 'text/markdown',
      },
      content: {kind: 'metadata-only'},
    });
    expect(component.statusMessage).toBe(
      'Opened a metadata preview for Release Notes.md in Markdown Reader. No file contents are attached.'
    );

    fileOpener.open.calls.reset();
    const preventDefault = jasmine.createSpy('preventDefault');
    component.handleEntryKeydown({key: 'Enter', preventDefault} as unknown as KeyboardEvent, notes, fileSystem.root);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(fileOpener.open).toHaveBeenCalledTimes(1);

    fileOpener.open.calls.reset();
    fileOpener.open.and.returnValue({status: 'unsupported'});
    component.activateEntry({...notes, id: 'photo', name: 'photo.jpg', path: '/photo.jpg', type: 'image'});
    expect(component.statusMessage).toBe('No installed application can open photo.jpg.');
  });

  it('keeps folders in Trash inert until they are restored', () => {
    const trashedFolder = folder('trashed-folder', 'Archived Project', '/Projects/Archived Project', 'trash');
    component.navigate('trash');
    const trash = fileSystem.currentDir$.value;
    trash.children = [trashedFolder];
    fileSystem.currentDir$.next(trash);

    component.activateEntry(trashedFolder);

    expect(fileOpener.open).not.toHaveBeenCalled();
    expect(component.currentPath).toBe('trash');
    expect(component.statusMessage).toBe('Archived Project must be put back before it can be opened.');
  });

  it('opens folders with Enter and moves roving focus with arrow keys', fakeAsync(() => {
    fileSystem.root.children = [
      fileSystem.projects,
      folder('documents', 'Documents', '/Documents', 'root'),
    ];
    fileSystem.currentDir$.next(fileSystem.root);
    fixture.detectChanges();
    const entries = [...(fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.finder-entry')];

    const documentsEntry = entries.find((entry) => entry.dataset['finderEntryId'] === 'documents');
    const projectsEntry = entries.find((entry) => entry.dataset['finderEntryId'] === 'projects');
    documentsEntry?.focus();
    documentsEntry?.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
    fixture.detectChanges();
    tick(16);
    expect(component.selectedFile?.id).toBe('projects');
    expect(document.activeElement).toBe(projectsEntry as HTMLButtonElement);

    projectsEntry?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    fixture.detectChanges();
    tick(16);
    expect(component.currentPath).toBe('/Projects');
    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector('section[aria-label="Finder"]')
    );
  }));

  it('moves grid focus vertically by the rendered column count', fakeAsync(() => {
    fileSystem.root.children = [
      folder('alpha', 'Alpha', '/Alpha', 'root'),
      folder('bravo', 'Bravo', '/Bravo', 'root'),
      folder('charlie', 'Charlie', '/Charlie', 'root'),
      folder('delta', 'Delta', '/Delta', 'root'),
    ];
    fileSystem.currentDir$.next(fileSystem.root);
    component.setViewMode(VIEW_MODES.grid);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const grid = element.querySelector<HTMLElement>('[data-finder-view="grid"]');
    if (grid) {
      grid.style.gridTemplateColumns = '100px 100px';
    }
    const alpha = element.querySelector<HTMLElement>('[data-finder-entry-id="alpha"]');
    alpha?.focus();
    alpha?.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
    fixture.detectChanges();
    tick(16);

    expect(component.selectedFile?.id).toBe('charlie');
    expect(document.activeElement).toBe(
      element.querySelector('[data-finder-entry-id="charlie"]')
    );
  }));

  it('creates a persisted folder through the accessible dialog workflow', async () => {
    component.openNewFolderDialog();
    component.dialogValue = 'Launch Notes';
    fixture.detectChanges();
    await component.submitDialog();
    fixture.detectChanges();

    expect(fileSystem.createFolder).toHaveBeenCalledWith('root', 'Launch Notes');
    expect(component.selectedFile?.name).toBe('Launch Notes');
    expect(component.dialogMode).toBeNull();
  });

  it('honors a Trash launch parameter after Finder is ready', async () => {
    component.params = {path: 'trash'};
    await Promise.resolve();
    fixture.detectChanges();

    expect(component.currentPath).toBe('trash');
    expect(component.isTrashView).toBeTrue();
  });

  it('maps macOS-style keyboard shortcuts without intercepting text inputs', () => {
    const newFolder = new KeyboardEvent('keydown', {key: 'n', metaKey: true, shiftKey: true});
    component.handleKeydown(newFolder);
    expect(component.dialogMode).toBe('new-folder');

    component.closeDialog();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="search"]');
    const typing = new KeyboardEvent('keydown', {key: 'n', metaKey: true, shiftKey: true});
    Object.defineProperty(typing, 'target', {value: input});
    component.handleKeydown(typing);
    expect(component.dialogMode).toBeNull();
  });

  it('contains destructive dialog focus and restores the launcher', fakeAsync(() => {
    fileSystem.recoveryAvailable$.next(true);
    fileSystem.error$.next('Stored Finder data is unreadable.');
    fixture.detectChanges();
    const launcher = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Reset Finder'));
    launcher?.focus();
    launcher?.click();
    fixture.detectChanges();
    tick(16);

    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector<HTMLFormElement>('[role="dialog"]');
    const cancel = [...(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find((button) => button.textContent?.trim() === 'Cancel');
    const submit = dialog?.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(dialog).not.toBeNull();
    expect(element.querySelector('aside')?.hasAttribute('inert')).toBeTrue();
    expect(document.activeElement).toBe(cancel as HTMLButtonElement);
    expect(dialog?.getAttribute('aria-describedby')).toBe(component.dialogDescriptionId);
    expect(dialog?.getAttribute('aria-labelledby')).toBe(component.dialogTitleId);

    submit?.focus();
    submit?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}));
    expect(document.activeElement).toBe(cancel as HTMLButtonElement);

    cancel?.click();
    fixture.detectChanges();
    tick(16);
    expect(component.dialogMode).toBeNull();
    expect(document.activeElement).toBe(launcher as HTMLButtonElement);
  }));

  it('moves focus to a remaining Trash option after permanent deletion', fakeAsync(() => {
    const first = {...folder('first', 'First', '/First', 'root'), isDir: false, type: 'document', children: undefined};
    const second = {...folder('second', 'Second', '/Second', 'root'), isDir: false, type: 'document', children: undefined};
    const trash = folder('trash', 'Trash', 'trash');
    trash.children = [first, second];
    fileSystem.currentDir$.next(trash);
    component.navigate('trash');
    component.selectEntry(first);
    fileSystem.deletePermanently.and.callFake(async () => {
      trash.children = [second];
      fileSystem.currentDir$.next(trash);
      fileSystem.selectedFile$.next(undefined);
    });
    fixture.detectChanges();

    const launcher = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Delete Permanently'));
    launcher?.focus();
    launcher?.click();
    fixture.detectChanges();
    tick(16);
    void component.submitDialog();
    flushMicrotasks();
    fixture.detectChanges();
    tick(16);

    const remaining = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-finder-entry-id="second"]');
    expect(document.activeElement).toBe(remaining);
  }));

  it('keeps recovery controls visible and focuses Reset after downloading a backup', fakeAsync(() => {
    fileSystem.recoveryAvailable$.next(true);
    fileSystem.error$.next('Stored Finder data is unreadable.');
    const createObjectUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:finder-backup');
    const revokeObjectUrl = spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');
    fixture.detectChanges();

    void component.downloadRecoveryBackup();
    flushMicrotasks();
    fixture.detectChanges();
    tick(16);

    const reset = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Reset Finder'));
    expect(component.errorMessage).toBe('Stored Finder data is unreadable.');
    expect(component.recoveryAvailable).toBeTrue();
    expect(reset).not.toBeUndefined();
    expect(document.activeElement).toBe(reset as HTMLButtonElement);
    expect(createObjectUrl).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:finder-backup');
  }));

  it('moves focus after keyboard Trash and toolbar Put Back remove an option', fakeAsync(() => {
    const first = {...folder('first', 'First', '/First', 'root'), isDir: false, type: 'document', children: undefined};
    const second = {...folder('second', 'Second', '/Second', 'root'), isDir: false, type: 'document', children: undefined};
    fileSystem.root.children = [first, second];
    fileSystem.moveToTrash.and.callFake(async () => {
      fileSystem.root.children = [second];
      fileSystem.currentDir$.next(fileSystem.root);
    });
    component.selectEntry(first);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-finder-entry-id="first"]')?.focus();

    component.handleKeydown(new KeyboardEvent('keydown', {key: 'Backspace', metaKey: true}));
    flushMicrotasks();
    fixture.detectChanges();
    tick(16);
    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector('[data-finder-entry-id="second"]')
    );

    const trash = folder('trash', 'Trash', 'trash');
    trash.children = [first, second];
    fileSystem.currentDir$.next(trash);
    component.navigate('trash');
    component.selectEntry(first);
    fileSystem.restoreFromTrash.and.callFake(async () => {
      trash.children = [second];
      fileSystem.currentDir$.next(trash);
      return first;
    });
    fixture.detectChanges();
    const putBack = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Put Back');
    putBack?.focus();
    putBack?.click();
    flushMicrotasks();
    fixture.detectChanges();
    tick(16);
    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector('[data-finder-entry-id="second"]')
    );
  }));

  it('generates unique dialog label IDs for concurrent Finder instances', () => {
    const secondFixture = TestBed.createComponent(FinderAppComponent);
    expect(secondFixture.componentInstance.dialogTitleId).not.toBe(component.dialogTitleId);
    expect(secondFixture.componentInstance.sortControlId).not.toBe(component.sortControlId);
    secondFixture.destroy();
  });

  it('keeps navigation and dialog targets independent across Finder windows', async () => {
    component.openNewFolderDialog();
    component.dialogValue = 'Window A Folder';
    const secondFixture = TestBed.createComponent(FinderAppComponent);
    const second = secondFixture.componentInstance;
    secondFixture.detectChanges();

    second.navigate('/Projects');
    second.selectEntry(fileSystem.projects);
    await component.submitDialog();

    expect(fileSystem.createFolder).toHaveBeenCalledWith('root', 'Window A Folder');
    expect(component.currentPath).toBe('/');
    expect(second.currentPath).toBe('/Projects');
    expect(component.navHistory).toEqual(['/']);
    expect(second.navHistory).toEqual(['/', '/Projects']);
    secondFixture.destroy();
  });

  it('refreshes both Finder windows from a shared filesystem mutation signal', async () => {
    component.navigate('/Projects');
    const secondFixture = TestBed.createComponent(FinderAppComponent);
    const second = secondFixture.componentInstance;
    second.navigate('/Projects');
    second.openNewFolderDialog();
    second.dialogValue = 'Shared Change';
    secondFixture.detectChanges();

    await second.submitDialog();
    fixture.detectChanges();

    const firstNames = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.finder-entry')]
      .map((entry) => entry.textContent);
    expect(firstNames.some((name) => name?.includes('Shared Change'))).toBeTrue();
    expect(component.currentPath).toBe('/Projects');
    expect(second.currentPath).toBe('/Projects');
    secondFixture.destroy();
  });

  it('restores focus when another Finder removes its focused entry', fakeAsync(() => {
    const first = folder('first', 'First', '/First', 'root');
    const second = folder('second', 'Second', '/Second', 'root');
    fileSystem.root.children = [first, second];
    fileSystem.currentDir$.next(fileSystem.root);
    fixture.detectChanges();
    const firstButton = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-finder-entry-id="first"]');
    component.selectEntry(first);
    firstButton?.focus();

    fileSystem.root.children = [second];
    fileSystem.currentDir$.next(fileSystem.root);
    fixture.detectChanges();
    tick(16);

    const secondButton = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-finder-entry-id="second"]');
    expect(component.selectedFile?.id).toBe('second');
    expect(document.activeElement).toBe(secondButton);
  }));

  it('keeps a selected nested search result through a shared refresh', fakeAsync(() => {
    const nested = {...folder('nested', 'Launch Notes', '/Projects/Launch Notes', 'projects'), isDir: false, type: 'text', children: undefined};
    fileSystem.projects.children = [nested];
    spyOn(fileSystem, 'search').and.callFake((query?: string) => (
      query?.trim().toLocaleLowerCase() === 'launch' ? [nested] : []
    ));
    component.searchTerm = 'launch';
    fixture.detectChanges();
    component.selectEntry(nested);
    fixture.detectChanges();
    const nestedButton = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-finder-entry-id="nested"]');
    nestedButton?.focus();

    fileSystem.currentDir$.next(fileSystem.root);
    fixture.detectChanges();
    tick(16);

    expect(component.selectedFile?.id).toBe('nested');
    expect(document.activeElement).toBe(nestedButton);
    expect(nestedButton?.getAttribute('aria-selected')).toBe('true');
    expect(nestedButton?.getAttribute('tabindex')).toBe('0');
  }));

  it('restores focus when a shared refresh disables the focused selection action', fakeAsync(() => {
    const first = folder('first', 'First', '/First', 'root');
    const second = folder('second', 'Second', '/Second', 'root');
    fileSystem.root.children = [first, second];
    fileSystem.currentDir$.next(fileSystem.root);
    component.selectEntry(first);
    fixture.detectChanges();
    const trash = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Trash' && !button.disabled);
    trash?.focus();

    fileSystem.root.children = [second];
    fileSystem.currentDir$.next(fileSystem.root);
    fixture.detectChanges();
    tick(16);

    expect(component.selectedFile).toBeUndefined();
    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector('[data-finder-entry-id="second"]')
    );
  }));

  it('keeps sorting criteria independent across Finder windows', () => {
    const alpha = {...folder('alpha', 'Alpha', '/Alpha', 'root'), isDir: false, type: 'code', children: undefined};
    const zulu = {...folder('zulu', 'Zulu', '/Zulu', 'root'), isDir: false, type: 'audio', children: undefined};
    fileSystem.root.children = [zulu, alpha];
    const secondFixture = TestBed.createComponent(FinderAppComponent);
    const second = secondFixture.componentInstance;

    component.setSortBy('name');
    second.setSortBy('type');

    expect(component.visibleEntries(fileSystem.root).map((entry) => entry.id)).toEqual(['alpha', 'zulu']);
    expect(second.visibleEntries(fileSystem.root).map((entry) => entry.id)).toEqual(['zulu', 'alpha']);
    secondFixture.destroy();
  });

  it('submits the item captured when a dialog opened after a shared refresh', async () => {
    const first = folder('first', 'First', '/First', 'root');
    const secondEntry = folder('second', 'Second', '/Second', 'root');
    fileSystem.root.children = [first, secondEntry];
    component.selectEntry(first);
    component.openRenameDialog();
    component.dialogValue = 'Renamed First';

    fileSystem.currentDir$.next(fileSystem.root);
    const secondFixture = TestBed.createComponent(FinderAppComponent);
    secondFixture.componentInstance.selectEntry(secondEntry);
    await component.submitDialog();

    expect(fileSystem.renameEntry).toHaveBeenCalledWith('first', 'Renamed First');
    secondFixture.destroy();
  });

  it('clears account-local window and dialog state and restores focus when Finder becomes unavailable', fakeAsync(() => {
    component.navigate('/Projects');
    component.searchTerm = 'private';
    component.selectEntry(fileSystem.projects);
    component.openRenameDialog();
    fixture.detectChanges();
    tick(16);
    expect((document.activeElement as HTMLElement)?.tagName).toBe('INPUT');

    fileSystem.ready$.next(false);
    fixture.detectChanges();
    tick(16);

    expect(component.currentPath).toBe('/');
    expect(component.navHistory).toEqual(['/']);
    expect(component.navIndex).toBe(0);
    expect(component.searchTerm).toBe('');
    expect(component.selectedFile).toBeUndefined();
    expect(component.dialogMode).toBeNull();
    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector('section[aria-label="Finder"]')
    );
  }));

  it('restores account-change focus only for the Finder instance that owned it', fakeAsync(() => {
    const secondFixture = TestBed.createComponent(FinderAppComponent);
    const second = secondFixture.componentInstance;
    second.selectEntry(fileSystem.projects);
    second.openRenameDialog();
    secondFixture.detectChanges();
    const activeEntry = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-finder-entry-id="projects"]');
    const firstRoot = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('section[aria-label="Finder"]');
    const secondRoot = (secondFixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('section[aria-label="Finder"]');
    const firstFocus = spyOn(firstRoot as HTMLElement, 'focus');
    const secondFocus = spyOn(secondRoot as HTMLElement, 'focus');
    spyOnProperty(document, 'activeElement', 'get').and.returnValue(activeEntry as HTMLElement);

    fileSystem.ready$.next(false);
    fixture.detectChanges();
    secondFixture.detectChanges();
    tick(32);

    expect(firstFocus).toHaveBeenCalled();
    expect(secondFocus).not.toHaveBeenCalled();
    expect(second.dialogMode).toBeNull();
    secondFixture.destroy();
  }));

  it('announces initial loading as busy before an unavailable error arrives', () => {
    fileSystem.ready$.next(false);
    fileSystem.error$.next(null);
    const loadingFixture = TestBed.createComponent(FinderAppComponent);
    loadingFixture.detectChanges();

    const root = (loadingFixture.nativeElement as HTMLElement)
      .querySelector('section[aria-label="Finder"]');
    expect(loadingFixture.componentInstance.statusMessage).toBe('Loading Finder…');
    expect(loadingFixture.componentInstance.loading).toBeTrue();
    expect(root?.getAttribute('aria-busy')).toBe('true');

    fileSystem.error$.next('Sign in to use Finder.');
    loadingFixture.detectChanges();
    expect(loadingFixture.componentInstance.statusMessage).toBe('Finder is unavailable.');
    expect(loadingFixture.componentInstance.loading).toBeFalse();
    expect(root?.getAttribute('aria-busy')).toBe('false');
    loadingFixture.destroy();
  });
});
