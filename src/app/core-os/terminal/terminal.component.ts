import {Component, DestroyRef, ElementRef, Input, ViewChild, inject, afterNextRender, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FileSystemService} from '@core-os/filesystem/file-system.service';
import {ApplicationManagerService} from '@core-os/app-registry/application-manager.service';
import {TerminalSession} from './terminal-session';
import {TERMINAL_ADVENTURE} from './terminal-adventure';

interface TerminalLine { prompt?: string; command?: string; output: string; }

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class TerminalComponent {
  private readonly files = inject(FileSystemService);
  private readonly apps = inject(ApplicationManagerService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly adventure = inject(TERMINAL_ADVENTURE, {optional: true});
  readonly session = new TerminalSession(this.files);
  @ViewChild('commandInput') private commandInput?: ElementRef<HTMLInputElement>;
  @ViewChild('scrollback') private scrollback?: ElementRef<HTMLElement>;
  userInput = '';
  busy = false;
  lines: TerminalLine[] = [];
  private history: string[] = [];
  private historyIndex = 0;
  private draft = '';
  private identityEpoch = 0;
  private destroyed = false;
  private pendingPath?: string;

  @Input() set params(value: unknown) {
    if (!value || typeof value !== 'object') return;
    const path = (value as {path?: unknown}).path;
    if (typeof path !== 'string') return;
    this.pendingPath = path;
    this.openPendingPath();
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.destroyed = true);
    this.resetTranscript();
    this.files.ready$.pipe(takeUntilDestroyed(destroyRef)).subscribe(ready => {
      if (!ready) {
        this.identityEpoch++;
        this.session.reset();
        this.history = [];
        this.historyIndex = 0;
        this.userInput = '';
        this.draft = '';
        this.pendingPath = undefined;
        this.resetTranscript();
        this.changeDetector.markForCheck();
      }
      if (ready) this.openPendingPath();
    });
    this.files.currentDir$.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => {
      this.session.refreshPath();
      this.changeDetector.markForCheck();
    });
    afterNextRender(() => this.commandInput?.nativeElement.focus());
  }

  async submit(): Promise<void> {
    if (this.busy || !this.userInput.trim()) return;
    const input = this.userInput;
    const prompt = this.session.prompt;
    const epoch = this.identityEpoch;
    const windowId = this.apps.getFocusedAppId();
    this.userInput = '';
    this.history.push(input);
    this.history = this.history.slice(-50);
    this.historyIndex = this.history.length;
    this.draft = '';
    this.busy = true;
    try {
      await this.files.whenReady();
      if (epoch !== this.identityEpoch || this.destroyed) return;
      let result;
      if (input.trim() === 'adventure') {
        if (!this.adventure) throw new Error('No adventure is installed in this desktop.');
        const path = await this.adventure.start();
        if (epoch !== this.identityEpoch || this.destroyed) return;
        this.session.path = path;
        result = {output: 'Lost Signal filebase ready. Explore with ls or tree.\nRead README.txt for context; open . shows the same files in Finder.'};
      } else if (input.trim() === 'history') {
        result = {output: this.history.map((command, index) => `${String(index + 1).padStart(3)}  ${command}`).join('\n')};
      } else result = this.session.execute(input);
      if (result.clear) this.lines = [];
      else this.lines = [...this.lines, {prompt, command: input, output: result.output}].slice(-150);
      if (result.finderPath && !this.apps.openApplication('finder', {path: result.finderPath})) {
        this.lines = [...this.lines, {output: 'Finder could not open. Try again from the Dock.'}];
      }
      if (result.close && windowId) this.apps.closeApplication(windowId);
    } catch (error) {
      if (epoch === this.identityEpoch && !this.destroyed) this.lines = [...this.lines, {
        prompt, command: input, output: error instanceof Error ? error.message : 'The command could not finish.',
      }].slice(-150);
    } finally {
      this.busy = false;
      if (!this.destroyed) this.changeDetector.markForCheck();
      // Keep focus in Finder when open was requested. The input remains enabled while busy.
      if (!this.destroyed) requestAnimationFrame(() => {
        if (!this.destroyed) this.scrollback?.nativeElement.scrollTo({top: this.scrollback.nativeElement.scrollHeight});
      });
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab' && !event.shiftKey && !this.busy) {
      event.preventDefault();
      const input = this.commandInput?.nativeElement;
      if (input && input.selectionStart !== this.userInput.length) return;
      const completed = this.session.complete(this.userInput);
      this.userInput = completed.input;
      if (completed.matches.length > 1) this.lines = [...this.lines, {output: completed.matches.join('  ')}].slice(-150);
      return;
    }
    if ((event.ctrlKey && event.key.toLowerCase() === 'l') || (event.metaKey && event.key.toLowerCase() === 'k')) {
      event.preventDefault(); this.lines = []; return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'c') {
      event.preventDefault(); this.userInput = ''; return;
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    if (this.historyIndex === this.history.length) this.draft = this.userInput;
    this.historyIndex = Math.max(0, Math.min(this.history.length, this.historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
    this.userInput = this.history[this.historyIndex] ?? this.draft;
  }

  private resetTranscript(): void {
    this.lines = [{output: 'ColinOS Terminal\nExplore your virtual files with ls, cd and cat. Tab completes paths.\nType help for commands; adventure adds the Lost Signal filebase.\n'}];
  }

  private openPendingPath(): void {
    if (!this.pendingPath || !this.files.isReady()) return;
    const directory = this.files.getDirectory(this.pendingPath);
    this.pendingPath = undefined;
    if (directory) {
      this.session.path = directory.path;
      this.changeDetector.markForCheck();
      requestAnimationFrame(() => { if (!this.destroyed) this.commandInput?.nativeElement.focus(); });
    }
  }
}
