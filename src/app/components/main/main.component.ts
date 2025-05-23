import {Component, OnInit} from '@angular/core';
import {SocialsComponent} from './socials/socials.component';
import {NotificationService} from '../game/services/notification.service';
import {User, UserService} from '../game/services/user.service';
import {WindowHeaderComponent} from '../game/templates/app-window/window-header/window-header.component';
import {MainHeaderComponent} from './main-header.component';
import {MainSubHeaderComponent} from './main-sub-header.component';
import {JokeTrayComponent} from './joke-tray/joke-tray.component';
import {SpaceXComponent} from '../game/apps/space-x/space-x.component';
import {faCode, faExclamationTriangle, faPersonDigging} from '@fortawesome/free-solid-svg-icons';
import {PatchEditorComponent} from '../game/apps/music-apps/patch-editor/patch-editor.component';
import {TailwindPreviewComponent} from '../game/apps/tailwind-preview/tailwind-preview.component';
import {TooltipExamplesComponent} from '../game/apps/tooltip-examples/tooltip-examples.component';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TaskAppComponent} from '../game/apps/task-app/task-app.component';
import {HideOnScrollDirective} from '../game/directives/hide-on-scroll.directive';
import {WeatherComponent} from '../game/apps/weather/weather.component';

export const HOME_NOTIFY_CLASSES = 'bg-black/80 text-green-500 border-2 border-green-500';

@Component({
  selector: 'app-main',
  imports: [SocialsComponent, WindowHeaderComponent, MainHeaderComponent, MainSubHeaderComponent, JokeTrayComponent, SpaceXComponent, PatchEditorComponent, TailwindPreviewComponent, TooltipExamplesComponent, FaIconComponent, TaskAppComponent, HideOnScrollDirective, WeatherComponent],
  templateUrl: './main.component.html',
  standalone: true,
  styleUrl: `./home-page.scss`
})
export class MainComponent implements OnInit{
  user = new User();

  constructor(
    private notificationService: NotificationService,
    private userService: UserService

  ) {
    this.user = this.userService.user;
  }

  ngOnInit() {
    if (this.user?.name !== '') {
      this.notificationService.show({
        title: 'Welcome back ',
        message: (this.user?.name || '') + '',
        classList: HOME_NOTIFY_CLASSES
      });
    }
  }

  protected readonly faCode = faCode;
  protected readonly faExclamationTriangle = faExclamationTriangle;
  protected readonly faPersonDigging = faPersonDigging;
}
