import {Component, DestroyRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FileEntry, FileSystemService, VIEW_MODES} from '../../services/file-system.service';
import {FinderWindowComponent} from '../finder-window/finder-window.component';
import {FormsModule} from '@angular/forms';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faFile,
  faFolder,
  faList,
  faPlus,
  faSearch,
  faTableCellsLarge,
  faTableColumns
} from '@fortawesome/free-solid-svg-icons';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-finder-app',
  standalone: true,
  imports: [CommonModule, FinderWindowComponent, FormsModule, FontAwesomeModule],
  templateUrl: './finder-app.component.html',
  styles:`.input, select {
    @apply bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500;
  }`
})
export class FinderAppComponent {

  currentPath = '/'; // update as user navigate

  navHistory: string[] = [];
  navIndex: number = -1;
  sortBy = 'name';
  sortOrder = 'asc';
  viewMode = VIEW_MODES.list;
  searchTerm = '';

  constructor(private fileSystemService: FileSystemService, private destroyRef: DestroyRef) {
    this.fileSystemService.viewMode$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mode => this.viewMode = mode);
  }

  get favoriteDirs() {
    return this.fileSystemService.getFavoriteDirs();
  }

  goBack(): void {
    if (this.navIndex > 0) {
      this.navIndex--;
      this.currentPath = this.navHistory[this.navIndex];
      this.fileSystemService.navigateTo(this.currentPath);
    }
  }

  goForward(): void {
    if (this.navIndex < this.navHistory.length - 1) {
      this.navIndex++;
      this.currentPath = this.navHistory[this.navIndex];
      this.fileSystemService.navigateTo(this.currentPath);
    }
  }

  setViewMode(mode: VIEW_MODES) {
    this.fileSystemService.setViewMode(mode);
  }

  getCurrentDir(){
   return this.fileSystemService.currentDir$
  }

  navigate(path: string): void {
    if (this.navIndex < this.navHistory.length - 1) {
      this.navHistory = this.navHistory.slice(0, this.navIndex + 1);
    }
    this.navHistory.push(path);
    this.navIndex++;
    this.currentPath = path;
    this.fileSystemService.navigateTo(path);
  }


  trackByName(_: number, file: any): string {
    return file.name;
  }

  sortFiles(children: FileEntry[] | undefined) {
    return this.fileSystemService.sortFiles(children);
  }

  navigateToBreadcrumb(index: number): void {
    const parts = this.currentPath.split('/').slice(0, index + 1);
    const newPath = parts.join('/') || '/';
    this.navigate(newPath);
  }

  getDirName(currentPath: string) {
    return currentPath.split('/').pop();
  }

  protected readonly faList = faList;
  protected readonly faTableCellsLarge = faTableCellsLarge;
  protected readonly faTableColumns = faTableColumns;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faFolder = faFolder;
  protected readonly faFile = faFile;
  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faSearch = faSearch;
  protected readonly faPlus = faPlus;
  protected readonly VIEW_MODES = VIEW_MODES;
}
