import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {NgForOf} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faKeyboard, faMinus, faPlus} from '@fortawesome/free-solid-svg-icons';

export interface KeyboardKey {
  note: string;
  label: string;
  sharp: boolean;
  octave: number;
}

export interface KeyboardNoteEvent {
  note: string;
  duration: number;
}

@Component({
  selector: 'app-keyboard-controller',
  templateUrl: './keyboard-controller.component.html',
  styleUrls: ['./keyboard-controller.component.scss'],
  imports: [
    NgForOf,
    FaIconComponent,
  ],
})
export class KeyboardControllerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() startingOctave = 3;
  @Input() visibleOctaves = 2;
  @Input() noteDuration = 0.7;
  @Input() compact = false;
  @Input() enableComputerKeyboard = true;
  @Input() title = 'Keyboard Controller';
  @Input() subtitle = 'MIDI input';
  @Output() noteTriggered = new EventEmitter<KeyboardNoteEvent>();

  keyMap: KeyboardKey[] = [];
  pressedKeys = new Set<string>();
  isDragging = false;

  private readonly noteNames: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  private readonly keyboardMap: { [key: string]: { note: string, octaveOffset: number } } = {
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
    'k': {note: 'C', octaveOffset: 1},
    'o': {note: 'C#', octaveOffset: 1},
    'l': {note: 'D', octaveOffset: 1},
    'p': {note: 'D#', octaveOffset: 1},
    ';': {note: 'E', octaveOffset: 1},
    "'": {note: 'F', octaveOffset: 1},
    ']': {note: 'F#', octaveOffset: 1},
  };

  private readonly lastKeyPressTimestamps = new Map<string, number>();
  private readonly debounceTimeMs = 80;
  private readonly activeNoteTimers = new Map<string, number>();

  ngOnInit(): void {
    this.generateKeyMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startingOctave'] || changes['visibleOctaves']) {
      this.generateKeyMap();
    }
  }

  generateKeyMap(): void {
    this.keyMap = [];
    const totalOctaves = Math.min(4, Math.max(1, Math.round(this.visibleOctaves)));

    for (let octaveOffset = 0; octaveOffset < totalOctaves; octaveOffset += 1) {
      for (const note of this.noteNames) {
        const currentOctave = this.startingOctave + octaveOffset;
        this.keyMap.push({
          note,
          label: `${note}${currentOctave}`,
          octave: currentOctave,
          sharp: note.includes('#'),
        });
      }
    }
  }

  triggerNote(note: string, octave?: number, duration = this.noteDuration): void {
    const normalizedNote = this.normalizeNote(note, octave);
    const now = Date.now();
    const lastPlayed = this.lastKeyPressTimestamps.get(normalizedNote) ?? 0;

    if (now - lastPlayed < this.debounceTimeMs) {
      return;
    }

    this.lastKeyPressTimestamps.set(normalizedNote, now);
    this.pressedKeys.add(normalizedNote);
    this.noteTriggered.emit({note: normalizedNote, duration});
    this.releasePressedNote(normalizedNote);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.enableComputerKeyboard || !this.keyboardMap[event.key]) {
      return;
    }

    event.preventDefault();
    const notePlayed = this.getNoteAndOffsetFromKey(event.key);
    if (notePlayed) {
      this.triggerNote(notePlayed.note, notePlayed.octave);
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent): void {
    if (!this.enableComputerKeyboard || !this.keyboardMap[event.key]) {
      return;
    }

    event.preventDefault();
    const notePlayed = this.getNoteAndOffsetFromKey(event.key);
    if (notePlayed) {
      this.pressedKeys.delete(`${notePlayed.note}${notePlayed.octave}`);
    }
  }

  onPointerDown(key: KeyboardKey): void {
    this.isDragging = true;
    this.triggerNote(key.note, key.octave);
  }

  onPointerEnter(key: KeyboardKey): void {
    if (this.isDragging) {
      this.triggerNote(key.note, key.octave);
    }
  }

  onPointerUp(): void {
    this.isDragging = false;
  }

  onKeyPress(key: KeyboardKey): void {
    this.triggerNote(key.note, key.octave);
  }

  setOctave(octave: number): void {
    this.startingOctave = Math.min(6, Math.max(1, octave));
    this.generateKeyMap();
  }

  setVisibleOctaves(octaves: number): void {
    this.visibleOctaves = Math.min(4, Math.max(1, octaves));
    this.generateKeyMap();
  }

  trackByLabel(_index: number, key: KeyboardKey): string {
    return key.label;
  }

  ngOnDestroy(): void {
    for (const timerId of this.activeNoteTimers.values()) {
      window.clearTimeout(timerId);
    }
    this.activeNoteTimers.clear();
    this.lastKeyPressTimestamps.clear();
    this.pressedKeys.clear();
  }

  protected get rootRangeLabel(): string {
    const lastKey = this.keyMap[this.keyMap.length - 1];
    return lastKey ? `${this.keyMap[0]?.label} - ${lastKey.label}` : '';
  }

  protected readonly faKeyboard = faKeyboard;
  protected readonly faMinus = faMinus;
  protected readonly faPlus = faPlus;

  private getNoteAndOffsetFromKey(key: string): { note: string; octave: number } | null {
    const note = this.keyboardMap[key]?.note;
    const octaveOffset = this.keyboardMap[key]?.octaveOffset;
    if (!note || octaveOffset === undefined) {
      return null;
    }

    return {note, octave: this.startingOctave + octaveOffset};
  }

  private normalizeNote(note: string, octave?: number): string {
    if (octave !== undefined || /\d$/.test(note)) {
      return `${note}${octave ?? ''}`;
    }

    return `${note}${this.startingOctave}`;
  }

  private releasePressedNote(note: string): void {
    const previousTimer = this.activeNoteTimers.get(note);
    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }

    const timerId = window.setTimeout(() => {
      this.pressedKeys.delete(note);
      this.activeNoteTimers.delete(note);
    }, 220);
    this.activeNoteTimers.set(note, timerId);
  }
}
