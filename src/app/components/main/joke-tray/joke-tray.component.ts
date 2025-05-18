import {Component, Input, OnInit} from '@angular/core';
import {debounceTime, Subject, throttleTime} from 'rxjs';
import {MediaItem} from '../../game/services/media.service';
import {faLaugh} from '@fortawesome/free-solid-svg-icons';
import {INotification, NotificationService} from '../../game/services/notification.service';
import {JokesService} from '../../game/services/jokes.service';
import {SoundService} from '../../game/services/sound.service';
import {RouterLink} from '@angular/router';
import {HOME_NOTIFY_CLASSES} from '../main.component';
import {faSmile} from '@fortawesome/free-regular-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TooltipDirective} from '../../game/directives/tooltip.directive';

@Component({
  selector: 'app-joke-tray',
  imports: [
    RouterLink,
    FaIconComponent,
    TooltipDirective
  ],
  styles: `
    .side-button {
      @apply hover:bg-green-500 transform-gpu transition-colors
      transition duration-300 hover:text-black
      text-nowrap uppercase
      border-l-0 border-r border-t  border-b
      rounded-xl border-white/30 py-0.5 pl-2 w-full
        -translate-x-4  hover:translate-x-2
      ;
    .icon{
      @apply text-green-500 pr-2;
    }
    }`,
  template: `
    <section class="flex flex-col space-y-4  py-2 px-2 rounded-lg">
      <button class="side-button"
              [appTooltip]="'Enter the Matrix'"
              tooltipPosition="right"
              (click)="handleRandomNotifyClick($event)">
        <fa-icon class="icon" [icon]="faSmile" />
      </button>
      <button class="side-button"
              [appTooltip]="'404 Try Me'"
              tooltipPosition="right"
              routerLink="/external/https://colinmichaels.com/404">
        <fa-icon class="icon" [icon]="faSmile" />
      </button>
      <button class="side-button"
              [appTooltip]="'Make Dad Proud'"
              tooltipPosition="right"
              (click)="handleJokeClick($event, 'dad')">
        <fa-icon class="icon" [icon]="faSmile" />
      </button>
      <button class="side-button"
              [appTooltip]="'Chuck if you dare'"
              tooltipPosition="right"
              (click)="handleJokeClick($event, 'chuck')">
        <fa-icon class="icon" [icon]="faSmile" />
      </button>
    </section>`
})
export class JokeTrayComponent implements OnInit {
  private randomJokeClicks$ = new Subject<string>();
  private notifyClicks$ = new Subject<{ title: string; message: string }>();

  constructor(
    private joke: JokesService,
    private soundService: SoundService,
    private notificationService: NotificationService,
  ) {
  }

  ngOnInit(): void {
    this.loadSubjects();
  }

  notify(title = 'Notification', message = '') {
    this.notificationService.show({
      title: title, message: message, type: 'success', duration: 10 * 1000, classList: HOME_NOTIFY_CLASSES,
    })
  }

  private loadSubjects() {
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
            console.warn('tye', type);
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

  handleJokeClick(event: MouseEvent, type = 'random') {
    event.preventDefault();
    event.stopPropagation();
    this.randomJokeClicks$.next(type);
  }

  handleRandomNotifyClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.notifyClicks$.next({title: 'Random Notification', message: 'What did you expect to happen here?'});
  }

  private getDadJoke() {
    this.joke.getJoke('dad').pipe(
      debounceTime(1000)
    ).subscribe((res: any) => {
      if (res && res.status === 200) {
        console.warn('dad', res);
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
          classList: HOME_NOTIFY_CLASSES,
          media: icon,
          duration: 10 * 1000,
        })

      }
    });
  }

  private getChuckJoke() {
    this.joke.getJoke('chuck')
      .pipe(debounceTime(1000))
      .subscribe((res: any) => {
        if (res) {
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
            classList: HOME_NOTIFY_CLASSES,
            media: image,
            duration: 10 * 1000,
          }
          this.soundService.playVariant('drums', {
            volume: 0.3,
            loop: false
          });
          this.notificationService.show(notification);
        } else {
          this.notify('Error', 'No jokes today!');
        }
      })
  }

  protected readonly faSmile = faSmile;
}
