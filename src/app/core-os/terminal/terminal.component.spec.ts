import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';
import {FileSystemService} from '@core-os/filesystem/file-system.service';
import {ApplicationManagerService} from '@core-os/app-registry/application-manager.service';
import {TERMINAL_ADVENTURE} from './terminal-adventure';
import {TerminalComponent} from './terminal.component';

describe('TerminalComponent', () => {
  let fixture: ComponentFixture<TerminalComponent>;
  let terminal: TerminalComponent;
  let ready: BehaviorSubject<boolean>;
  let start: jasmine.Spy;
  let apps: jasmine.SpyObj<ApplicationManagerService>;

  beforeEach(async () => {
    ready = new BehaviorSubject(true);
    start = jasmine.createSpy('start').and.resolveTo('/Documents/Lost Signal');
    apps = jasmine.createSpyObj('apps', ['getFocusedAppId', 'openApplication', 'closeApplication']);
    apps.getFocusedAppId.and.returnValue('cli-2');
    await TestBed.configureTestingModule({
      imports: [TerminalComponent],
      providers: [
        {provide: FileSystemService, useValue: {
          currentDir$: new BehaviorSubject({id: 'root', path: '/', children: []}),
          ready$: ready, whenReady: () => Promise.resolve(), isReady: () => ready.value,
          getDirectory: (path: string) => ({path, children: []}),
        }},
        {provide: ApplicationManagerService, useValue: apps},
        {provide: TERMINAL_ADVENTURE, useValue: {start}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TerminalComponent);
    terminal = fixture.componentInstance;
    fixture.detectChanges();
  });

  async function command(input: string) {
    terminal.userInput = input;
    await terminal.submit();
    fixture.detectChanges();
  }

  it('preserves repeated commands in order and restores an unfinished draft after history navigation', async () => {
    await command('whoami');
    await command('whoami');
    expect(terminal.lines.filter(line => line.command === 'whoami').length).toBe(2);
    terminal.userInput = 'cat unfinished';
    const key = (name: string) => terminal.onKeydown(new KeyboardEvent('keydown', {key: name}));
    key('ArrowUp');
    expect(terminal.userInput).toBe('whoami');
    key('ArrowUp');
    expect(terminal.userInput).toBe('whoami');
    key('ArrowDown'); key('ArrowDown');
    expect(terminal.userInput).toBe('cat unfinished');
    await command('clear');
    expect(terminal.lines).toEqual([]);
  });

  it('renders command input as plain text and closes the actual terminal instance on exit', async () => {
    await command('<img src=x onerror=alert(1)>');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('<img');
    await command('exit');
    expect(apps.closeApplication).toHaveBeenCalledWith('cli-2');
  });

  it('does not display a pending adventure or another account’s scrollback after identity suspension', async () => {
    let finish!: (path: string) => void;
    start.and.returnValue(new Promise<string>(resolve => finish = resolve));
    terminal.userInput = 'adventure';
    const pending = terminal.submit();
    await Promise.resolve();
    ready.next(false);
    finish('/Documents/Lost Signal');
    await pending;
    expect(terminal.session.path).toBe('/');
    expect(terminal.lines.some(line => !!line.command)).toBeFalse();
    expect(terminal.busy).toBeFalse();
  });

  it('recovers from an installation failure without clearing the entered command from the transcript', async () => {
    start.and.rejectWith(new Error('The folder already exists.'));
    await command('adventure');
    expect(terminal.lines.at(-1)?.output).toBe('The folder already exists.');
    expect(terminal.lines.at(-1)?.command).toBe('adventure');
    expect(terminal.busy).toBeFalse();
  });
});
