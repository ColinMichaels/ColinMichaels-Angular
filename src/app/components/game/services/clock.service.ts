import {computed, Injectable} from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ClockService {
  clockSubject = new BehaviorSubject<Date>(new Date());
  public clock$ = this.clockSubject.asObservable();

  // Combine date and time into a proper display format
  timeDisplay = computed(() => {
    const date = this.getDate();
    const time = this.getTime(false);
    return `${date} ${time}`;
  });

  constructor() {
    interval(1000)
      .pipe(
        startWith(0),
        map(() => new Date())
      )
      .subscribe(date => this.clockSubject.next(date));
  }

  getDate(): string {
    const now = this.clockSubject.value;
    return this.formatDate(now);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString( 'en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }

  formatTime(date: Date, is24Hour: boolean): string {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !is24Hour

    });
  }

  getTime(is24Hour: boolean): string {
    const now = this.clockSubject.value;
    return this.formatTime(now, is24Hour);
  }

  updateTime(): void {
    this.clockSubject.next(new Date());
  }

}
