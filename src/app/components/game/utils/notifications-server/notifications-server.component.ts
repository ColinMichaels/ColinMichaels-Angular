import {ChangeDetectorRef, Component, DestroyRef, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {INotification, NotificationService} from '../../services/notification.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {delay} from 'rxjs';
import {MediaComponent} from '../../templates/media/media.component';
import {TimeAgoPipe} from '../../../../pipes/time-ago,pipe';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faTimes} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-notification-server',
  standalone: true,
  imports: [CommonModule, MediaComponent, TimeAgoPipe,FontAwesomeModule],
  templateUrl: './notifications-server.component.html',
  styles: ``
})
export class NotificationServerComponent implements OnInit {
  notifications: INotification[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private notify: NotificationService,
    private destroyRef: DestroyRef) {}

  ngOnInit(): void {
    this.notify.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((n: INotification[]) => {
        this.notifications = n;
        queueMicrotask(() => Promise.resolve().then(() => this.detectChanges()));
      });
  }

  dismiss(id: string) {
    this.notify.dismiss(id);
  }

  async clearAllWithEffect() {
    const reversed = [...this.notifications].reverse();
    for (let i = 0; i < reversed.length; i++) {
      this.dismiss(reversed[i].id);
      await new Promise(res => setTimeout(res, 60));
    }
  }

  detectChanges() {
    this.cdr.detectChanges();
  }

  clearNotifications() {
    this.notify.clear()
  }

  protected readonly setTimeout = setTimeout;
  protected readonly delay = delay;
  protected readonly faTimes = faTimes;
}
