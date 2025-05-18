import {Component, inject, Input, signal} from '@angular/core';
import {FileSystemService} from '../../services/file-system.service';
import {NgSwitch, NgSwitchCase} from '@angular/common';

@Component({
  selector: 'app-finder-window',
  styles: `.finder-window {
    @apply bg-white/10 backdrop-blur-md backdrop-saturate-150 border border-white/20 shadow-lg rounded-md;
    display: flex;
    flex-direction: column;
  }

  .finder-header {
    @apply flex items-center justify-between px-4 py-2 border-b border-white/20;
  }

  .finder-toolbar {
    @apply flex space-x-2 px-4 py-2 border-b border-white/20;
  }

  .finder-content {
    @apply flex-1 overflow-auto px-2 py-0.5 w-full h-full;
  }
  `,
  standalone: true,
  imports: [
    NgSwitch,
    NgSwitchCase
  ],
  template: `
    <div class="finder-content">
      <ng-container [ngSwitch]="viewMode">
        <div *ngSwitchCase="'list'">
          <ng-content select="[list-view]"></ng-content>
        </div>
        <div *ngSwitchCase="'grid'">
          <ng-content select="[grid-view]"></ng-content>
        </div>
        <div *ngSwitchCase="'columns'">
          <ng-content select="[columns-view]"></ng-content>
        </div>
      </ng-container>
    </div>`
})
export class FinderWindowComponent {
  @Input() title = 'Finder';
  @Input() width = 'w-[800px]';
  @Input() height = 'h-[500px]';
  @Input() viewMode = 'list';

  fileSystem = inject(FileSystemService);
  currentDir$ = this.fileSystem.currentDir$;

  navigate(path: string) {
    this.fileSystem.navigateTo(path);
  }

  trackByName(_: number, file: any): string {
    return file.name;
  }
}
