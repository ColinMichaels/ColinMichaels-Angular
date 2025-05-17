import {Component, OnInit} from '@angular/core';
import {ResumeComponent} from '../resume/resume.component';
import {NgClass} from '@angular/common';
import {SocialsComponent} from '../socials/socials.component';
import {NotificationService} from '../game/services/notification.service';
import {User, UserService} from '../game/services/user.service';
import {WindowHeaderComponent} from '../game/templates/app-window/window-header/window-header.component';

@Component({
  selector: 'app-main',
  imports: [ResumeComponent, NgClass, SocialsComponent, WindowHeaderComponent],
  templateUrl: './main.component.html',
  standalone: true,
  styleUrl: `./home-page.scss`
})
export class MainComponent implements OnInit{
  isResume= false;
  user = new User();

  constructor(
    private notificationService: NotificationService,
    private userService: UserService
  ) {
    this.user = this.userService.user;
  }

  ngOnInit() {
    if(this.user){
      this.notify('Welcome back ' , (this.user?.name || '') + '');
    }
  }

  toggleResume() {
    this.isResume = !this.isResume;
  }

  notify(title = 'Notification', message = '') {
    this.notificationService.show({
      title,
      message
    });
  }

  notifyRandom() {
    /** Todo: create random responses and a way to get them in the notification service */
    this.notify('Notification', 'Hello World!');
  }

}
