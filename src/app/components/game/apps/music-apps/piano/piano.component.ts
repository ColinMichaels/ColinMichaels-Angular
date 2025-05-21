import {AfterViewInit, Component, ElementRef, HostListener, OnDestroy, QueryList, ViewChildren} from '@angular/core';
import {SoundService} from '../../../services/sound.service';
import {NgClass, NgForOf} from '@angular/common';
import {PatchService, PianoKeyMap} from "../../../services/patch.service";

export interface PianoKey {
  note: string;
  label: string;
  sharp: boolean;
  octave: number;
}

@Component({
  selector: 'app-piano',
  templateUrl: './piano.component.html',
  imports: [
    NgClass,
    NgForOf
  ],
})
export class PianoComponent implements OnDestroy, AfterViewInit {
  @ViewChildren('pianoKey') pianoKeys!: QueryList<ElementRef>;

  pressedKeys = new Set<string>();
  private readonly notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  octave = 4;

  buildKeys(startOctave = this.octave, numOctaves = 2): PianoKey[] {
    const keys: PianoKey[] = [];

    for (let octave = startOctave; octave < startOctave + numOctaves; octave++) {
      this.notes.forEach(note => {
        keys.push({
          note: `${note}${octave}`,
          label: note,
          sharp: note.includes('#'),
          octave: octave
        });
      });
    }
    return keys;
  }


  private lastKeyPressTimestamps: Map<string, number> = new Map();
  private readonly DEBOUNCE_TIME = 400; // milliseconds

  isDragging = false;

  constructor(private readonly sound: SoundService, private readonly patchService: PatchService) {
  }

  ngAfterViewInit() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.pianoKeys.forEach(key => {
      const element = key.nativeElement;

      // Add passive touch listeners
      element.addEventListener('touchstart', (e: TouchEvent) => {
        const note = e.target instanceof Element ? e.target.getAttribute('data-note') : null;
        if (note) this.onKeyDown(note);
      }, {passive: true});
      element.addEventListener('touchmove', (e: TouchEvent) => this.onTouchMove(e), {passive: true});
      element.addEventListener('touchend', () => this.onKeyUp(), {passive: true});
    });
  }


  play(note: string) {
    const now = Date.now();
    const lastPlayed = this.lastKeyPressTimestamps.get(note) || 0;

    // If the same note was played very recently, skip it
    if (now - lastPlayed < this.DEBOUNCE_TIME) {
      return;
    }

    this.lastKeyPressTimestamps.set(note, now);
    this.patchService.playPatch(note);

  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    this.notePressed(PianoKeyMap[event.key.toLowerCase()]);
  }

  private notePressed(note: string) {
    if (note && !this.pressedKeys.has(note)) {
      this.pressedKeys.add(note);
      this.play(note);
      setTimeout(() => this.pressedKeys.delete(note), 200); // optional fade-out timing
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {

    const note = PianoKeyMap[event.key.toLowerCase()];
    if (note) {
      this.pressedKeys.delete(note);
    }
  }

  onTouchMove(event: TouchEvent) {
    const touch = event.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.hasAttribute('data-note')) {
      const note = element.getAttribute('data-note');
      if (note) this.onKeyEnter(note);
    }
  }

  onKeyDown(note: string) {
    this.isDragging = true;
    this.notePressed(note);
    this.play(note);
  }

  onKeyEnter(note: string) {
    if (this.isDragging) {
      this.notePressed(note);
      this.play(note);
    }
  }

  onKeyUp() {
    this.isDragging = false;
  }

  ngOnDestroy() {
    this.lastKeyPressTimestamps.clear();
    // Clean up listeners if needed
    this.pianoKeys?.forEach(key => {
      const element = key.nativeElement;
      element.removeEventListener('touchstart', (e: TouchEvent) => {
        const note = e.target instanceof Element ? e.target.getAttribute('data-note') : null;
        if (note) this.onKeyDown(note);
      });
      element.removeEventListener('touchmove', this.onTouchMove);
      element.removeEventListener('touchend', this.onKeyUp);
    });
  }
}
