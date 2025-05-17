import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {faker} from '@faker-js/faker';
import {IMediaItem} from './media.service';
import {MediaItem} from './media.service';
import {
  faCheckCircle,
  faCircle,
  faExclamationCircle,
  faExclamationTriangle,
  faFaceAngry
} from '@fortawesome/free-solid-svg-icons';

export interface INotification {
  id: string;
  title: string;
  message: string;
  timestamp?: Date;
  media?: IMediaItem;
  classList?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

@Injectable({providedIn: 'root'})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<INotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private queue: INotification[] = [];

  show(notification: Omit<INotification, 'id'>) {
    const id = crypto.randomUUID();
    const newNotification: INotification = {id, ...notification};
    this.queue.push(newNotification);
    this.notificationsSubject.next([...this.queue]);

    if (notification.duration !== 0) {
      setTimeout(() => this.dismiss(id), notification.duration ?? 5000);
    }
  }

  dismiss(id: string) {
    this.queue = this.queue.filter(n => n.id !== id);
    this.notificationsSubject.next([...this.queue]);
  }

  clear() {
    this.queue = [];
    this.notificationsSubject.next([]);
  }

  generateRandomNotification() {
    const types: INotification['type'][] = ['info', 'success', 'warning'];
    const randomFaIcons = [faCircle, faCheckCircle,
      faExclamationCircle, faExclamationTriangle, faFaceAngry];
    const randomType = faker.helpers.arrayElement(types);
    const randomTitle = faker.hacker.phrase();
    const randomMessage = faker.lorem.sentences(faker.number.int({min: 1, max: 3}));

    const contentImage: IMediaItem = new MediaItem({
      title: randomTitle,
      id: randomTitle,
      content: {
        type: "image",
        data: faker.image.urlPicsumPhotos({
          width: 50,
          height: 50
        })
      }
    });

    const contentIcon: IMediaItem = new MediaItem({
      title: 'success',
      id: 'why',
      content: {
        type: 'icon',
        data: {
          type: "fontawesome",
          name: "fontawesome",
          svgPath: faker.helpers.arrayElement(randomFaIcons)
        }
      }
    });

    this.show({
      title: randomTitle,
      message: randomMessage,
      timestamp: faker.date.past({years: 2, refDate: new Date()}),
      type: randomType,
      media: (Math.random() > 0.5) ? contentImage : contentIcon,
      duration: faker.number.int({min: 4000, max: 10000})
    });
  }

}
