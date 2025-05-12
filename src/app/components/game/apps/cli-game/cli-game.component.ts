import {Component, DestroyRef, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TypewriterService, TypingMode} from '../../services/typewriter.service';
import {SoundService} from '../../services/sound.service';
import {NgClass} from '@angular/common';
import {UserService} from '../../services/user.service';
import {CLIService, CLIResponse} from '../../services/cli.service';
import {AiChatService} from '../../services/ai-chat.service';
import {GameConfigService} from '../../services/game-config.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {WindowManagerService} from '../../services/window-manager.service';
import {take} from 'rxjs';
import {NotificationService} from '../../services/notification.service';
import {MediaItem} from '../../services/media.service';
import {faThumbsUp} from '@fortawesome/free-solid-svg-icons';


export interface ITerminalMessage {
  text: string;
  agent: 'user' | 'system';
  mode?: TypingMode;
}

@Component({
  selector: 'app-cli-game',
  imports: [
    FormsModule,
    NgClass
  ],
  standalone: true,
  templateUrl: './cli-game.component.html',
  styleUrls: ['./cli-game.component.scss'],
})
export class CliGameComponent implements OnInit {
  terminalMessages: ITerminalMessage[] = [];
  chatLogIndex = 0;
  typedText = '';
  userInput = '';

  @ViewChild('input', {static: true}) input: ElementRef | undefined;


  currentMode: TypingMode = 'default';

  private readonly CLI_STATUS = {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    CONNECTION_ERROR: -1,
    CLEAR_SCREEN: -2,
  };

  constructor(
    private typewriter: TypewriterService,
    private soundService: SoundService,
    private cli: CLIService,
    private gameConfig: GameConfigService,
    private terminalManager: WindowManagerService,
    private aiChat: AiChatService,
    private userService: UserService,
    private notify: NotificationService,
    private destroyRef: DestroyRef
  ) {
    this.typewriter.typedText$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((text) => {
        this.typedText = text;
      })
  }

