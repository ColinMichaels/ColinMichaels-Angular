import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
}

export const LOCAL_LOG_BUFFER_CAPACITY = 500;
export const LOCAL_LOG_MESSAGE_CHARACTER_LIMIT = 4_096;

/**
 * Local application logging shared by the public site and Core OS.
 *
 * Log entries remain available to the Core OS log viewer and the browser
 * console. Remote telemetry must use a separately authorized, consent-aware
 * boundary instead of writing anonymous client logs directly to Firestore.
 */
@Injectable({providedIn: 'root'})
export class LogService {
  private readonly logBuffer: Array<LogEntry | undefined> = new Array(LOCAL_LOG_BUFFER_CAPACITY);
  private logStart = 0;
  private logCount = 0;
  private readonly logSubject = new BehaviorSubject<LogEntry[]>([]);
  private readonly mutedLevels = new Set<LogLevel>();
  private globalMute = false;

  get logs(): LogEntry[] {
    return this.createLogSnapshot();
  }

  get logs$(): Observable<LogEntry[]> {
    return this.logSubject.asObservable();
  }

  filterLogs(levels?: LogLevel[], since?: Date): LogEntry[] {
    return this.createLogSnapshot().filter(entry => {
      const matchLevel = !levels || levels.includes(entry.level);
      const matchTime = !since || entry.timestamp >= since;
      return matchLevel && matchTime;
    });
  }

  getLogsPage(page: number, pageSize: number): LogEntry[] {
    const start = page * pageSize;
    return this.createLogSnapshot().slice(start, start + pageSize);
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
    this.logBuffer.fill(undefined);
    this.logStart = 0;
    this.logCount = 0;
    this.logSubject.next([]);
  }

  private prepareMessage(message: unknown, params?: unknown): string {
    const baseMessage = String(message).slice(0, LOCAL_LOG_MESSAGE_CHARACTER_LIMIT);
    if (params === undefined || baseMessage.length >= LOCAL_LOG_MESSAGE_CHARACTER_LIMIT) {
      return baseMessage;
    }

    const availableParamCharacters = LOCAL_LOG_MESSAGE_CHARACTER_LIMIT - baseMessage.length - 3;
    if (availableParamCharacters <= 0) {
      return baseMessage;
    }

    return `${baseMessage} (${this.parseParams(params, availableParamCharacters)})`
      .slice(0, LOCAL_LOG_MESSAGE_CHARACTER_LIMIT);
  }

  private parseParams(params: unknown, characterLimit: number): string {
    if (params instanceof Error) {
      return `error=${params.name}: ${params.message}`.slice(0, characterLimit);
    }
    if (!params || typeof params !== 'object') {
      return `value=${String(params)}`.slice(0, characterLimit);
    }

    let result = '';
    for (const key of Object.keys(params)) {
      const separator = result ? ', ' : '';
      const availableCharacters = characterLimit - result.length - separator.length;
      if (availableCharacters <= 0) {
        break;
      }

      const value = (params as Record<string, unknown>)[key];
      const entry = `${key}=${String(value)}`.slice(0, availableCharacters);
      result += `${separator}${entry}`;
    }

    return result;
  }

  private log(level: LogLevel, message: string): void {
    if (this.globalMute || this.mutedLevels.has(level)) return;

    const entry: LogEntry = {level, message, timestamp: new Date()};

    this.appendEntry(entry);
    this.logSubject.next(this.createLogSnapshot());

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

  private appendEntry(entry: LogEntry): void {
    if (this.logCount < LOCAL_LOG_BUFFER_CAPACITY) {
      const insertionIndex = (this.logStart + this.logCount) % LOCAL_LOG_BUFFER_CAPACITY;
      this.logBuffer[insertionIndex] = entry;
      this.logCount += 1;
      return;
    }

    this.logBuffer[this.logStart] = entry;
    this.logStart = (this.logStart + 1) % LOCAL_LOG_BUFFER_CAPACITY;
  }

  private createLogSnapshot(): LogEntry[] {
    const snapshot = new Array<LogEntry>(this.logCount);

    for (let index = 0; index < this.logCount; index += 1) {
      snapshot[index] = this.logBuffer[
      (this.logStart + index) % LOCAL_LOG_BUFFER_CAPACITY
        ]!;
    }

    return snapshot;
  }
}
