import {ChangeDetectorRef, Component, DestroyRef, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {INotification, NotificationService} from '../../services/notification.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MediaComponent} from '../../templates/media/media.component';
import {TimeAgoPipe} from '../../../../pipes/time-ago.pipe';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faTimes} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-notification-server',
  standalone: true,
  imports: [CommonModule, MediaComponent, TimeAgoPipe, FontAwesomeModule],
  templateUrl: './notifications-server.component.html',
  styles: ``
})
export class NotificationServerComponent implements OnInit {
  notifications: INotification[] = [];
  // Default notification class moved into a variable for easier maintenance
  defaultClass = 'bg-zinc-700/95 text-white';


  constructor(
    private cdr: ChangeDetectorRef,
    private notify: NotificationService,
    private destroyRef: DestroyRef) {}


// Extracted method to determine the notification type class
  getNotificationTypeClass(type: string | undefined): string {
    const typeClasses: { [key: string]: string } = {
      info: 'bg-teal-500/30',
      warning: 'bg-yellow-500/30',
      success: 'bg-green-500/30',
    };
    return type ? typeClasses[type] : '';
  }

// Simplified the logic for clearing notifications
  async handleClearAllClick(): Promise<void> {
    if (this.notifications.length > 1) {
     await this.clearAllWithEffect();
    }
  }

  ngOnInit(): void {
    this.notify.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((n: INotification[]) => {
        this.notifications = n;
        queueMicrotask(() => Promise.resolve().then(() => this.detectChanges()));
      });
  }

  dismiss(id?: string) {
    if (!id) return;
    this.notify.dismiss(id);
  }

  async clearAllWithEffect() {
    const reversed = [...this.notifications].reverse();
    for (let i = 0; i < reversed.length; i++) {
      if (reversed[i].id) {
        this.dismiss(reversed[i].id);
        }
      await new Promise(res => setTimeout(res, 30));
    }
  }

  detectChanges() {
    this.cdr.detectChanges();
  }

  get multipleNotifications() {
    return this.notifications.length > 1;
  }

  protected readonly faTimes = faTimes;
}
