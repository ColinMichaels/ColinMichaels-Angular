import {Component, OnInit} from '@angular/core';
import {ResumeComponent} from './resume/resume.component';
import {SocialsComponent} from './socials/socials.component';
import {NotificationService} from '../game/services/notification.service';
import {User, UserService} from '../game/services/user.service';
import {WindowHeaderComponent} from '../game/templates/app-window/window-header/window-header.component';
import {MainHeaderComponent} from './main-header.component';
import {MainSubHeaderComponent} from './main-sub-header.component';
import {JokeTrayComponent} from './joke-tray/joke-tray.component';

export const HOME_NOTIFY_CLASSES = 'bg-black/80 text-green-500 border-2 border-green-500';

@Component({
  selector: 'app-main',
  imports: [ResumeComponent, SocialsComponent, WindowHeaderComponent, MainHeaderComponent, MainSubHeaderComponent, JokeTrayComponent],
  templateUrl: './main.component.html',
  standalone: true,
  styleUrl: `./home-page.scss`
})
export class MainComponent implements OnInit{
  user = new User();

  constructor(
    private notificationService: NotificationService,
    private userService: UserService,

  ) {
    this.user = this.userService.user;
  }

  ngOnInit() {
    if(this.user) {
      this.notificationService.show({
        title: 'Welcome back ',
        message: (this.user?.name || '') + '',
        classList: HOME_NOTIFY_CLASSES
      });
    }
  }




}
