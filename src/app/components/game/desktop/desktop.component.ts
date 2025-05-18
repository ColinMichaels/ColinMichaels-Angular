import {Component, DestroyRef, OnInit} from '@angular/core';
import {NgForOf} from "@angular/common";
import {LevelLoaderComponent} from '../utils/level-loader/level-loader.component';
import {AppWindowComponent} from '../templates/app-window/app-window.component';
import {GameLevel} from '../services/game-config.service';
import {TypewriterService} from '../services/typewriter.service';
import {SoundService} from '../services/sound.service';
import {UserService} from '../services/user.service';
import {OverlayService} from '../services/overlay.service';
import {
  APP_ID,
  ApplicationManagerService, WINDOW_HEIGHT_MIN,
  WINDOW_WIDTH_MAX,
  WINDOW_WIDTH_MIN
} from '../services/application-manager.service';
import {SystemTrayComponent} from '../system/system-tray/system-tray.component';
import {NotificationService} from '../services/notification.service';
import {MediaItem} from '../services/media.service';
import {DockComponent} from '../system/dock/dock.component';
import {faCircle, faFile, faInfo, faServer, faTrophy} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent, FaStackComponent, FaStackItemSizeDirective} from '@fortawesome/angular-fontawesome';
import {ActivatedRoute} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ContextMenuBuilder, ContextMenuService} from '../services/context-menu.service';
import {TooltipDirective} from '../directives/tooltip.directive';
import {SoundPlayerComponent} from '../system/sound-player/sound-player.component';

@Component({
  selector: 'app-desktop',
  standalone: true,
  preserveWhitespaces: true,
  imports: [
    AppWindowComponent,
    LevelLoaderComponent,
    NgForOf,
    SystemTrayComponent,
    DockComponent,
    FaIconComponent,
    FaStackComponent,
    FaStackItemSizeDirective,
    TooltipDirective,
    SoundPlayerComponent,
  ],
  templateUrl: './desktop.component.html',
  styles: ``
})
export class DesktopComponent implements OnInit {
  showIntro = false;
  overlayImagePath = 'assets/images/overlays/cracked_corner.webp';
  backgroundImage = 'assets/images/backgrounds/night.webp';

  constructor(private typewriter: TypewriterService,
              public appManager: ApplicationManagerService,
              private contextMenuService: ContextMenuService,
              private soundService: SoundService,
              private overlay: OverlayService,
              private notify: NotificationService,
              private userService: UserService,
              private route: ActivatedRoute,
              private destroyRef: DestroyRef) {
  }

  ngOnInit() {
    if (localStorage.getItem('user') === null) {
      this.onBeginInvestigation();
    }
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const app = params.get('app');
        if (app) {
          this.openApp(app);
        }
      })
  }

  openApp(id: string) {
    this.appManager.openApplication(id);
  }

  /** CLICK EVENTS **/
  onDoubleClicked(event: MouseEvent) {
    if (event.target === event.currentTarget) {
        this.appManager.closeAllApps();
    }
  }

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.contextMenuService.open(
      new ContextMenuBuilder('desktop', ['admin'])
        .addItem({
          label: 'Open',
          action: () => {
            this.openApp(APP_ID.finder);
          }}).addSubmenu(
        'Open With',
        [
          {
            label: 'TEST',
            action: () => {}
          },
          {
            label: 'TEST2',
            action: () => {}
          }
        ]
      ).addItem({
        label: 'Settings',
        action: () => {
          this.openApp(APP_ID.system_settings);
        }
      }).build(),
      { x: event.clientX, y: event.clientY }
    );
  }

  onClickWindow(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.appManager.setApplicationFocus('desktop', event.offsetX, event.offsetY);
    }
  }

/*  onResize({ width, height }: { width: number; height: number }) {
    console.log(`App resized to width: ${width}, height: ${height}`);
    // Perform any necessary actions when resizing occurs
  }*/

  onBeginInvestigation() {
    this.showIntro = false;
    this.showNotificationUpdates();
    if (!this.userService.user.name) {
      this.soundService.play('glitch-1.mp3', {volume: 0.1, forceRestart: true});
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

  onLevelLoadFailed(message: string) {
    this.typewriter.enqueueLine({
      text: message,
      agent: 'system',
      mode: 'dramatic',
      onBegin: () => {
        this.soundService.play('beep-warning.mp3', {volume: 0.4, forceRestart: true, loop: false});
      }
    })
  }

  onLevelLoaded(level: GameLevel) {
    this.typewriter.enqueueLine({
      text: `Level ${this.userService.user.level} loaded.`,
      agent: 'system',
      speed: 40,
      mode: 'system'
    })
    // Init game logic, commands, files, etc.
  }

  private showNotificationUpdates() {
    this.notify.show({
      title: 'Update Available',
      message: 'A new version is ready to explore.',
      type: 'warning',
      media: new MediaItem({
        id: '',
        title: 'New Version',
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
        title: 'New Version',
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
        title: 'New Version',
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
        title: 'New Version',
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

  /* ICONS */
  protected readonly faFile = faFile;
  protected readonly faServer = faServer;
  protected readonly faInfo = faInfo;
  protected readonly faCircle = faCircle;
  protected readonly WINDOW_WIDTH_MIN = WINDOW_WIDTH_MIN;
  protected readonly WINDOW_WIDTH_MAX = WINDOW_WIDTH_MAX;
  protected readonly WINDOW_HEIGHT_MIN = WINDOW_HEIGHT_MIN;

}
