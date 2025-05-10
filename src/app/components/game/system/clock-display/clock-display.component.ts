// clock-display.component.ts
import {Component, computed, inject, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClockService } from '../../../../services/clock.service';

@Component({
  selector: 'app-clock-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clock-display.component.html',
  styles: ``
})
export class ClockDisplayComponent {
  private clock = new ClockService();

  is24Hour = signal(false); // system variable toggle

  date = computed(() => this.clock.getDate());
  time = computed(() => this.clock.getTime(this.is24Hour()));

  toggleFormat() {
    this.is24Hour.update(v => !v);
  }
}
