import { ComponentFixture, TestBed } from '@angular/core/testing';
import {BehaviorSubject, of} from 'rxjs';
import {TypewriterService} from '../../services/typewriter.service';
import {SoundService} from '../../services/sound.service';
import {CLIService} from '../../services/cli.service';
import {GameConfigService} from '../../services/game-config.service';
import {ApplicationManagerService} from '../../services/application-manager.service';
import {AiChatService} from '../../services/ai-chat.service';
import {OsUserService} from '../../services/os-user.service';
import {NotificationService} from '../../services/notification.service';
import {LogService} from '../../services/log.service';

import { CliGameComponent } from './cli-game.component';

describe('CliGameComponent', () => {
  let component: CliGameComponent;
  let fixture: ComponentFixture<CliGameComponent>;
  const typewriterServiceMock = {
    typedText$: new BehaviorSubject<string>(''),
    activeMode$: new BehaviorSubject<'default' | 'system' | 'dramatic'>('default'),
    lineCompleted$: new BehaviorSubject<void>(undefined),
    enqueueLine: jasmine.createSpy('enqueueLine'),
    clear: jasmine.createSpy('clear')
  };
  const soundServiceMock = jasmine.createSpyObj<SoundService>('SoundService', ['bootAudio', 'stopAll', 'play']);
  soundServiceMock.bootAudio.and.returnValue(Promise.resolve());
  const cliServiceMock = {
    executeInput: jasmine.createSpy('executeInput').and.returnValue({status: 200, output: 'ok'})
  };
  const gameConfigServiceMock = {
    getAvailableCommands: jasmine.createSpy('getAvailableCommands').and.returnValue([]),
    loadLevels: jasmine.createSpy('loadLevels').and.returnValue(Promise.resolve())
  };
  const appManagerServiceMock = {
    closeApplication: jasmine.createSpy('closeApplication')
  };
  const aiChatServiceMock = {
    generateAiAnswer: jasmine.createSpy('generateAiAnswer').and.returnValue(of({choices: []}))
  };
  const userServiceMock = {
    user: {level: 1},
    previousLevel: 1
  };
  const notificationServiceMock = {
    show: jasmine.createSpy('show')
  };
  const loggerMock = {
    logs$: new BehaviorSubject([]),
    getLogsPage: jasmine.createSpy('getLogsPage').and.returnValue([])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CliGameComponent],
      providers: [
        {provide: TypewriterService, useValue: typewriterServiceMock},
        {provide: SoundService, useValue: soundServiceMock},
        {provide: CLIService, useValue: cliServiceMock},
        {provide: GameConfigService, useValue: gameConfigServiceMock},
        {provide: ApplicationManagerService, useValue: appManagerServiceMock},
        {provide: AiChatService, useValue: aiChatServiceMock},
        {provide: OsUserService, useValue: userServiceMock},
        {provide: NotificationService, useValue: notificationServiceMock},
        {provide: LogService, useValue: loggerMock}
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CliGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
