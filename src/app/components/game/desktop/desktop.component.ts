import {Component, OnInit} from '@angular/core';
import {ImageOverlayComponent} from "../utils/overlay/overlay.component";
import {IntroOverlayComponent} from "../templates/intro-overlay/intro-overlay.component";
import {NgForOf, NgIf} from "@angular/common";
import {LevelLoaderComponent} from '../utils/level-loader/level-loader.component';
import {TerminalWindowComponent} from '../templates/terminal-window/terminal-window.component';
import {GameLevel} from '../services/game-config.service';
import {TypewriterService} from '../services/typewriter.service';
import {SoundService} from '../services/sound.service';
import {UserService} from '../services/user.service';
import {OverlayService} from '../services/overlay.service';
import {TerminalWindowManagerService} from '../services/terminal-window-manager.service';
import {SystemTrayComponent} from '../system/system-tray/system-tray.component';
import {NotificationServerComponent} from '../utils/notifications-server/notifications-server.component';
import {NotificationService} from '../services/notification.service';
import {MediaItem} from '../services/media.service';

@Component({
  selector: 'app-desktop',
  imports: [
    ImageOverlayComponent,
    IntroOverlayComponent,
    NgIf,
    LevelLoaderComponent,
    TerminalWindowComponent,
    NgForOf,
    SystemTrayComponent,
    NotificationServerComponent,
  ],
  templateUrl: './desktop.component.html',
  styles: ``
})
export class DesktopComponent implements OnInit {
  showIntro = false;
  overlayImagePath = 'assets/images/overlays/cracked_corner.webp';
  private activeLevel!: GameLevel;


  constructor(private typewriter: TypewriterService,
              public terminalManager: TerminalWindowManagerService,
              private soundService: SoundService,
              private overlay: OverlayService,
              private notify: NotificationService,
              private userService: UserService) {
  }

  ngOnInit() {
    this.terminalManager.openTerminal('cli');
    if(localStorage.getItem('user') === null) {
      this.showIntro = true;
    }
  }


  onBeginInvestigation() {
    this.showIntro = false;
    this.notify.show({
      title: 'Update Available',
      message: 'A new version is ready to explore.',
      type: 'warning',
      media: new MediaItem({
        id: '',
        title: 'New Version', // todo wire in the media display compoment to show all types of media.
        content: {
          type: 'icon',
          data: {
            type: "fontawesome",
            name: "fa fa-trophy text-base"
          }
        }
      }),
      duration: 12 * 1000
    });
    this.notify.show({
      title: 'Try the new Test Buttons',
      message: 'this is just temporary.',
      type: 'info',
      duration: 5 * 1000
    });
    this.notify.show({
      title: 'New Player Config App',
      message: 'now available check it out',
      type: 'info',
      duration: 5 * 1000
    });
    if(!this.userService.user.name){
      this.soundService.play('glitch-1.mp3', { volume: 0.1 , forceRestart: true});
      this.typewriter.enqueueLine({
        text: '> who_are_you?',
        agent: 'system',
        speed: 40,
      });
    } else {
      this.typewriter.enqueueLine({
        text: `Welcome back ${this.userService.user.name.toUpperCase()}`,
        agent: 'system',
        speed: 40,
        mode: "system"
      });
      this.typewriter.enqueueLine({
        text: `You are currently on Level: ${this.userService.user.level}`,
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
    this.typewriter.enqueueLine({
      text: `Level ${this.userService.user.level} loaded.`,
      agent: 'system',
      speed: 40,
      mode: 'system'
    })
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

  clearUser() {
    localStorage.removeItem('user');
    this.soundService.playVariant('click', { volume: 0.4 , forceRestart: true, loop: false});
    this.onBeginInvestigation();
  }

  sendNotification() {
    this.soundService.playVariant('click', { volume: 0.4 , forceRestart: true, loop: false});
   this.notify.generateRandomNotification();
  }
}
