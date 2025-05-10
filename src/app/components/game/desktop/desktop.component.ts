import {Component, OnInit} from '@angular/core';
import {ImageOverlayComponent} from "../utils/overlay/overlay.component";
import {IntroOverlayComponent} from "../templates/intro-overlay/intro-overlay.component";
import {NgForOf, NgIf} from "@angular/common";
import {LevelLoaderComponent} from '../utils/level-loader/level-loader.component';
import {TerminalWindowComponent} from '../templates/terminal-window/terminal-window.component';
import {GameLevel} from '../services/game-config.service';
import {TypewriterService} from '../services/typewriter.service';
import {SoundService} from '../services/sound.service';
import {User, UserService} from '../services/user.service';
import {OverlayService} from '../services/overlay.service';
import {TerminalWindowManagerService} from '../services/terminal-window-manager.service';
import {CliGameComponent} from '../cli-game/cli-game.component';
import {SystemTrayComponent} from '../system/system-tray/system-tray.component';

@Component({
  selector: 'app-desktop',
  imports: [
    ImageOverlayComponent,
    IntroOverlayComponent,
    NgIf,
    LevelLoaderComponent,
    TerminalWindowComponent,
    NgForOf,
    SystemTrayComponent
  ],
  templateUrl: './desktop.component.html',
  styles: ``
})
export class DesktopComponent implements OnInit{
  showIntro = true;
  overlayImagePath = 'assets/images/overlays/cracked_corner.webp';
  private activeLevel!: GameLevel;
  $user = new User();


  constructor(private typewriter: TypewriterService,
              public terminalManager: TerminalWindowManagerService,
              private soundService: SoundService,
              private overlay: OverlayService,
              private userService: UserService) {
  }

  ngOnInit() {
    this.userService.user$.subscribe(user => {
      this.$user = user;
    });
    this.terminalManager.openTerminal('cli', CliGameComponent, 'CLI Console');
  }


  onBeginInvestigation() {
    this.showIntro = false;
    if(!this.$user.name){
      this.soundService.play('glitch-1.mp3', { volume: 0.1 , forceRestart: true});
      this.typewriter.enqueueLine({
        text: '> who_are_you?',
        agent: 'system',
        speed: 40,
      });
    } else {
      this.typewriter.enqueueLine({
        text: `Welcome back ${this.$user.name.toUpperCase()}`,
        agent: 'system',
        speed: 40,
        mode: "system"
      });
      this.typewriter.enqueueLine({
        text: `You are currently on Level: ${this.$user.level}`,
        agent: 'system',
        speed: 10,
      });
    }
    this.overlay.showOverlay({
      imagePath: this.overlayImagePath,
      visible: true,
      zIndex: 10000,
      opacity: 1,
      transition: 'opacity 0.3s ease-in-out'
    });

  }

  onLevelLoaded(level: GameLevel) {
    this.activeLevel = level;
    // Init game logic, commands, files, etc.

  }

  onLevelLoadFailed(message: string) {
    this.typewriter.enqueueLine({
      text: message,
      agent: 'system',
      mode: 'dramatic',
      onBegin: () => {
        this.soundService.play('beep-warning.mp3', { volume: 0.4 , forceRestart: true, loop: false});
      }
    })
  }

}
