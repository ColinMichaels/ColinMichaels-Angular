import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: unknown;
  timestamp: Date;
}

/**
 * Local application logging shared by the public site and Core OS.
 *
 * Log entries remain available to the Core OS log viewer and the browser
 * console. Remote telemetry must use a separately authorized, consent-aware
 * boundary instead of writing anonymous client logs directly to Firestore.
 */
@Injectable({providedIn: 'root'})
export class LogService {
  private logBuffer: LogEntry[] = [];
  private readonly logSubject = new BehaviorSubject<LogEntry[]>([]);
  private readonly mutedLevels = new Set<LogLevel>();
  private globalMute = false;

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

  muteLevel(level: LogLevel): void {
    this.mutedLevels.add(level);
  }

  unmuteLevel(level: LogLevel): void {
    this.mutedLevels.delete(level);
  }

  muteAll(): void {
    this.globalMute = true;
  }

  unmuteAll(): void {
    this.globalMute = false;
  }

  debug(message: unknown, params?: unknown): void {
    this.log('debug', this.prepareMessage(message, params));
  }

  info(message: unknown, params?: unknown): void {
    this.log('info', this.prepareMessage(message, params));
  }

  warn(message: unknown, params?: unknown): void {
    this.log('warn', this.prepareMessage(message, params));
  }

  error(message: unknown, params?: unknown): void {
    this.log('error', this.prepareMessage(message, params));
  }

  clear(): void {
    this.logBuffer = [];
    this.logSubject.next([]);
  }

  private prepareMessage(message: unknown, params?: unknown): unknown {
    if (!params) return message;
    return `${message} (${this.parseParams(params)})`;
  }

  private parseParams(params: unknown): string {
    if (!params || typeof params !== 'object') return '';
    return Object.entries(params).map(([key, value]) => `${key}=${value}`).join(', ');
  }

  private log(level: LogLevel, message: unknown): void {
    if (this.globalMute || this.mutedLevels.has(level)) return;

    const entry: LogEntry = {level, message, timestamp: new Date()};

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
}
