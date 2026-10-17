import {InjectionToken} from '@angular/core';

export interface TerminalAdventure {
  start(): Promise<string>;
}

export const TERMINAL_ADVENTURE = new InjectionToken<TerminalAdventure>('TerminalAdventure');
