import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {
  faArrowRotateLeft,
  faChevronLeft,
  faChevronRight,
  faCopy,
  faFile,
  faFolder,
  faList,
  faPen,
  faPlus,
  faSearch,
  faTableCellsLarge,
  faTableColumns,
  faTag,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {BehaviorSubject} from 'rxjs';
import {FinderWindowComponent} from '../finder-window/finder-window.component';
import {FileEntry, FileSystemService, VIEW_MODES} from '../file-system.service';

type FinderDialogMode = 'new-folder' | 'rename' | 'move' | 'tags' | 'delete' | 'empty-trash' | 'reset';

interface FinderParams {
  path?: string;
}

interface Breadcrumb {
  label: string;
  path: string;
}

@Component({
  selector: 'app-finder-app',
  standalone: true,
  imports: [CommonModule, FinderWindowComponent, FormsModule, FontAwesomeModule],
  templateUrl: './finder-app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }

    .finder-control {
      min-height: 2rem;
      border-radius: 0.375rem;
    }

    .finder-control:focus-visible,
    .finder-entry:focus-visible {
      outline: 2px solid rgb(96 165 250);
      outline-offset: 1px;
    }

    .finder-entry-selected {
      background: rgb(37 99 235 / 0.78);
      color: white;
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        scroll-behavior: auto !important;
      }
    }
  `,
})
export class FinderAppComponent {
  private static nextInstanceId = 0;

  @ViewChild('finderRoot') private finderRoot?: ElementRef<HTMLElement>;
  @ViewChild('dialogPanel') private dialogPanel?: ElementRef<HTMLFormElement>;
  @ViewChild('dialogInput') private dialogInput?: ElementRef<HTMLInputElement | HTMLSelectElement>;
  @ViewChild('dialogCancel') private dialogCancel?: ElementRef<HTMLButtonElement>;
  @ViewChild('recoveryReset') private recoveryReset?: ElementRef<HTMLButtonElement>;

  currentPath = '/';
  navHistory: string[] = ['/'];
  navIndex = 0;
  sortBy: 'name' | 'type' | 'modified' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  viewMode = VIEW_MODES.list;
  searchTerm = '';
  selectedFile?: FileEntry;
  ready = false;
  loading = true;
  busy = false;
  statusMessage = 'Loading Finder…';
  errorMessage: string | null = null;
  undoLabel: string | null = null;
  recoveryAvailable = false;
  dialogMode: FinderDialogMode | null = null;
  dialogValue = '';
  moveTargetId = 'root';
  moveTargets: FileEntry[] = [];
  private readonly instanceId = ++FinderAppComponent.nextInstanceId;
  readonly dialogTitleId = `finder-dialog-title-${this.instanceId}`;
  readonly dialogDescriptionId = `${this.dialogTitleId}-description`;
  readonly sortControlId = `finder-sort-${this.instanceId}`;

  private pendingParams?: FinderParams;
  private dialogRestoreTarget?: HTMLElement;
  private dialogTargetId?: string;
  private dialogTargetName = '';
  private dialogParentId?: string;
  private readonly currentDirectorySubject: BehaviorSubject<FileEntry>;
  private readonly currentDirectory$;

  set params(value: unknown) {
    this.pendingParams = this.parseParams(value);
    void this.openPendingPath();
  }

  get favoriteDirs() {
    return this.fileSystemService.getFavoriteDirs();
  }

  getCurrentDir() {
    return this.currentDirectory$;
  }

  get isTrashView(): boolean {
    return this.currentPath === 'trash';
  }

  get dialogEntryName(): string {
    return this.dialogTargetName;
  }

  get dialogTitle(): string {
    switch (this.dialogMode) {
      case 'new-folder': return 'New Folder';
      case 'rename': return 'Rename Item';
      case 'move': return 'Move Item';
      case 'tags': return 'Edit Tags';
      case 'delete': return 'Delete Permanently?';
      case 'empty-trash': return 'Empty Trash?';
      case 'reset': return 'Reset Finder Data?';
      default: return 'Finder Action';
    }
  }

  get dialogSubmitLabel(): string {
    switch (this.dialogMode) {
      case 'new-folder': return 'Create';
      case 'rename': return 'Rename';
      case 'move': return 'Move';
      case 'tags': return 'Save Tags';
      case 'delete': return 'Delete';
      case 'empty-trash': return 'Empty Trash';
      case 'reset': return 'Reset Finder';
      default: return 'Save';
    }
  }

  get dialogDescribedBy(): string | null {
    return this.dialogMode === 'delete' || this.dialogMode === 'empty-trash' || this.dialogMode === 'reset'
      ? this.dialogDescriptionId
      : null;
  }

  get breadcrumbs(): Breadcrumb[] {
    if (this.currentPath === 'trash') {
      return [{label: 'Trash', path: 'trash'}];
    }
    if (this.currentPath === '/') {
      return [{label: 'Home', path: '/'}];
    }
    const parts = this.currentPath.split('/').filter(Boolean);
    return [
      {label: 'Home', path: '/'},
      ...parts.map((part, index) => ({
        label: part,
        path: `/${parts.slice(0, index + 1).join('/')}`,
      })),
    ];
  }

  constructor(
    private readonly fileSystemService: FileSystemService,
    private readonly destroyRef: DestroyRef,
  ) {
    this.currentDirectorySubject = new BehaviorSubject<FileEntry>(
      this.fileSystemService.getDirectory('/') ?? this.fileSystemService.getCurrentDirectory()
    );
    this.currentDirectory$ = this.currentDirectorySubject.asObservable();
    this.fileSystemService.currentDir$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.ready) {
          this.refreshDirectory();
        }
      });
    this.fileSystemService.viewMode$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mode) => this.viewMode = mode);
    this.fileSystemService.ready$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ready) => {
        this.ready = ready;
        if (ready) {
          this.loading = false;
          this.refreshDirectory();
          this.statusMessage = 'Finder is ready.';
          void this.openPendingPath();
        } else {
          this.resetWindowStateForUnavailableFileSystem();
        }
      });
    this.fileSystemService.error$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        this.errorMessage = message;
        if (message && !this.ready) {
          this.loading = false;
          this.statusMessage = 'Finder is unavailable.';
        }
      });
    this.fileSystemService.undoLabel$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((label) => this.undoLabel = label);
    this.fileSystemService.recoveryAvailable$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((available) => this.recoveryAvailable = available);
  }

  goBack(): void {
    if (this.navIndex <= 0) {
      return;
    }
    this.navIndex--;
    this.navigateFromHistory(this.navHistory[this.navIndex]);
  }

  goForward(): void {
    if (this.navIndex >= this.navHistory.length - 1) {
      return;
    }
    this.navIndex++;
    this.navigateFromHistory(this.navHistory[this.navIndex]);
  }

  navigate(path: string): void {
    const target = this.fileSystemService.getDirectory(path);
    if (!target) {
      this.errorMessage = 'That folder is no longer available.';
      return;
    }
    this.currentDirectorySubject.next(target);
    this.currentPath = target.path;
    this.selectedFile = undefined;
    if (this.navHistory[this.navIndex] === target.path) {
      return;
    }
    this.navHistory = this.navHistory.slice(0, this.navIndex + 1);
    this.navHistory.push(target.path);
    this.navIndex = this.navHistory.length - 1;
    this.searchTerm = '';
    this.statusMessage = `Opened ${this.locationLabel(target.path)}.`;
  }

  setViewMode(mode: VIEW_MODES): void {
    this.fileSystemService.setViewMode(mode);
  }

  setSortBy(value: 'name' | 'type' | 'modified'): void {
    this.sortBy = value;
    this.fileSystemService.sortBy = value;
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  visibleEntries(directory: FileEntry): FileEntry[] {
    let entries = directory.children ?? [];
    if (this.searchTerm.trim()) {
      entries = this.isTrashView
        ? entries.filter((entry) => this.matchesSearch(entry, this.searchTerm))
        : this.fileSystemService.search(this.searchTerm, directory.id);
    }
    return this.fileSystemService.sortFiles(entries, this.sortOrder, this.sortBy);
  }

  updateSearch(value: string): void {
    this.searchTerm = value;
    const entries = this.visibleEntries(this.currentDirectorySubject.value);
    if (this.selectedFile && !entries.some((entry) => entry.id === this.selectedFile?.id)) {
      this.selectedFile = undefined;
    }
    const count = entries.length;
    if (!value.trim()) {
      this.statusMessage = `Search cleared. ${this.describeItemCount(count)} in this folder.`;
      return;
    }
    this.statusMessage = count === 0
      ? 'No items match your search.'
      : `${this.describeItemCount(count)} match your search.`;
  }

  entryTabIndex(entry: FileEntry, directory: FileEntry): number {
    const entries = this.visibleEntries(directory);
    const selectedIsVisible = entries.some((candidate) => candidate.id === this.selectedFile?.id);
    return entry.id === this.selectedFile?.id || (!selectedIsVisible && entries[0]?.id === entry.id) ? 0 : -1;
  }

  selectEntry(entry: FileEntry): void {
    this.selectedFile = entry;
    this.statusMessage = `${entry.name} selected.`;
  }

  activateEntry(entry: FileEntry): void {
    this.selectEntry(entry);
    if (entry.isDir && !this.isTrashView) {
      this.navigate(entry.path);
      requestAnimationFrame(() => this.focusFirstEntryOrRoot());
      return;
    }
    if (!entry.isDir) {
      this.statusMessage = `${entry.name} selected. File opening is planned for the next Finder integration phase.`;
    }
  }

  openNewFolderDialog(): void {
    if (!this.ready || this.isTrashView) {
      return;
    }
    this.openDialog('new-folder', 'Untitled Folder');
  }

  openRenameDialog(): void {
    if (!this.selectedFile || this.isTrashView) {
      return;
    }
    this.openDialog('rename', this.selectedFile.name);
  }

  openMoveDialog(): void {
    if (!this.selectedFile || this.isTrashView) {
      return;
    }
    this.moveTargets = this.fileSystemService.getFolderOptions(this.selectedFile.id);
    this.moveTargetId = this.selectedFile.parentId ?? 'root';
    this.openDialog('move');
  }

  openTagsDialog(): void {
    if (!this.selectedFile) {
      return;
    }
    this.openDialog('tags', this.selectedFile.tags.join(', '));
  }

  openDeleteDialog(): void {
    if (this.selectedFile && this.isTrashView) {
      this.openDialog('delete');
    }
  }

  openEmptyTrashDialog(): void {
    if (this.isTrashView && (this.currentDirectorySubject.value.children?.length ?? 0) > 0) {
      this.openDialog('empty-trash');
    }
  }

  openResetDialog(): void {
    if (this.recoveryAvailable) {
      this.openDialog('reset');
    }
  }

  async downloadRecoveryBackup(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    try {
      const contents = await this.fileSystemService.exportRecoveryData();
      const url = URL.createObjectURL(new Blob([contents], {type: 'application/json'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = `finder-recovery-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      this.statusMessage = 'Downloaded a local Finder recovery diagnostic.';
    } catch (error) {
      this.errorMessage = this.describeError(error);
    } finally {
      this.busy = false;
      requestAnimationFrame(() => (
        this.recoveryReset?.nativeElement ?? this.finderRoot?.nativeElement
      )?.focus());
    }
  }

  closeDialog(): void {
    if (this.busy) {
      return;
    }
    this.dismissDialog();
  }

  async submitDialog(): Promise<void> {
    const mode = this.dialogMode;
    if (!mode || this.busy) {
      return;
    }
    this.busy = true;
    this.errorMessage = null;
    try {
      let result: FileEntry | undefined;
      switch (mode) {
        case 'new-folder':
          result = await this.fileSystemService.createFolder(
            this.requireDialogParentId(),
            this.dialogValue,
          );
          break;
        case 'rename':
          result = await this.fileSystemService.renameEntry(this.requireDialogTargetId(), this.dialogValue);
          break;
        case 'move':
          result = await this.fileSystemService.moveEntry(this.requireDialogTargetId(), this.moveTargetId);
          break;
        case 'tags':
          result = await this.fileSystemService.setTags(
            this.requireDialogTargetId(),
            this.dialogValue.split(','),
          );
          break;
        case 'delete':
          await this.fileSystemService.deletePermanently(this.requireDialogTargetId());
          break;
        case 'empty-trash':
          await this.fileSystemService.emptyTrash();
          break;
        case 'reset':
          await this.fileSystemService.resetToSeed();
          break;
      }
      this.refreshDirectory(result?.id);
      this.statusMessage = `${this.dialogSubmitLabel} completed.`;
      this.dismissDialog();
    } catch (error) {
      this.errorMessage = this.describeError(error);
    } finally {
      this.busy = false;
    }
  }

  async duplicateSelected(): Promise<void> {
    if (!this.selectedFile || this.isTrashView) {
      return;
    }
    await this.runAction(
      () => this.fileSystemService.duplicateEntry(this.requireSelected().id),
      'Duplicated item.',
    );
  }

  async moveSelectedToTrash(): Promise<void> {
    if (!this.selectedFile || this.isTrashView) {
      return;
    }
    await this.runAction(
      () => this.fileSystemService.moveToTrash(this.requireSelected().id),
      'Moved item to Trash.',
      true,
    );
  }

  async restoreSelected(): Promise<void> {
    if (!this.selectedFile || !this.isTrashView) {
      return;
    }
    await this.runAction(
      () => this.fileSystemService.restoreFromTrash(this.requireSelected().id),
      'Put item back.',
      true,
    );
  }

  async undo(): Promise<void> {
    if (!this.undoLabel || this.busy) {
      return;
    }
    await this.runAction(
      () => this.fileSystemService.undoLastMutation(),
      `Undid ${this.undoLabel}.`,
    );
  }

  handleKeydown(event: KeyboardEvent): void {
    if (this.dialogMode) {
      if (event.key === 'Escape' && !this.busy) {
        event.preventDefault();
        this.closeDialog();
      }
      return;
    }
    if (this.isEditableTarget(event.target)) {
      return;
    }
    if (event.metaKey && event.shiftKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      this.openNewFolderDialog();
      return;
    }
    if (event.metaKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      void this.undo();
      return;
    }
    if (event.metaKey && event.key === 'Backspace') {
      event.preventDefault();
      void this.moveSelectedToTrash();
    }
  }

  handleDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !this.busy) {
      event.preventDefault();
      event.stopPropagation();
      this.closeDialog();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = this.getDialogFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1) ?? first;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  handleEntryKeydown(event: KeyboardEvent, entry: FileEntry, directory: FileEntry): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.activateEntry(entry);
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      this.selectEntry(entry);
      return;
    }

    const entries = this.visibleEntries(directory);
    const currentIndex = entries.findIndex((candidate) => candidate.id === entry.id);
    let targetIndex: number | undefined;
    const gridColumns = this.viewMode === VIEW_MODES.grid ? this.getRenderedGridColumnCount() : 1;
    switch (event.key) {
      case 'ArrowDown':
        targetIndex = Math.min(entries.length - 1, currentIndex + gridColumns);
        break;
      case 'ArrowRight':
        targetIndex = Math.min(entries.length - 1, currentIndex + 1);
        break;
      case 'ArrowUp':
        targetIndex = Math.max(0, currentIndex - gridColumns);
        break;
      case 'ArrowLeft':
        targetIndex = Math.max(0, currentIndex - 1);
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = entries.length - 1;
        break;
      default:
        return;
    }
    const target = entries[targetIndex];
    if (!target) {
      return;
    }
    event.preventDefault();
    this.selectEntry(target);
    requestAnimationFrame(() => this.focusEntry(target.id));
  }

  trackById(_: number, file: FileEntry): string {
    return file.id;
  }

  formatEntryKind(entry: FileEntry): string {
    return entry.isDir ? 'Folder' : entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
  }

  private navigateFromHistory(path: string): void {
    const target = this.fileSystemService.getDirectory(path);
    if (!target) {
      this.errorMessage = 'That folder is no longer available.';
      return;
    }
    this.currentDirectorySubject.next(target);
    this.currentPath = target.path;
    this.selectedFile = undefined;
    this.searchTerm = '';
    this.statusMessage = `Opened ${this.locationLabel(target.path)}.`;
  }

  private openDialog(mode: FinderDialogMode, value = ''): void {
    this.dialogRestoreTarget = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : this.finderRoot?.nativeElement;
    this.dialogMode = mode;
    this.dialogValue = value;
    this.dialogParentId = mode === 'new-folder'
      ? this.currentDirectorySubject.value.id
      : undefined;
    this.dialogTargetId = mode === 'rename' || mode === 'move' || mode === 'tags' || mode === 'delete'
      ? this.selectedFile?.id
      : undefined;
    this.dialogTargetName = this.selectedFile?.name ?? '';
    if (mode !== 'reset') {
      this.errorMessage = null;
    }
    requestAnimationFrame(() => {
      const destructive = mode === 'delete' || mode === 'empty-trash' || mode === 'reset';
      (destructive ? this.dialogCancel?.nativeElement : this.dialogInput?.nativeElement)
        ?.focus();
    });
  }

  private dismissDialog(): void {
    const restoreTarget = this.dialogRestoreTarget;
    this.dialogMode = null;
    this.dialogValue = '';
    this.dialogRestoreTarget = undefined;
    this.dialogTargetId = undefined;
    this.dialogTargetName = '';
    this.dialogParentId = undefined;
    requestAnimationFrame(() => {
      const disabled = restoreTarget instanceof HTMLButtonElement && restoreTarget.disabled;
      if (restoreTarget?.isConnected && !disabled) {
        restoreTarget.focus();
      } else {
        this.focusFirstEntryOrRoot();
      }
    });
  }

  private getDialogFocusableElements(): HTMLElement[] {
    const panel = this.dialogPanel?.nativeElement;
    if (!panel) {
      return [];
    }
    return Array.from(panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    ));
  }

  private focusEntry(id: string): void {
    const entries = this.finderRoot?.nativeElement.querySelectorAll<HTMLElement>('[data-finder-entry-id]');
    const target = Array.from(entries ?? []).find((element) => element.dataset['finderEntryId'] === id);
    target?.focus();
  }

  private focusFirstEntryOrRoot(): void {
    const firstEntry = this.finderRoot?.nativeElement
      .querySelector<HTMLElement>('[data-finder-entry-id]');
    (firstEntry ?? this.finderRoot?.nativeElement)?.focus();
  }

  private getRenderedGridColumnCount(): number {
    const grid = this.finderRoot?.nativeElement.querySelector<HTMLElement>('[data-finder-view="grid"]');
    if (!grid) {
      return 1;
    }
    const columns = getComputedStyle(grid).gridTemplateColumns.trim();
    if (!columns || columns === 'none') {
      return 1;
    }
    return Math.max(1, columns.split(/\s+/).length);
  }

  private async runAction<T>(
    operation: () => Promise<T>,
    successMessage: string,
    focusAfterRemoval = false,
  ): Promise<T | undefined> {
    if (this.busy) {
      return undefined;
    }
    this.busy = true;
    this.errorMessage = null;
    try {
      const result = await operation();
      const preferredSelectionId = result && typeof result === 'object' && 'id' in result
        ? String(result.id)
        : undefined;
      this.refreshDirectory(preferredSelectionId);
      this.statusMessage = successMessage;
      if (focusAfterRemoval) {
        requestAnimationFrame(() => this.focusFirstEntryOrRoot());
      }
      return result;
    } catch (error) {
      this.errorMessage = this.describeError(error);
      return undefined;
    } finally {
      this.busy = false;
    }
  }

  private requireSelected(): FileEntry {
    if (!this.selectedFile) {
      throw new Error('Select an item first.');
    }
    return this.selectedFile;
  }

  private requireDialogTargetId(): string {
    if (!this.dialogTargetId) {
      throw new Error('The selected item is no longer available for this action.');
    }
    return this.dialogTargetId;
  }

  private requireDialogParentId(): string {
    if (!this.dialogParentId) {
      throw new Error('The destination folder is no longer available.');
    }
    return this.dialogParentId;
  }

  private refreshDirectory(preferredSelectionId?: string): void {
    const root = this.finderRoot?.nativeElement;
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const ownedFocus = root?.contains(activeElement ?? null) ?? false;
    const focusedEntryId = ownedFocus
      ? activeElement?.dataset['finderEntryId']
      : undefined;
    const previousEntries = this.visibleEntries(this.currentDirectorySubject.value);
    const focusedIndex = focusedEntryId
      ? previousEntries.findIndex((entry) => entry.id === focusedEntryId)
      : -1;
    const requestedPath = this.currentPath;
    const directory = this.fileSystemService.getDirectory(requestedPath)
      ?? this.fileSystemService.getDirectory('/')
      ?? this.fileSystemService.getCurrentDirectory();
    this.currentDirectorySubject.next(directory);
    this.currentPath = directory.path;
    if (requestedPath !== directory.path) {
      this.navHistory = [directory.path];
      this.navIndex = 0;
      this.searchTerm = '';
      this.statusMessage = 'The previous folder is no longer available. Finder opened Home.';
    }
    const selectedId = preferredSelectionId ?? this.selectedFile?.id;
    const entries = this.visibleEntries(directory);
    this.selectedFile = selectedId
      ? entries.find((entry) => entry.id === selectedId)
      : undefined;
    if (focusedEntryId && !entries.some((entry) => entry.id === focusedEntryId)) {
      const fallback = entries[Math.min(Math.max(0, focusedIndex), Math.max(0, entries.length - 1))];
      this.selectedFile = fallback;
    }
    if (ownedFocus) {
      requestAnimationFrame(() => {
        const active = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
        const unusable = !active?.isConnected || !root?.contains(active)
          || (active instanceof HTMLButtonElement && active.disabled)
          || !!active?.closest('[inert]');
        const focusedEntryRemoved = !!focusedEntryId
          && !entries.some((entry) => entry.id === focusedEntryId);
        if (focusedEntryRemoved || unusable) {
          if (this.selectedFile) {
            this.focusEntry(this.selectedFile.id);
          } else {
            this.focusFirstEntryOrRoot();
          }
        }
      });
    }
  }

  private resetWindowStateForUnavailableFileSystem(): void {
    const root = this.finderRoot?.nativeElement;
    const ownedFocus = root?.contains(document.activeElement) ?? false;
    const directory = this.fileSystemService.getDirectory('/')
      ?? this.fileSystemService.getCurrentDirectory();
    this.currentDirectorySubject.next(directory);
    this.currentPath = '/';
    this.navHistory = ['/'];
    this.navIndex = 0;
    this.searchTerm = '';
    this.selectedFile = undefined;
    this.dialogMode = null;
    this.dialogValue = '';
    this.dialogRestoreTarget = undefined;
    this.dialogTargetId = undefined;
    this.dialogTargetName = '';
    this.dialogParentId = undefined;
    this.loading = true;
    this.statusMessage = 'Loading Finder…';
    if (ownedFocus) {
      requestAnimationFrame(() => root?.focus());
    }
  }

  private describeItemCount(count: number): string {
    return `${count} ${count === 1 ? 'item' : 'items'}`;
  }

  private matchesSearch(entry: FileEntry, query: string): boolean {
    const normalized = query.trim().toLocaleLowerCase();
    return `${entry.name} ${entry.tags.join(' ')}`.toLocaleLowerCase().includes(normalized);
  }

  private parseParams(value: unknown): FinderParams | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const path = (value as {path?: unknown}).path;
    return typeof path === 'string' ? {path} : undefined;
  }

  private async openPendingPath(): Promise<void> {
    if (!this.pendingParams?.path || !this.ready) {
      return;
    }
    const path = this.pendingParams.path;
    this.pendingParams = undefined;
    this.navigate(path);
  }

  private locationLabel(path: string): string {
    return path === '/' ? 'Home' : path === 'trash' ? 'Trash' : path.split('/').filter(Boolean).at(-1) ?? 'Finder';
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable="true"]');
  }

  private describeError(error: unknown): string {
    return error instanceof Error && error.message ? error.message : 'Finder could not complete that action.';
  }

  protected readonly icons = {
    back: faChevronLeft,
    forward: faChevronRight,
    copy: faCopy,
    file: faFile,
    folder: faFolder,
    list: faList,
    pen: faPen,
    plus: faPlus,
    search: faSearch,
    grid: faTableCellsLarge,
    columns: faTableColumns,
    tag: faTag,
    trash: faTrashCan,
    undo: faArrowRotateLeft,
  };
  protected readonly viewModes = VIEW_MODES;
}
