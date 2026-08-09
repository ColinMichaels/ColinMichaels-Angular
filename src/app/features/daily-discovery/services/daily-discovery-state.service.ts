import {DOCUMENT} from '@angular/common';
import {inject, Injectable} from '@angular/core';

interface StoredDailyDiscoveryCompletion {
  challengeId: string;
  dateKey: string;
  completedAt: string;
}

interface StoredDailyDiscoveryState {
  version: 1;
  completions: readonly StoredDailyDiscoveryCompletion[];
}

const STORAGE_KEY = 'cm.daily-discovery.v1';
const MAX_STORED_COMPLETIONS = 14;

@Injectable({
  providedIn: 'root',
})
export class DailyDiscoveryStateService {
  private readonly document = inject(DOCUMENT);

  hasCompleted(dateKey: string, challengeId: string): boolean {
    return this.readState().completions.some(completion => (
      completion.dateKey === dateKey && completion.challengeId === challengeId
    ));
  }

  markCompleted(dateKey: string, challengeId: string): void {
    const state = this.readState();
    const completion: StoredDailyDiscoveryCompletion = {
      challengeId,
      dateKey,
      completedAt: new Date().toISOString(),
    };
    const completions = [
      completion,
      ...state.completions.filter(item => item.dateKey !== dateKey || item.challengeId !== challengeId),
    ].slice(0, MAX_STORED_COMPLETIONS);

    this.writeState({version: 1, completions});
  }

  private readState(): StoredDailyDiscoveryState {
    const storage = this.document.defaultView?.localStorage;

    if (!storage) {
      return {version: 1, completions: []};
    }

    try {
      const raw = storage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;

      return parseStoredState(parsed);
    } catch {
      return {version: 1, completions: []};
    }
  }

  private writeState(state: StoredDailyDiscoveryState): void {
    try {
      this.document.defaultView?.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Daily Discovery remains playable when browser storage is unavailable.
    }
  }
}

function parseStoredState(value: unknown): StoredDailyDiscoveryState {
  if (!isRecord(value) || value['version'] !== 1 || !Array.isArray(value['completions'])) {
    return {version: 1, completions: []};
  }

  const completions = value['completions']
    .filter(isRecord)
    .map(completion => ({
      challengeId: getString(completion['challengeId']),
      dateKey: getString(completion['dateKey']),
      completedAt: getString(completion['completedAt']),
    }))
    .filter(completion => (
      completion.challengeId.length > 0
      && /^\d{4}-\d{2}-\d{2}$/.test(completion.dateKey)
      && completion.completedAt.length > 0
    ))
    .slice(0, MAX_STORED_COMPLETIONS);

  return {version: 1, completions};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
