import { Injectable } from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {SoundService} from './sound.service';
import {UserService} from './user.service';

export type TypingMode = 'default' | 'glitch' | 'system' | 'dramatic';

interface TypewriterLine {
  text: string;
  speed?: number;
  mode?: TypingMode;
  agent: 'user' | 'system';
  pauseAfter?: number;
  showPath?: boolean;
  onCharTyped?: (char: string, index: number, mode: TypingMode) => void;
  onBegin?: () => void;
  onComplete?: () => void;
}

interface CompletedLineEvent {
  text: string;
  agent: 'user' | 'system';
}

@Injectable({ providedIn: 'root' })
export class TypewriterService {
  public typedText$ = new BehaviorSubject<string>('');
  public lineCompleted$ = new Subject<CompletedLineEvent>();
  private queue: TypewriterLine[] = [];
  private currentIndex = 0;
  private typingInterval: ReturnType<typeof setInterval> | null = null;
  private lineBuffer = '';
  public activeMode$ = new BehaviorSubject<TypingMode>('default');

  // Sound controls configuration
  public soundEnabled$ = new BehaviorSubject<boolean>(true);
  public volume = new BehaviorSubject(0.2);

  constructor(private soundService: SoundService, private userService: UserService) {
      if(this.queue.length > 0) {
        this.processNextLine();
      }
  }

  // Public method to enable/disable sounds
  enableSound(enabled?: boolean): void {
    const newState = enabled !== undefined ? enabled : !this.soundEnabled$.value;
    this.soundEnabled$.next(newState);
  }

  setVolume(volume: number): void {
    this.volume.next(volume);
  }


  enqueueLine(line: TypewriterLine) {
    this.queue.push({ ...line, mode: line.mode ?? 'default' });
    if (this.queue.length === 1) this.processNextLine();
  }

  private processNextLine() {
    const line = this.queue[0];
    if (!line) return;

    this.currentIndex = 0;
    this.lineBuffer = '';
    const mode = line.mode ?? 'default';
    this.activeMode$.next(mode);
    if (line.showPath)
      this.typedText$.next(
        this.typedText$.getValue() +
        (line.agent === 'user' ? this.userService.user.name.toLowerCase() : 'root') +
        '@' +
        (line.agent === 'user' ? '' : 'root') +
        ':' +
        (line.agent === 'user' ? '/' : '') +
        ' '
      )

    line.onBegin?.();

    const config = this.getTypingConfig(mode);
    this.typingInterval = setInterval(() => this.typeNextChar(line), config.speed);
  }

  private typeNextChar(line: TypewriterLine) {
    const mode = line.mode ?? 'default';
    const config = this.getTypingConfig(mode);

    if (this.currentIndex < line.text.length) {
      const char = line.text[this.currentIndex];
      this.lineBuffer += char;
      this.typedText$.next(this.typedText$.getValue() + char);
      this.currentIndex++;

      // Only play sound if sounds are enabled
      if (this.soundEnabled$.value) {

        const soundKey = config.charSound(char);
        if (soundKey) {
          this.soundService.playVariant(soundKey, {volume: this.volume.value, forceRestart: true});
        }
      }

      line.onCharTyped?.(char, this.currentIndex, mode);
    } else {
      if (this.typingInterval !== null) {
        clearInterval(this.typingInterval);
      }
      this.typingInterval = null;

      line.onComplete?.();

      setTimeout(() => {

        const finalLine = this.typedText$.getValue() + '\n';
        this.typedText$.next(finalLine);
        this.lineCompleted$.next({
          text: finalLine.trim(),
          agent: line.agent || 'system'
        }); // ✨ emit completed line
        this.queue.shift();
        this.processNextLine();
      }, line.pauseAfter ?? 100);
    }
  }

  clear() {
    if (this.typingInterval !== null) {
      clearInterval(this.typingInterval);
    }
    this.typingInterval = null;
    this.queue = [];
    this.currentIndex = 0;
    this.typedText$.next('');
  }

  private getTypingConfig(mode: TypingMode): { speed: number; charSound: (char: string) => string | null } {
    switch (mode) {
      case 'glitch':
        return {
          speed: 20,
          charSound: (char) => {
            if (/[a-z0-9]/i.test(char)) return 'glitch';
            return null;
          }
        };
      case 'system':
        return {
          speed: 30,
          charSound: () => 'digital-beep-2.mp3',
        };
      case 'dramatic':
        return {
          speed: 10,
          charSound: () => {
              return null;
            }
        };
      case 'default':
      default:
        return {
          speed: 20,
          charSound: (char) => {
            if (/[a-z0-9]/i.test(char)) return 'click'; // <- use a pool key
            return null;
          }
        };
    }
  }
}