  ngOnInit() {
    this.soundService.bootAudio();
    this.typewriter.activeMode$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mode => {
        this.currentMode = mode;
      });
  }


  writeLine(text: string) {
    this.typewriter.enqueueLine({
      text,
      speed: 40,
      agent: 'system',
    });
  }

  async handleInput() {
    const rawUserInput = this.userInput;
    const inputCleaned = rawUserInput.trim().toLowerCase();

    if (!inputCleaned) {
      this.userInput = ''; // Clear if only whitespace or empty
      return;
    }

    const userLevelStart = this.userService.previousLevel;
    this._addUserMessageToHistory(rawUserInput, this.currentMode);

    if (this.userService.user.level < 1) {
      await this._handleInitialUserSetup(rawUserInput, inputCleaned.split(' ')[0], userLevelStart);
    } else {
      const response = this.cli.executeInput(inputCleaned);
      await this._processCliResponse(response, rawUserInput, userLevelStart);
    }

    this._finalizeInputHandling();
  }

  private _addUserMessageToHistory(userInput: string, currentMode: TypingMode): void {
    if (!this.terminalMessages.find(message => message.text === userInput)) {
      this.terminalMessages.push({
        text: userInput,
        agent: 'user',
        mode: currentMode,
      });
    }
  }

  private async _handleInitialUserSetup(rawUserInput: string, initialCmd: string, userLevelStart: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.typewriter.enqueueLine({
        text: `INPUT RECEIVED: "${rawUserInput.toUpperCase()}"`,
        agent: 'system',
        speed: 10,
        onBegin: () => {
          this.soundService.play('response_good.mp3', { volume: 0.4, forceRestart: true });
        },
        onComplete: async () => {
          this.userService.updateUser({ level: 1, name: initialCmd });
          await this.gameConfig.loadLevels();
          this.showLevelMessage(this.userService.user.level, userLevelStart);
          resolve();
        },
      });
    });
  }

  private async _processCliResponse(response: CLIResponse, rawUserInput: string, userLevelStart: number): Promise<void> {
    switch (response.status) {
      case this.CLI_STATUS.SUCCESS:
        this._handleCliSuccess(response, rawUserInput);
        break;
      case this.CLI_STATUS.CREATED:
        await this._handleCliCreated(response, userLevelStart);
        break;
      case this.CLI_STATUS.BAD_REQUEST:
      case this.CLI_STATUS.UNAUTHORIZED:
      case this.CLI_STATUS.NOT_FOUND:
        this.writeLine(response.output);
        break;
      case this.CLI_STATUS.CONNECTION_ERROR:
        this._handleCliConnectionError();
        break;
      case this.CLI_STATUS.CLEAR_SCREEN:
        this.typewriter.clear();
        break;
      default:
        if (response.error) {
          this.writeLine(response.error);
        } else if (response.output) {
          this.writeLine(response.output);
        } else {
          this.writeLine('An unexpected error occurred with the command.');
        }
        break;
    }
    response.followUp?.();
  }

  private _handleCliSuccess(response: CLIResponse, rawUserInput: string): void {
    if (response.output.includes('aichat >')) {
      this._handleAiChat(rawUserInput);
    } else {
      this.writeLine(response.output);
    }
  }

  private _handleAiChat(rawUserInput: string): void {
    this.aiChat.generateAiAnswer(
      `user_message: ${rawUserInput} ;`,
      {
        question: '',
        commands: this.gameConfig.getAvailableCommands(),
      }
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (res: any) => { // Consider defining a more specific type for `res`
        try {
          const cleaned = res.choices[0].message.content.replace(/[\n\r]/g, '').replace('json', '');
          const parsed = JSON.parse(cleaned);
          if (parsed.answer && parsed.message_type) {
            this.typewriter.enqueueLine({
              text: parsed.answer || 'Unknown',
              agent: 'system',
              mode: parsed.mode || 'default',
            });
          } else {
             this.typewriter.enqueueLine({
                text: 'AI response format is not recognized.',
                agent: 'system',
                mode: 'dramatic'
              });
          }
        } catch (e) {
          this.typewriter.enqueueLine({
            text: 'Unknown. Please try again. (Error parsing AI response)',
            agent: 'system',
            mode: 'dramatic',
          });
        }
      },
      error: (err) => {
        console.error('AI Chat generation failed:', err);
        this.typewriter.enqueueLine({
          text: 'Failed to get response from AI. Please try again.',
          agent: 'system',
          mode: 'dramatic',
        });
      }
    });
  }

  private async _handleCliCreated(response: CLIResponse, userLevelStart: number): Promise<void> {
    this.writeLine(response.output);
    await this.gameConfig.loadLevels();
    this.showLevelMessage(this.userService.user.level, userLevelStart);
  }

  private _handleCliConnectionError(): void {
    this.writeLine('ERROR: Could not connect to server. Please try again later.');
    this.soundService.stopAll();
    this.terminalManager.closeTerminal('cli');
  }

  private _finalizeInputHandling(): void {
    this.typewriter.lineCompleted$.pipe(take(1)).subscribe(() => {
      this.input?.nativeElement?.focus();
      this.input?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    this.userInput = '';
  }

  showLevelMessage(level = 1, userLevelStart = 1) {
    this.typewriter.enqueueLine({
      text: 'SCANNING... ██████████',
      agent: 'system',
      speed: 30,
      onBegin: () => {
        this.soundService.play('count-beep.mp3', {volume: 0.2, forceRestart: true});
      }
    });

    this.typewriter.enqueueLine({
      text: `ACCESS GRANTED: LEVEL ${this.userService.user.level}`,
      agent: 'system',
      speed: 30,
      onComplete: () => {
        if (level > userLevelStart) {
          this.soundService.play('tada.mp3', {volume: 0.7, forceRestart: true});
          this.notify.show({
            title: 'Level Up!',
            message: `You have reached level ${this.userService.user.level}.`,
            type: 'success',
            media: new MediaItem({
              title: 'success',
              id: 'why',
              content: {
                type: 'icon',
                data: {
                  name: "fa fa-thumbs-up",
                  type: "fontawesome",
                  svgPath: faThumbsUp
                }
              }
            }),
            duration: 10 * 1000
          })
        } else if (level === userLevelStart) {
          return;
        } else {
          this.soundService.play('wawa.mp3', {volume: 0.4, forceRestart: true});
          this.notify.show({
            title: 'Level Down!',
            message: `You have decreased to level ${this.userService.user.level}.`,
            type: 'success',
            media: new MediaItem({
              title: 'success',
              id: 'why',
              content: {
                type: 'icon',
                data: {
                  name: "fa fa-thumbs-down text-base",
                  type: "fontawesome",
                  svgPath: faThumbsUp
                }
              }
            }),
            duration: 10 * 1000
          })
        }

      }
    });


  }

  triggerClick() {
    const isBlank = !this.userInput || this.userInput.trim() === '';
    if (isBlank) {
      return;
    }
    if (/[^0-9]/.test(this.userInput)) {
      this.soundService.play('click-1.mp3', {volume: 0.2, loop: false, forceRestart: true});
    }

  }

  navigateHistory(number: number) {
    this.chatLogIndex += number;
    const userMessages = this.terminalMessages.filter(message => message.agent === 'user');
    if (this.chatLogIndex < 0 ) {
       this.chatLogIndex = userMessages.length -1;
    } else if (this.chatLogIndex > userMessages.length -1) {
       this.chatLogIndex = 0;
    }


    const command = userMessages[this.chatLogIndex];
    if (command && command?.text) {
      this.userInput = command.text;
    }
  }
}
