import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {ClockService} from '../../services/clock.service';

@Component({
  selector: 'app-clock-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clock-display.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``
})
export class ClockDisplayComponent implements OnInit {
  private readonly clock = inject(ClockService);
  private readonly destroyRef = inject(DestroyRef);

  is24Hour = signal(false); // system variable toggle

  timerDisplay = '';

  ngOnInit(): void {
    this.clock.clock$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((date) => {
        const dateF = this.clock.formatDate(date);
        const timeF = this.clock.formatTime(date, this.is24Hour());
        this.timerDisplay = `${dateF}  ${timeF}`;
      });
  }

  toggleFormat(): void {
    this.is24Hour.update(v => !v);
  }
}
