import { Injectable } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ClockService {
  clockSubject = new BehaviorSubject<Date>(new Date());
  public clock$ = this.clockSubject.asObservable();

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
    return now.toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }

  getTime(is24Hour: boolean): string {
    const now = this.clockSubject.value;
    return now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !is24Hour
    });
  }
}
