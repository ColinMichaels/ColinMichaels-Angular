import {inject, Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {FirestoreService} from '../../../services/firebase/firestore.service';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: unknown;
  timestamp: Date;
}

@Injectable({providedIn: 'root'})
export class LogService {
  private logBuffer: LogEntry[] = [];
  private logSubject = new BehaviorSubject<LogEntry[]>([]);
  private mutedLevels: Set<LogLevel> = new Set();
  private globalMute = false;
  private remoteLoggingDisabled = false;
  private remoteLoggingWarningShown = false;
  private readonly persistRemoteLogs = !this.isLocalHost();
  private firestore: FirestoreService | null = (() => {
    try {
      return inject(FirestoreService);
    } catch {
      return null;
    }
  })();

  get logs(): LogEntry[] {
    return [...this.logBuffer];
  }

  get logs$(): Observable<LogEntry[]> {
    return this.logSubject.asObservable();
  }

  filterLogs(levels?: LogLevel[], since?: Date): LogEntry[] {
    return this.logBuffer.filter(entry => {
      const matchLevel = !levels || levels.includes(entry.level);
      const matchTime = !since || entry.timestamp >= since;
      return matchLevel && matchTime;
    });
  }

  getLogsPage(page: number, pageSize: number): LogEntry[] {
    const start = page * pageSize;
    return this.logBuffer.slice(start, start + pageSize);
  }

  muteLevel(level: LogLevel) {
    this.mutedLevels.add(level);
  }

  unmuteLevel(level: LogLevel) {
    this.mutedLevels.delete(level);
  }

  muteAll() {
    this.globalMute = true;
  }

  unmuteAll() {
    this.globalMute = false;
  }

  debug(message: unknown, params?: unknown) {
    message = this.prepareMessage(message, params);
    this.log('debug', message);
  }

  info(message: unknown, params?: unknown) {
    message = this.prepareMessage(message, params);
    this.log('info', message);
  }

  private prepareMessage(message: unknown, params?: unknown) {
    if (!params) return message;
    return `${message} (${this.parseParams(params)})`;
  }

  private parseParams(params: unknown) {
    if (!params || typeof params !== 'object') return '';
    return Object.entries(params).map(([key, value]) => `${key}=${value}`).join(', ');
  }

  warn(message: unknown, params?: unknown) {
    message = this.prepareMessage(message, params);
    this.log('warn', message);
  }

  error(message: unknown, params?: unknown) {
    message = this.prepareMessage(message, params);
    this.log('error', message);
  }

  private log(level: LogLevel, message: unknown) {
    if (this.globalMute || this.mutedLevels.has(level)) return;

    const entry: LogEntry = {level, message, timestamp: new Date()};

    if (this.firestore && this.persistRemoteLogs && !this.remoteLoggingDisabled) {
      this.firestore.saveLogEntry(
        {
          level: entry.level,
          message: typeof entry.message === 'string' ? entry.message : '',
          userId: 'unknown',
          metadata: 'log entry'
        },
      ).subscribe({
        next: () => {
          // Successfully saved log to Firestore
        },
        error: (err) => {
          if (this.isPermissionDeniedError(err)) {
            this.remoteLoggingDisabled = true;

            if (!this.remoteLoggingWarningShown) {
              this.remoteLoggingWarningShown = true;
              console.warn('Firestore log persistence disabled: missing permission for logs collection.');
            }

            return;
          }

          console.error('Failed to save log to Firestore:', err);
        }
      });
    }
    this.logBuffer.push(entry);
    this.logSubject.next([...this.logBuffer]);

    switch (level) {
      case 'debug':
        console.log('[DEBUG]', message);
        break;
      case 'info':
        console.info('[INFO]', message);
        break;
      case 'warn':
        console.warn('[WARN]', message);
        break;
      case 'error':
        console.error('[ERROR]', message);
        break;
    }
  }

  clear() {
    this.logBuffer = [];
    this.logSubject.next([]);
  }

  private isLocalHost(): boolean {
    if (typeof window === 'undefined') return false;

    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  }

  private isPermissionDeniedError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const firebaseError = error as { code?: unknown; message?: unknown };
    const message = typeof firebaseError.message === 'string' ? firebaseError.message : '';

    return firebaseError.code === 'permission-denied' || message.includes('Missing or insufficient permissions');
  }
}
