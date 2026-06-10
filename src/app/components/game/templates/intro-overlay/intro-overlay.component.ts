import {ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, Output} from '@angular/core';
import {SoundService} from '../../services/sound.service';
import {NgClass} from '@angular/common';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-intro-overlay',
  imports: [
    NgClass,
    RouterLink
  ],
  standalone: true,
  templateUrl: './intro-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./intro-overlay.component.scss'],
})
export class IntroOverlayComponent implements OnDestroy {
  @Output() begin = new EventEmitter<void>();
  flickerClass = '';
  private flickerTimeout?: ReturnType<typeof setTimeout>;

  constructor(private soundService: SoundService) {
  }

  startGame() {
    this.soundService.bootAudio();
    this.begin.emit();
  }

  private scheduleRandomFlicker() {
    const randomDelay = Math.floor(Math.random() * 4000) + 1000; // 1–5 sec

    this.flickerTimeout = setTimeout(() => {
      this.triggerFlicker();
      this.scheduleRandomFlicker(); // loop it
    }, randomDelay);
  }

  private triggerFlicker() {
    this.flickerClass = 'glitch-flicker';
    this.soundService.playVariant('beep', {volume: 0.2, forceRestart: true});
    setTimeout(() => {
      this.flickerClass = '';
    }, 300); // clear after animation ends
  }

  ngOnDestroy() {
    if (this.flickerTimeout) {
      clearTimeout(this.flickerTimeout);
    }
  }
}
