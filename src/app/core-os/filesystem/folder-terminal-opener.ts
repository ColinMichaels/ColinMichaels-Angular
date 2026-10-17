import {InjectionToken} from '@angular/core';

export interface FolderTerminalOpener {
  openFolder(path: string): boolean;
}

export const FOLDER_TERMINAL_OPENER = new InjectionToken<FolderTerminalOpener>('FolderTerminalOpener');
