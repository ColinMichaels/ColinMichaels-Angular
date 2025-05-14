import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
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
  styleUrls: ['./intro-overlay.component.scss'],
})
export class IntroOverlayComponent implements OnInit, OnDestroy {
  @Output() begin = new EventEmitter<void>();
  flickerClass = '';
  flickerInterval: any;

  constructor(private soundService: SoundService) {
  }

  ngOnInit() {

  }

  startGame() {
    this.soundService.bootAudio();
    this.begin.emit();
  }

  private scheduleRandomFlicker() {
    const randomDelay = Math.floor(Math.random() * 4000) + 1000; // 1–5 sec

   this.flickerInterval =  setTimeout(() => {
      this.triggerFlicker();
      this.scheduleRandomFlicker(); // loop it
    }, randomDelay);
  }

  private triggerFlicker() {
    this.flickerClass = 'glitch-flicker';
    const glitches = ['digital-beep-1.mp3', 'digital-beep-2.mp3'];
    this.soundService.playVariant('beep', {volume: 0.2, forceRestart: true});
    setTimeout(() => {
      this.flickerClass = '';
    }, 300); // clear after animation ends
  }

  ngOnDestroy() {
    this.flickerInterval && clearInterval(this.flickerInterval);
  }
}

