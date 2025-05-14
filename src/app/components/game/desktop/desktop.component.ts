import {Component, OnInit} from '@angular/core';
import {NgForOf} from "@angular/common";
import {LevelLoaderComponent} from '../utils/level-loader/level-loader.component';
import {AppWindowComponent} from '../templates/app-window/app-window.component';
import {GameLevel} from '../services/game-config.service';
import {TypewriterService} from '../services/typewriter.service';
import {SoundService} from '../services/sound.service';
import {UserService} from '../services/user.service';
import {OverlayService} from '../services/overlay.service';
import {ApplicationManagerService} from '../services/application-manager.service';
import {SystemTrayComponent} from '../system/system-tray/system-tray.component';
import {NotificationServerComponent} from '../utils/notifications-server/notifications-server.component';
import {NotificationService} from '../services/notification.service';
import {MediaItem} from '../services/media.service';
import {DockComponent} from '../system/dock/dock.component';
import {faFile, faInfo, faServer, faTrophy} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-desktop',
  standalone: true,
  preserveWhitespaces: true,
  imports: [
    AppWindowComponent,
    LevelLoaderComponent,
    NgForOf,
    SystemTrayComponent,
    NotificationServerComponent,
    DockComponent,
    FaIconComponent,
  ],
  templateUrl: './desktop.component.html',
  styles: ``
})
export class DesktopComponent implements OnInit {
  showIntro = false;
  overlayImagePath = 'assets/images/overlays/cracked_corner.webp';
  private activeLevel: GameLevel | undefined;


  constructor(private typewriter: TypewriterService,
              public appManager: ApplicationManagerService,
              private soundService: SoundService,
              private overlay: OverlayService,
              private notify: NotificationService,
              private userService: UserService) {
  }

  ngOnInit() {
    if(localStorage.getItem('user') === null) {
      this.showIntro = true;
    }
  }

  onBeginInvestigation() {
    this.showIntro = false;
    this.showNotificationUpdates();
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

  private showNotificationUpdates() {
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
            name: "fa fa-trophy text-base",
            svgPath: faTrophy
          }
        }
      }),
      duration: 12 * 1000
    });
    this.notify.show({
      title: 'NEW APP: Activity Monitor',
      message: 'Another game play mechanic is being added.',
      type: 'info',
      media: new MediaItem({
        id: '',
        title: 'New Version', // todo wire in the media display compoment to show all types of media.
        content: {
          type: 'icon',
          data: {
            type: "fontawesome",
            name: "text-base",
            svgPath: faInfo
          }
        }
      }),
      duration: 5 * 1000
    });
    this.notify.show({
      title: 'Dock and Icons ',
      message: 'Working new app icons and dock functionality.',
      type: 'info',
      media: new MediaItem({
        id: '',
        title: 'New Version', // todo wire in the media display compoment to show all types of media.
        content: {
          type: 'icon',
          data: {
            type: "fontawesome",
            name: "text-base",
            svgPath: faInfo
          }
        }
      }),
      duration: 5 * 1000
    });
    this.notify.show({
      title: 'Game Play Mechanics',
      message: 'More functionality being added.',
      type: 'info',
      media: new MediaItem({
        id: '',
        title: 'New Version', // todo wire in the media display compoment to show all types of media.
        content: {
          type: 'icon',
          data: {
            type: "fontawesome",
            name: "text-base",
            svgPath: faInfo
          }
        }
      }),
      duration: 5 * 1000
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

  clickedOnDesktop(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      console.warn('clickedOnDesktop', event);
      this.appManager.setApplicationFocus('desktop');
    }

  }

  protected readonly faFile = faFile;

  openApp(id: string) {
    this.appManager.openApplication(id);
  }

  protected readonly faServer = faServer;
}
