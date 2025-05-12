import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClockService } from '../../services/clock.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-clock-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clock-display.component.html',
  styles: ``
})
export class ClockDisplayComponent implements OnInit, OnDestroy {
  private clock = inject(ClockService);
  private timerSubscription!: Subscription;

  is24Hour = signal(false); // system variable toggle

 timerDisplay = '';



  ngOnInit() {

    this.clock.clock$.subscribe((date) => {
      const dateF = this.clock.formatDate(date);
      const timeF = this.clock.formatTime(date, this.is24Hour());
      this.timerDisplay = `${dateF}  ${timeF}`;
    });
  }

  ngOnDestroy() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }

  }

  toggleFormat() {
    this.is24Hour.update(v => !v);
  }
}
