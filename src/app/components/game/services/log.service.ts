import {inject, Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {FirestoreService} from '../../../services/firebase/firestore.service';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: any;
  timestamp: Date;
}

@Injectable({providedIn: 'root'})
export class LogService {
  private logBuffer: LogEntry[] = [];
  private logSubject = new BehaviorSubject<LogEntry[]>([]);
  private mutedLevels: Set<LogLevel> = new Set();
  private globalMute = false;
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

  debug(message: any, params?: any) {
    message = this.prepareMessage(message, params);
    this.log('debug', message);
  }

  info(message: any, params?: any) {
    message = this.prepareMessage(message, params);
    this.log('info', message);
  }

  private prepareMessage(message: any, params?: any) {
    if (!params) return message;
    return `${message} (${this.parseParams(params)})`;
  }

  private parseParams(params: any) {
    if (!params) return '';
    return Object.keys(params).map(key => `${key}=${params[key]}`).join(', ');
  }

  warn(message: any, params?: any) {
    message = this.prepareMessage(message, params);
    this.log('warn', message);
  }

  error(message: any, params?: any) {
    message = this.prepareMessage(message, params);
    this.log('error', message);
  }

  private log(level: LogLevel, message: any) {
    if (this.globalMute || this.mutedLevels.has(level)) return;

    const entry: LogEntry = {level, message, timestamp: new Date()};

    if (this.firestore) {
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
}
