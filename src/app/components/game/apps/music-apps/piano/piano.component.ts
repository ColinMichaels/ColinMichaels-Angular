import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input, OnChanges,
  OnDestroy, OnInit,
  QueryList, SimpleChanges,
  ViewChildren
} from '@angular/core';
import {NgClass, NgForOf} from '@angular/common';
import {PatchService} from "../../../services/patch.service";
import {FormsModule} from '@angular/forms';
import {PianoSettingsComponent} from './components/piano-settings/piano-settings.component';
import {faCog} from '@fortawesome/free-solid-svg-icons';

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
    NgForOf,
    FormsModule,
    PianoSettingsComponent,
  ],
})
export class PianoComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  setOctave($event: number) {
    this.startingOctave = $event;
    this.generateKeyMap();
  }
  @ViewChildren('pianoKey') pianoKeys!: QueryList<ElementRef>;

  @Input() startingOctave = 3;

  // This will hold our full mapping with octave numbers
  keyMap: { note: string, octave: number, sharp: boolean }[] = [];

  pressedKeys = new Set<string>();

  private readonly noteNames: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  private readonly keyboardMap: { [key: string]: { note: string, octaveOffset: number } } = {
    // First row (lower octave)
    'a': {note: 'C', octaveOffset: 0},
    'w': {note: 'C#', octaveOffset: 0},
    's': {note: 'D', octaveOffset: 0},
    'e': {note: 'D#', octaveOffset: 0},
    'd': {note: 'E', octaveOffset: 0},
    'f': {note: 'F', octaveOffset: 0},
    't': {note: 'F#', octaveOffset: 0},
    'g': {note: 'G', octaveOffset: 0},
    'y': {note: 'G#', octaveOffset: 0},
    'h': {note: 'A', octaveOffset: 0},
    'u': {note: 'A#', octaveOffset: 0},
    'j': {note: 'B', octaveOffset: 0},

    // Second row (higher octave)
    'k': {note: 'C', octaveOffset: 1},
    'o': {note: 'C#', octaveOffset: 1},
    'l': {note: 'D', octaveOffset: 1},
    'p': {note: 'D#', octaveOffset: 1},
    ';': {note: 'E', octaveOffset: 1},
    "'": {note: 'F', octaveOffset: 1},
    ']': {note: 'F#', octaveOffset: 1},
    // Add more keys as needed
  };


  private lastKeyPressTimestamps: Map<string, number> = new Map();
  private readonly DEBOUNCE_TIME = 400; // milliseconds

  isDragging = false;
  maxNumKeys: number = 24;
  settingsVisible: boolean = true;

  patches: string[] = [];
  selectedPatch: string = 'bass';

  constructor(private readonly patchService: PatchService) {
    this.patches = ['bass', 'piano']
  }

  ngOnInit() {
    this.generateKeyMap();
  }

  ngAfterViewInit() {
    this.setupEventListeners();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.warn('changes', changes);
    if (changes['startingOctave']) {
      this.generateKeyMap();
    }
  }


  generateKeyMap() {
    // Clear the existing map
    this.keyMap = [];

    // Determine how many octaves to display (adjust as needed)
    const totalOctaves = 3; // For example, show 3 octaves

    for (let octaveOffset = 0; octaveOffset < totalOctaves; octaveOffset++) {
      for (let i = 0; i < this.noteNames.length; i++) {
        const note = this.noteNames[i];
        // Increment octave after each B note
        const currentOctave = this.startingOctave + Math.floor((i + (octaveOffset * 12)) / 12);

        this.keyMap.push({
          note: note,
          octave: currentOctave,
          sharp: note.includes('#'),
        });
      }
    }
  }


  private setupEventListeners() {
    this.pianoKeys.forEach(key => {
      const element = key.nativeElement;
      // Add passive touch listeners
      element.addEventListener('touchstart', (e: TouchEvent) => {
        const note: any = e.target instanceof Element ? e.target.getAttribute('data-note') : null;
        if (note) this.onKeyDown(note.key, note.octave);
      }, {passive: true});
      element.addEventListener('touchmove', (e: TouchEvent) => this.onTouchMove(e), {passive: true});
      element.addEventListener('touchend', () => this.onKeyUp(), {passive: true});
    });
  }


  playNote(note: string, octave?: number, velocity = 0.6) {
    const now = Date.now();
    const noteAdjusted = note + (octave ?? '');
    const lastPlayed = this.lastKeyPressTimestamps.get(noteAdjusted) ?? 0;

    // If the same note was played very recently, skip it
    if (now - lastPlayed < this.DEBOUNCE_TIME) {
      return;
    }

    this.lastKeyPressTimestamps.set(noteAdjusted, now);
    this.patchService.playCustomOscillator([noteAdjusted], velocity, this.selectedPatch);

  }

  private getNoteAndOffsetFromKey(key: string) {
    const note = this.keyboardMap[key]?.note;
    const octaveOffset = this.keyboardMap[key]?.octaveOffset;
    const octave = this.startingOctave + octaveOffset;
    return {note, octave};
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Prevent default behavior for mapped keys to avoid scrolling, etc.
    if (this.keyboardMap[event.key]) {
      event.preventDefault();
      const notePlayed = this.getNoteAndOffsetFromKey(event.key);
      this.notePressed(notePlayed.note + notePlayed.octave);
      this.playNote(notePlayed.note, notePlayed.octave);
    }

  }

  private notePressed(note: string) {
    if (note && !this.pressedKeys.has(note)) {
      this.pressedKeys.add(note);
      this.playNote(note);
      setTimeout(() => this.pressedKeys.delete(note), 200); // optional fade-out timing
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    if (this.keyboardMap[event.key]) {
      event.preventDefault();
      const notePlayed = this.getNoteAndOffsetFromKey(event.key);
      if (notePlayed) {
        this.pressedKeys.delete(notePlayed.note + notePlayed.octave);
      }
    }
  }

  onTouchMove(event: TouchEvent) {
    const touch = event.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.hasAttribute('data-note')) {
      const note = element.getAttribute('data-note');
      if (note) this.onKeyEnter(note, 2);
    }
  }

  onKeyDown(note: string, octave: number) {
    this.isDragging = true;
    this.notePressed(note + octave);
    this.playNote(note + octave);
  }

  onKeyEnter(note: string, octave: number) {
    if (this.isDragging) {
      this.notePressed(note + octave);
      this.playNote(note + octave);
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
        if (note) this.onKeyDown(note, 2);
      });
      element.removeEventListener('touchmove', this.onTouchMove);
      element.removeEventListener('touchend', this.onKeyUp);
    });
  }

  onOctaveChange(octave: number) {
    this.startingOctave = octave;
  }

  protected readonly faCog = faCog;
}
