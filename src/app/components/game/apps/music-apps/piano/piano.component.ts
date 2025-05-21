import { Component } from '@angular/core';
import { SoundService } from '../../../services/sound.service';
import {NgClass, NgForOf} from '@angular/common'; // adjust path if needed

@Component({
  selector: 'app-piano',
  templateUrl: './piano.component.html',
  imports: [
    NgClass,
    NgForOf
  ],
})
export class PianoComponent {
  constructor(private sound: SoundService) {}

  keys = [
    { note: 'C4', label: 'C', sharp: false },
    { note: 'C#4', label: 'C#', sharp: true },
    { note: 'D4', label: 'D', sharp: false },
    { note: 'D#4', label: 'D#', sharp: true },
    { note: 'E4', label: 'E', sharp: false },
    { note: 'F4', label: 'F', sharp: false },
    { note: 'F#4', label: 'F#', sharp: true },
    { note: 'G4', label: 'G', sharp: false },
    { note: 'G#4', label: 'G#', sharp: true },
    { note: 'A4', label: 'A', sharp: false },
    { note: 'A#4', label: 'A#', sharp: true },
    { note: 'B4', label: 'B', sharp: false },
    { note: 'C5', label: 'C', sharp: false },
  ];

  playKey(note: string) {
    this.sound.play(note); // assuming your sound service exposes `play(note: string)`
  }
}
