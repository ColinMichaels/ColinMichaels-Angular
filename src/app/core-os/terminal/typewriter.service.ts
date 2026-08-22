import {Injectable} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {SoundService} from '../../components/game/services/sound.service';
import {OsUserService} from '../../components/game/services/os-user.service';
import {CompletedLineEvent, TypewriterLine, TypingMode} from './typewriter.models';

export type {CompletedLineEvent, TypewriterLine, TypingMode} from './typewriter.models';

@Injectable({providedIn: 'root'})
export class TypewriterService {
  public typedText$ = new BehaviorSubject<string>('');
  public lineCompleted$ = new Subject<CompletedLineEvent>();
  private queue: TypewriterLine[] = [];
  private currentIndex = 0;
  private typingInterval: ReturnType<typeof setInterval> | null = null;
  private lineCompletionTimeout: ReturnType<typeof setTimeout> | null = null;
  private lineBuffer = '';
  public activeMode$ = new BehaviorSubject<TypingMode>('default');

  // Sound controls configuration
  public soundEnabled$ = new BehaviorSubject<boolean>(true);
  public volume = new BehaviorSubject(0.2);

  constructor(private soundService: SoundService, private userService: OsUserService) {
  }

  // Public method to enable/disable sounds
  enableSound(enabled?: boolean): void {
    const newState = enabled !== undefined ? enabled : !this.soundEnabled$.value;
    this.soundEnabled$.next(newState);
  }

  setVolume(volume: number): void {
    this.volume.next(volume);
  }


  enqueueLine(line: TypewriterLine): void {
    this.queue.push({...line, mode: line.mode ?? 'default'});
    if (this.queue.length === 1) this.processNextLine();
  }

  private processNextLine(): void {
    const line = this.queue[0];
    if (!line) {
      this.activeMode$.next('default');
      return;
    }

    this.clearTypingTimers();

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
      );

    line.onBegin?.();

    const config = this.getTypingConfig(mode);
    const resolvedSpeed = this.resolveTypingSpeed(line.speed, config.speed);
    this.typingInterval = setInterval(() => this.typeNextChar(line), resolvedSpeed);
  }

  private typeNextChar(line: TypewriterLine): void {
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

      if (this.currentIndex === line.text.length) {
        this.completeCurrentLine(line);
      }
    } else {
      this.completeCurrentLine(line);
    }
  }

  private completeCurrentLine(line: TypewriterLine): void {
    this.clearTypingInterval();

    line.onComplete?.();

    this.lineCompletionTimeout = setTimeout(() => {
      this.lineCompletionTimeout = null;

      const finalLine = this.typedText$.getValue() + '\n';
      this.typedText$.next(finalLine);
      this.lineCompleted$.next({
        text: this.lineBuffer,
        agent: line.agent || 'system'
      });
      this.queue.shift();
      this.processNextLine();
    }, line.pauseAfter ?? 100);
  }

  clear(): void {
    this.clearTypingTimers();
    this.queue = [];
    this.currentIndex = 0;
    this.lineBuffer = '';
    this.activeMode$.next('default');
    this.typedText$.next('');
  }

  private clearTypingTimers(): void {
    this.clearTypingInterval();
    if (this.lineCompletionTimeout !== null) {
      clearTimeout(this.lineCompletionTimeout);
      this.lineCompletionTimeout = null;
    }
  }

  private clearTypingInterval(): void {
    if (this.typingInterval !== null) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
  }

  private resolveTypingSpeed(lineSpeed: number | undefined, defaultSpeed: number): number {
    const speed = lineSpeed ?? defaultSpeed;
    return Number.isFinite(speed) && speed > 0 ? speed : defaultSpeed;
  }

  private getTypingConfig(mode: TypingMode): {speed: number; charSound: (char: string) => string | null} {
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
