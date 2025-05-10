import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TypewriterService, TypingMode} from '../../services/typewriter.service';
import {SoundService} from '../../services/sound.service';
import {IntroOverlayComponent} from '../intro-overlay/intro-overlay.component';
import {NgClass, NgIf} from '@angular/common';
import { User, UserService} from '../../services/user.service';
import {CLIService} from '../../services/cli.service';
import {OverlayService} from '../../services/overlay.service';
import {AiChatService} from '../../services/ai-chat.service';
import {GameConfigService} from '../../services/game-config.service';

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
export class CliGameComponent implements OnInit{
  terminalMessages: ITerminalMessage[] = [];
  chatLogIndex = 0;
  typedText = '';
  userInput = '';


  currentMode: TypingMode = 'default';

  $user = new User();

  private activeLevel: any;

  constructor(
    private typewriter: TypewriterService,
    private soundService: SoundService,
    private cli: CLIService,
    private overlay: OverlayService,
    private gameConfig: GameConfigService,
    private aiChat: AiChatService,
    private userService: UserService
  ) {
    this.typewriter.typedText$
      .subscribe((text) => {
        this.typedText = text;
      })
    this.userService.user$.subscribe(user => {
      this.$user = user;
    })
  }

  ngOnInit() {
    this.soundService.bootAudio();
    this.typewriter.activeMode$.subscribe(mode => {
      this.currentMode = mode;
    });
  }



  writeLine(text: string) {
    this.soundService.play('digital-beep-2.mp3', {volume: 0.2, forceRestart: true});
    this.typewriter.enqueueLine({
      text,
      agent: 'system',
    });
  }

  handleInput() {
    const response = this.cli.executeInput(this.userInput);
    /* only add to chatlog if it is a user message */
    if(!this.terminalMessages.find(message => message.text === this.userInput)) {
      this.terminalMessages.push({
        text: this.userInput,
        agent: 'user',
        mode: this.currentMode
      });
    }

    if(this.userInput.toLowerCase() === 'exit') {
      this.overlay.hideOverlay();
      this.userInput = '';
      return;
    }
    if(this.$user.level < 1 && this.$user.name === ''){
      this.typewriter.enqueueLine({
        text: `IDENTIFICATION RECEIVED: "${this.userInput.toUpperCase()}"`,
        agent: 'system',
        speed: 40,
        onBegin: () => {
          this.soundService.play('response_good.mp3', {volume: 0.2, forceRestart: true});
        }
      })
      this.showLevelMessage(this.$user.level ++);
    }


    if(response.status === 200) {
      if(response.output.includes('aichat >')) {
        this.aiChat.generateAiAnswer(
          `user_message: ${this.userInput} ;`,
          {
            question: '',
            commands: this.gameConfig.getAvailableCommands(),
          }

        )
          .subscribe((res: any)=> {
            try {
              const cleaned = res.choices[0].message.content.replace(/[\n\r]/g, '')
                .replace('json', '');
              /** need to check if valid json if not clean it up */
              const parsed = JSON.parse(cleaned);
              console.warn('parsed', parsed);
              if (parsed.answer && parsed.message_type) {
                this.typewriter.enqueueLine({
                  text: parsed.answer || 'Unknown',
                  agent: 'system',
                  mode: parsed.mode || 'default'
                });
              }
            } catch (e) {
              this.typewriter.enqueueLine({
                text: 'Unknown. Please try again.',
                agent: 'system',
                mode: 'dramatic'
              });
            }

          });
      }
      else { this.writeLine(response.output);}
    } else if(response.status === 404 || response.status === 401) {
      this.typewriter.enqueueLine({
        text: response.output,
        agent: 'system',
        mode: 'dramatic',
        onBegin: () => {
          this.soundService.play('response_bad.mp3', { volume: 0.1 , forceRestart: true, loop: false});
        }

      })
    } else if(response.error) {
      this.writeLine(response.error);
    }

    response.followUp?.();
    this.userInput = '';
  }

  showLevelMessage(level = 1){
    this.typewriter.enqueueLine({
      text: 'SCANNING... ██████████',
      agent: 'system',
      speed: 60,
      onBegin: () => {
        this.soundService.play('count-beep.mp3', {volume: 0.2, forceRestart: true});
      },
      onComplete: () => {
        this.$user.level = level;
        this.$user.score += 1;
      }
    });

    this.typewriter.enqueueLine({
      text: `ACCESS GRANTED: LEVEL ${level}`,
      agent: 'system',
      speed: 60
    });
  }

  triggerClick() {
    const isBlank = !this.userInput || this.userInput.trim() === '';
    if (isBlank) {
      return;
    }
    if (/[^0-9]/.test(this.userInput)) {
      this.soundService.play('click-1.mp3', { volume: 0.2 });
    }

  }

  navigateHistory(number: number) {
    this.chatLogIndex += number;
    const userMessages = this.terminalMessages.filter(message => message.agent === 'user');
    if(this.chatLogIndex <= 0 || this.chatLogIndex >userMessages.length - 1) {
      this.chatLogIndex = 0;
    };
    const command = userMessages[this.chatLogIndex];
    if(command && command?.text) {
      this.userInput = command.text;
    }
  }
}
