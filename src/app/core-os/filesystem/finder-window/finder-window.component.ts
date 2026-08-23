import {ChangeDetectionStrategy, Component, inject, Input} from '@angular/core';
import {NgSwitch, NgSwitchCase} from '@angular/common';
import {FileEntry, FileSystemService, VIEW_MODES} from '../file-system.service';

@Component({
  selector: 'app-finder-window',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase],
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    :host {
      display: block;
      min-height: 0;
      height: 100%;
    }

    .finder-content {
      height: 100%;
      min-height: 0;
      overflow: auto;
    }
  `,
  template: `
    <div class="finder-content">
      <ng-container [ngSwitch]="viewMode">
        <div *ngSwitchCase="viewModes.list" class="h-full">
          <ng-content select="[list-view]"></ng-content>
        </div>
        <div *ngSwitchCase="viewModes.grid" class="h-full">
          <ng-content select="[grid-view]"></ng-content>
        </div>
        <div *ngSwitchCase="viewModes.columns" class="h-full">
          <ng-content select="[columns-view]"></ng-content>
        </div>
      </ng-container>
    </div>
  `,
})
export class FinderWindowComponent {
  /** @deprecated Window chrome owns these dimensions; retained for legacy templates. */
  @Input() title = 'Finder';
  /** @deprecated Window chrome owns these dimensions; retained for legacy templates. */
  @Input() width = 'w-[800px]';
  /** @deprecated Window chrome owns these dimensions; retained for legacy templates. */
  @Input() height = 'h-[500px]';
  @Input() viewMode: VIEW_MODES | string = VIEW_MODES.list;

  readonly viewModes = VIEW_MODES;
  readonly fileSystem = inject(FileSystemService);
  readonly currentDir$ = this.fileSystem.currentDir$;

  navigate(path: string): void {
    this.fileSystem.navigateTo(path);
  }

  trackByName(_: number, file: FileEntry): string {
    return file.name;
  }
}
