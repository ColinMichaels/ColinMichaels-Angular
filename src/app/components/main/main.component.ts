import {Component, OnInit} from '@angular/core';
import {ResumeComponent} from '../resume/resume.component';
import {SocialsComponent} from '../socials/socials.component';
import {INotification, NotificationService} from '../game/services/notification.service';
import {User, UserService} from '../game/services/user.service';
import {WindowHeaderComponent} from '../game/templates/app-window/window-header/window-header.component';
import {RouterLink} from '@angular/router';
import {JokesService} from '../game/services/jokes.service';
import {MediaItem} from '../game/services/media.service';
import {debounceTime, Subject, throttleTime} from 'rxjs';
import {SoundService} from '../game/services/sound.service';
import {MainHeaderComponent} from './main-header.component';
import {MainSubHeaderComponent} from './main-sub-header.component';
import {faLaugh} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-main',
  imports: [ResumeComponent, SocialsComponent, WindowHeaderComponent, RouterLink, MainHeaderComponent, MainSubHeaderComponent],
  templateUrl: './main.component.html',
  standalone: true,
  styleUrl: `./home-page.scss`
})
export class MainComponent implements OnInit{
  showResume = false;
  user = new User();
  private randomJokeClicks$ = new Subject<string>();
  private notifyClicks$ = new Subject<{ title: string; message: string }>();

  private readonly homeNotificationsClasses = 'bg-black/80 text-green-500 border-2 border-green-500';

  constructor(
    private notificationService: NotificationService,
    private userService: UserService,
    private joke: JokesService,
    private soundService: SoundService,
  ) {
    this.user = this.userService.user;
  }

  ngOnInit() {
    if(this.user){
      this.notify('Welcome back ' , (this.user?.name || '') + '');
    }
    this.randomJokeClicks$
      .pipe(
        throttleTime(1000)
      )
      .subscribe((type) => {
        switch (type) {
          case 'random':
            this.notify('Joke', 'What did you expect to happen here?');
            break;
          case 'chuck':
            this.getChuckJoke();
            break;
          case 'dad' :
            console.warn('tye',type);
            this.getDadJoke()
            break;
        }
      });

    this.notifyClicks$
      .pipe(
        debounceTime(200)
      ).subscribe(({title, message}) => {
        this.notify(title, message);
    });
  }

  toggleResume() {
    this.showResume = !this.showResume;
  }

  notify(title = 'Notification', message = '') {
    this.notificationService.show({
      title: title, message: message, type: 'success', duration: 10 * 1000, classList: this.homeNotificationsClasses,
    })
  }

  handleJokeClick(event: MouseEvent, type = 'random') {
    event.preventDefault();
    event.stopPropagation();
    this.randomJokeClicks$.next(type);
  }

  handleRandomNotifyClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.notifyClicks$.next({ title: 'Random Notification', message: 'What did you expect to happen here?' });
  }

  private getDadJoke() {
    this.joke.getJoke('dad').pipe(
      debounceTime(1000)
    ).subscribe((res:any) => {
      if(res && res.status === 200){
        console.warn('dad',res);
        const icon: MediaItem = new MediaItem({
          id: res.id,
          title: 'Dad',
          content: {
            type: "icon",
            data: {
              type: 'fontawesome',
              name: 'fa fa-laugh',
              svgPath: faLaugh
            },
          },
        })
        this.notificationService.show({
          title: 'Dad Says',
          message: res.joke,
          classList: this.homeNotificationsClasses,
          media: icon,
          duration: 10 * 1000,
        })

      }
    });
  }

  private getChuckJoke() {
      this.joke.getJoke('chuck')
        .pipe(debounceTime(1000))
        .subscribe((res:any) => {
          if(res){
            const icon = res.icon_url;
            const image: MediaItem = new MediaItem({
              id: res.id,
              title: 'Chuck Norris',
              content: {
                type: "image",
                data: icon,
              },
              url: res.url,
            });
            const notification: INotification = {
              title: 'Chuck Says',
              message: res.value,
              timestamp: new Date(res.updated_at),
              classList: this.homeNotificationsClasses,
              media: image,
              duration: 10 * 1000,
            }
            this.soundService.playVariant('drums', {
              volume: 0.3,
              loop: false
            });
             this.notificationService.show(notification);
          }else {
            this.notify('Error', 'No jokes today!');
          }
      })
  }

}
