import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {firstValueFrom, forkJoin, Observable} from 'rxjs';

export interface LogFile {
  name: string;
  content: string;
  action?: 'alarm' | 'good' | 'neutral';
}

export interface Step {
  id: number;
  type: 'question' | 'puzzle' | 'input';
  params: string[];
}

export interface GameLevel {
  id: string;
  name: string;
  unlockedCommands: string[];
  logFiles?: LogFile[];
  storage?: string[];
  steps?: Step[];
  theme?: string;
}

export interface GameLevel {
  id: string;
  name: string;
  unlockedCommands: string[];
  logFiles?: LogFile[];
  theme?: string;
}

@Injectable({ providedIn: 'root' })
export class GameConfigService {
  private levels: GameLevel[] = [];
  private currentLevelIndex = 0;

  constructor(private http: HttpClient) {}

  loadLevelsForProgress(currentLevel: number, preloadNext: number = 1): Observable<GameLevel[]> {
    const levelFiles = [];

    for (let i = 0; i <= currentLevel + preloadNext; i++) {
      levelFiles.push(this.http.get<GameLevel>(`/assets/game/levels/level-${i + 1}.json`));
    }

    return forkJoin(levelFiles);
  }

  setLevels(levels: GameLevel[]) {
    this.levels = levels;
  }

  getLevelById(id: string): GameLevel | undefined {
    return this.levels.find(l => l.id === id);
  }

  getAllLevels(): GameLevel[] {
    return this.levels;
  }

  getLevelByIndex(index: number): GameLevel | undefined {
    return this.levels[index];
  }

  async loadConfig(): Promise<void> {
    const data = await firstValueFrom(this.http.get<{ levels: GameLevel[] }>('assets/config/game-levels.json'));
    this.levels = data.levels;
  }

  getCurrentLevel(): GameLevel {
    return this.levels[this.currentLevelIndex];
  }

  advanceLevel(): void {
    if (this.currentLevelIndex < this.levels.length - 1) {
      this.currentLevelIndex++;
    }
  }

  getAvailableCommands(): string[] {
    return this.getCurrentLevel().unlockedCommands;
  }

  getFileContent(name: string): string | null {
    const level = this.getCurrentLevel();
    if (!level.logFiles) return null;
    const file = level.logFiles.find(f => f.name.toLowerCase() === name.toLowerCase());
    return file ? file.content : null;
  }

  getCurrentTheme(): string {
    return this.getCurrentLevel().theme ?? 'default';
  }
}
