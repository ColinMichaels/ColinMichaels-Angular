import { Injectable, Type } from '@angular/core';

export interface TerminalInstance {
  id: string;
  title: string;
  component: Type<any>;
  memory: number; // in MB
}

@Injectable({ providedIn: 'root' })
export class TerminalWindowManagerService {
  private terminals: TerminalInstance[] = [];
  private maxInstances = 5;
  private maxMemory = 512; // MB

  get openTerminals(): TerminalInstance[] {
    return this.terminals;
  }

  get usedMemory(): number {
    return this.terminals.reduce((sum, t) => sum + t.memory, 0);
  }

  openTerminal(id: string, component: Type<any>, title = 'Terminal', memory = 5) {
    if (this.terminals.length >= this.maxInstances || this.usedMemory + memory > this.maxMemory) {
      console.warn('[WindowManager] Cannot open terminal — limit reached.');
      return false;
    }
    if (!this.terminals.find(t => t.id === id)) {
      this.terminals.push({ id, title, component, memory });
    }
    return true;
  }

  closeTerminal(id: string) {
    this.terminals = this.terminals.filter(t => t.id !== id);
  }
  clearAll() {
    this.terminals = [];
  }
}
