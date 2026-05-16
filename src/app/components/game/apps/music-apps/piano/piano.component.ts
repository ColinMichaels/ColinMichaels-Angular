import {Component, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {PatchService, SYNTH_PRESET_NAMES, SynthPatch} from '../../../services/patch.service';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faKeyboard, faMinus, faPlus} from '@fortawesome/free-solid-svg-icons';

export interface PianoKey {
  note: string;
  label: string;
  sharp: boolean;
  octave: number;
}

@Component({
  selector: 'app-piano',
  templateUrl: './piano.component.html',
  styleUrls: ['./piano.component.scss'],
  imports: [
    NgForOf,
    NgIf,
    FormsModule,
    FaIconComponent,
  ],
})
export class PianoComponent implements OnInit, OnDestroy, OnChanges {
  @Input() startingOctave = 3;
  @Input() visibleOctaves = 2;
  @Input() noteDuration = 0.7;
  @Input() patch: SynthPatch | null = null;
  @Input() compact = false;
  @Input() enableComputerKeyboard = true;

  keyMap: PianoKey[] = [];

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
  private readonly debounceTimeMs = 80;

  isDragging = false;
  selectedPreset = 'Piano';
  patches: readonly string[] = SYNTH_PRESET_NAMES;

  constructor(private readonly patchService: PatchService) {
  }

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

    for (let octaveOffset = 0; octaveOffset < totalOctaves; octaveOffset++) {
      for (let i = 0; i < this.noteNames.length; i += 1) {
        const note = this.noteNames[i];
        const currentOctave = this.startingOctave + octaveOffset;

        this.keyMap.push({
          note: note,
          label: `${note}${currentOctave}`,
          octave: currentOctave,
          sharp: note.includes('#'),
        });
      }
    }
  }

  playNote(note: string, octave?: number, velocity = this.noteDuration): void {
    const now = Date.now();
    const noteAdjusted = this.normalizeNote(note, octave);
    const lastPlayed = this.lastKeyPressTimestamps.get(noteAdjusted) ?? 0;

    if (now - lastPlayed < this.debounceTimeMs) {
      return;
    }

    this.lastKeyPressTimestamps.set(noteAdjusted, now);

    if (this.patch) {
      this.patchService.playPatch(noteAdjusted, velocity, this.patch);
      return;
    }

    this.patchService.playPreset(noteAdjusted, velocity, this.selectedPreset);
  }

  private getNoteAndOffsetFromKey(key: string): { note: string; octave: number } | null {
    const note = this.keyboardMap[key]?.note;
    const octaveOffset = this.keyboardMap[key]?.octaveOffset;
    if (!note || octaveOffset === undefined) {
      return null;
    }

    const octave = this.startingOctave + octaveOffset;
    return {note, octave};
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (this.enableComputerKeyboard && this.keyboardMap[event.key]) {
      event.preventDefault();
      const notePlayed = this.getNoteAndOffsetFromKey(event.key);
      if (notePlayed) {
        this.pressNote(notePlayed.note, notePlayed.octave);
      }
    }

  }

  private pressNote(note: string, octave?: number): void {
    const normalizedNote = this.normalizeNote(note, octave);
    if (normalizedNote && !this.pressedKeys.has(normalizedNote)) {
      this.pressedKeys.add(normalizedNote);
      this.playNote(normalizedNote);
      setTimeout(() => this.pressedKeys.delete(normalizedNote), 220);
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent): void {
    if (this.enableComputerKeyboard && this.keyboardMap[event.key]) {
      event.preventDefault();
      const notePlayed = this.getNoteAndOffsetFromKey(event.key);
      if (notePlayed) {
        this.pressedKeys.delete(notePlayed.note + notePlayed.octave);
      }
    }
  }

  onPointerDown(key: PianoKey): void {
    this.isDragging = true;
    this.pressNote(key.note, key.octave);
  }

  onPointerEnter(key: PianoKey): void {
    if (this.isDragging) {
      this.pressNote(key.note, key.octave);
    }
  }

  onPointerUp(): void {
    this.isDragging = false;
  }

  onKeyPress(key: PianoKey): void {
    this.pressNote(key.note, key.octave);
  }

  setOctave(octave: number): void {
    this.startingOctave = Math.min(6, Math.max(1, octave));
    this.generateKeyMap();
  }

  setVisibleOctaves(octaves: number): void {
    this.visibleOctaves = Math.min(4, Math.max(1, octaves));
    this.generateKeyMap();
  }

  trackByLabel(_index: number, key: PianoKey): string {
    return key.label;
  }

  ngOnDestroy(): void {
    this.lastKeyPressTimestamps.clear();
    this.pressedKeys.clear();
  }

  private normalizeNote(note: string, octave?: number): string {
    if (octave !== undefined || /\d$/.test(note)) {
      return `${note}${octave ?? ''}`;
    }

    return `${note}${this.startingOctave}`;
  }

  protected get activePatchName(): string {
    return this.patch?.name || this.selectedPreset;
  }

  protected get keyboardModeLabel(): string {
    return this.patch ? 'Patch tester' : 'Preset tester';
  }

  protected get rootRangeLabel(): string {
    const lastKey = this.keyMap[this.keyMap.length - 1];
    return lastKey ? `${this.keyMap[0]?.label} - ${lastKey.label}` : '';
  }

  protected readonly faKeyboard = faKeyboard;
  protected readonly faMinus = faMinus;
  protected readonly faPlus = faPlus;
}
