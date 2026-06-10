import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {BehaviorSubject, firstValueFrom, forkJoin, Observable, of} from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {UserService} from './user.service';

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
  commandFiles?: string[];  // New field
}

@Injectable({providedIn: 'root'})
export class GameConfigService {
  private levels: GameLevel[] = [];
  private levelsSubject = new BehaviorSubject<GameLevel[]>([]);
  levels$ = this.levelsSubject.asObservable();
  private currentLevelIndex = 0;

  constructor(private readonly http: HttpClient, private readonly userService: UserService) {
  }

  async loadLevelsForProgress(currentLevel = this.currentLevelIndex, preloadNext = 0): Promise<Observable<GameLevel[]>> {
    const levelFiles = [];
    const highestLevelToLoad = currentLevel + preloadNext;

    for (let i = 0; i <= highestLevelToLoad; i++) {
      levelFiles.push(
        this.http.get<GameLevel>(`/assets/game/levels/level-${i + 1}.json`).pipe(
          catchError(error => {
            console.warn(`Failed to load level ${i + 1}:`, error);
            return of(null); // Return null for failed levels
          })
        )
      );
    }

    return forkJoin(levelFiles).pipe(
      map(levels => levels.filter((level): level is GameLevel => level !== null))
    );
  }

  setLevels(levels: GameLevel[]) {
    this.levels = levels;
  }

  getCurrentLevel(): GameLevel {
    return this.levels[this.currentLevelIndex];
  }

  async loadLevels(): Promise<GameLevel[]> {
    const levels = await firstValueFrom(
      this.http.get<GameLevel[]>(`/assets/game/levels/level-${this.userService.user.level}.json`));
    this.levelsSubject.next(levels);
    return levels;
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
