import { Injectable } from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {SoundService} from './sound.service';
import {User, UserService} from './user.service';

export type TypingMode = 'default' | 'glitch' | 'system' | 'dramatic';

interface TypewriterLine {
  text: string;
  speed?: number;
  mode?: TypingMode;
  agent: 'user' | 'system';
  pauseAfter?: number;
  onCharTyped?: (char: string, index: number, mode: TypingMode) => void;
  onBegin?: () => void;
  onComplete?: () => void;
}

@Injectable({ providedIn: 'root' })
export class TypewriterService {
  public typedText$ = new BehaviorSubject<string>('');
  public lineCompleted$ = new Subject<any>();
  private queue: TypewriterLine[] = [];
  private currentIndex = 0;
  private typingInterval: any;
  private lineBuffer = '';
  public activeMode$ = new BehaviorSubject<TypingMode>('default');

  constructor(private soundService: SoundService, private userService: UserService) {
      if(this.queue.length > 0) {
        this.processNextLine();
      }
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
    const userName = this.userService.user.name.toLowerCase() || 'unknown';
    const currenPath = `${userName}@root:/ `;
    line.text = currenPath + line.text;

    const config = this.getTypingConfig(mode);
    this.typingInterval = setInterval(() => this.typeNextChar(line), config.speed);
  }

  private typeNextChar(line: TypewriterLine) {
    const mode = line.mode ?? 'default';
    const config = this.getTypingConfig(mode);
    line.onBegin?.();

    if (this.currentIndex < line.text.length) {
      const char = line.text[this.currentIndex];
      this.lineBuffer += char;
      this.typedText$.next(this.typedText$.getValue() + char);
      this.currentIndex++;

      const soundKey = config.charSound(char);
      if (soundKey) {
        this.soundService.playVariant(soundKey, { volume: 0.2, forceRestart: true });
      }

      line.onCharTyped?.(char, this.currentIndex, mode);
    } else {
      clearInterval(this.typingInterval);
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
    clearInterval(this.typingInterval);
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
            charSound: (char) => {
              return null;
            }
        };
      case 'default':
      default:
        return {
          speed: 40,
          charSound: (char) => {
            if (/[a-z0-9]/i.test(char)) return 'click'; // <- just use pool key
            return null;
          }
        };
    }
  }
}
