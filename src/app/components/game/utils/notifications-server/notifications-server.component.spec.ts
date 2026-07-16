import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';

import {INotification, NotificationService} from '../../services/notification.service';
import {NotificationServerComponent} from './notifications-server.component';

describe('NotificationServerComponent', () => {
  let fixture: ComponentFixture<NotificationServerComponent>;
  let notifications: BehaviorSubject<INotification[]>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    notifications = new BehaviorSubject<INotification[]>([]);
    notificationService = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['dismiss'],
      {notifications$: notifications.asObservable()},
    );

    await TestBed.configureTestingModule({
      imports: [NotificationServerComponent],
      providers: [{provide: NotificationService, useValue: notificationService}],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationServerComponent);
    fixture.detectChanges();
  });

  it('renders a named dismiss button for each notification', () => {
    notifications.next([{id: 'notice-1', title: 'Update', message: 'Ready'}]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const dismissButton = element.querySelector<HTMLButtonElement>('.notification-dismiss');
    dismissButton?.click();

    expect(dismissButton?.getAttribute('aria-label')).toBe('Dismiss Update notification');
    expect(notificationService.dismiss).toHaveBeenCalledOnceWith('notice-1');
  });

  it('offers one clear-all control and dismisses every visible notification', fakeAsync(() => {
    notifications.next([
      {id: 'notice-1', title: 'First', message: 'One'},
      {id: 'notice-2', title: 'Second', message: 'Two'},
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const clearButtons = element.querySelectorAll<HTMLButtonElement>('.notification-clear-all');
    clearButtons[0].click();
    tick(100);

    expect(clearButtons.length).toBe(1);
    expect(notificationService.dismiss.calls.allArgs()).toEqual([['notice-2'], ['notice-1']]);
  }));
});
