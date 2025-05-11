import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FileEntry, FileSystemService} from '../../services/file-system.service';
import { FinderWindowComponent } from '../finder-window/finder-window.component';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-finder-app',
  standalone: true,
  imports: [CommonModule, FinderWindowComponent, FormsModule],
  templateUrl: './finder-app.component.html',
  styles:`.input, select {
    @apply bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500;
  }`
})
export class FinderAppComponent {

  viewMode: 'list' | 'grid' | 'columns' = 'list';
  currentPath = '/'; // update as user navigate

  navHistory: string[] = [];
  navIndex: number = -1;
  sortBy = 'name';
  sortOrder = 'asc';

  constructor(private fileSystemService: FileSystemService) {
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

  setViewMode(mode: 'list' | 'grid' | 'columns') {
    this.viewMode = mode;
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
}
