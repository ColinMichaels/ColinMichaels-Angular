import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {StorageService} from '@core-os/storage';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {NotificationService} from '../../../services/notification.service';
import {
  DEFAULT_SYNTH_PATCH,
  FILTER_TYPES,
  FREQUENCIES,
  LFO_TARGETS,
  OSCILLATOR_TYPES,
  OscillatorType,
  PatchService,
  SYNTH_PRESET_CATEGORIES,
  SynthPresetCategory,
  SynthOscillatorConfig,
  SynthPatch,
} from '../../../services/patch.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faCopy,
  faFloppyDisk,
  faKeyboard,
  faPlay,
  faPlus,
  faRotateLeft,
  faShuffle,
  faSignature,
  faSliders,
  faTooth,
  faTrash,
  faTriangleCircleSquare,
  faVolumeHigh,
  faWaveSquare,
} from '@fortawesome/free-solid-svg-icons';
import {TooltipDirective} from '@core-os/tooltip';
import {finalize, map, switchMap, take} from 'rxjs/operators';
import {PianoComponent} from '../piano/piano.component';
import {SoundDriverId, SoundDriverMetadata} from '../../../services/sound-drivers/sound-driver.types';

type PreviewMode = 'note' | 'fifth' | 'minor' | 'major' | 'sequence';

interface PreviewModeOption {
  id: PreviewMode;
  label: string;
}

const STORAGE_KEY = 'keyboard-patches';
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

@Component({
  selector: 'app-patch-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FaIconComponent,
    TooltipDirective,
    PianoComponent,
  ],
  templateUrl: './patch-editor.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./patch-editor.component.scss']
})
export class PatchEditorComponent implements OnInit {
  savedPatches: SynthPatch[] = [];
  defaultNote = 'C4';
  previewDuration = 0.6;
  previewMode: PreviewMode = 'note';
  selectedSoundDriverId: SoundDriverId = 'web-audio';
  selectedPatch: SynthPatch = DEFAULT_SYNTH_PATCH;
  selectedFactoryPresetName = '';
  selectedSavedPatchName = '';
  showKeyboard = false;
  storageBusy = false;
  protected readonly soundDrivers: readonly SoundDriverMetadata[];

  constructor(
    private patchService: PatchService,
    private readonly storageService: StorageService,
    private readonly notify: NotificationService
  ) {
    this.selectedPatch = this.createPatch('New Patch');
    this.soundDrivers = this.patchService.getSoundDrivers();
  }

  ngOnInit(): void {
    this.loadPatchList();
  }

  addOscillator(): void {
    if (this.selectedPatch.oscillators.length >= 6) {
      this.notify.warn('Six oscillators is enough for this patch builder.');
      return;
    }

    const index = this.selectedPatch.oscillators.length;
    this.selectedPatch.oscillators.push({
      type: index % 2 === 0 ? 'sine' : 'sawtooth',
      detune: index % 2 === 0 ? -7 : 7,
      volume: 0.18,
      pan: index % 2 === 0 ? -0.25 : 0.25,
      octave: 0,
    });
  }

  removeOscillator(index: number): void {
    if (this.selectedPatch.oscillators.length === 1) {
      this.notify.warn('Keep at least one oscillator in the patch.');
      return;
    }

    this.selectedPatch.oscillators.splice(index, 1);
  }

  playPreview(): void {
    const patch = this.patchService.normalizePatch(this.selectedPatch);
    const notes = this.getPreviewNotes();
    const stepMs = this.previewMode === 'sequence' ? 180 : 0;

    if (stepMs === 0) {
      notes.forEach(note => this.patchService.playPatch(note, this.previewDuration, patch, this.selectedSoundDriverId));
      return;
    }

    notes.forEach((note, index) => {
      window.setTimeout(
        () => this.patchService.playPatch(note, this.previewDuration, patch, this.selectedSoundDriverId),
        index * stepMs
      );
    });
  }

  savePatch(): void {
    if (!this.beginStorageMutation()) {
      return;
    }

    const patchToSave = this.patchService.normalizePatch(this.selectedPatch);
    this.selectedPatch = patchToSave;

    this.storageService.getItems<SynthPatch>(STORAGE_KEY).pipe(
      switchMap((existingPatches) => {
        const patches = existingPatches ?? [];
        const nextPatches = [
          patchToSave,
          ...patches.filter(patch => patch.name !== patchToSave.name),
        ];

        return this.storageService.setItems(STORAGE_KEY, nextPatches).pipe(map(() => nextPatches));
      }),
      take(1),
      finalize(() => {
        this.storageBusy = false;
      })
    ).subscribe({
      next: (nextPatches) => {
        this.savedPatches = nextPatches.map(patch => this.patchService.normalizePatch(patch));
        this.selectedFactoryPresetName = '';
        this.selectedSavedPatchName = patchToSave.name;
        this.notify.show({
          title: 'Patch saved',
          message: patchToSave.name,
          type: 'success',
        });
      },
      error: () => this.notify.error('Failed to save patch.')
    });
  }

  deletePatch(name = this.selectedSavedPatchName): void {
    if (!name) {
      this.notify.warn('Choose a saved patch before deleting.');
      return;
    }

    if (!this.beginStorageMutation()) {
      return;
    }

    const nextPatches = this.savedPatches.filter(patch => patch.name !== name);
    this.storageService.setItems(STORAGE_KEY, nextPatches).pipe(
      take(1),
      finalize(() => {
        this.storageBusy = false;
      })
    ).subscribe({
      next: () => {
        this.savedPatches = nextPatches;
        this.selectedFactoryPresetName = '';
        this.selectedSavedPatchName = '';
        this.selectedPatch = this.createPatch('New Patch');
        this.notify.warn(`Deleted patch '${name}'`);
      },
      error: () => this.notify.error('Failed to delete patch.')
    });
  }

  loadPatchList(): void {
    this.storageBusy = true;
    this.storageService.getItems<SynthPatch>(STORAGE_KEY).pipe(
      take(1),
      finalize(() => {
        this.storageBusy = false;
      })
    ).subscribe({
      next: (patches) => {
        this.savedPatches = (patches ?? []).map(patch => this.patchService.normalizePatch(patch));
      },
      error: () => this.notify.error('Failed to load saved patches.')
    });
  }

  private beginStorageMutation(): boolean {
    if (this.storageBusy) {
      this.notify.warn('Wait for the current patch storage operation to finish.');
      return false;
    }

    this.storageBusy = true;
    return true;
  }

  loadSavedPatch(name: string): void {
    this.selectedSavedPatchName = name;
    this.selectedFactoryPresetName = '';
    const patch = this.savedPatches.find(savedPatch => savedPatch.name === name);

    if (!patch) {
      return;
    }

    this.selectedPatch = this.patchService.clonePatch(patch);
  }

  loadFactoryPreset(name: string): void {
    this.selectedFactoryPresetName = name;
    if (!name) {
      return;
    }

    const preset = this.patchService.getPresetPatch(name);
    if (!preset) {
      this.notify.warn(`Unknown preset '${name}'`);
      return;
    }

    this.selectedPatch = preset;
    this.selectedSavedPatchName = '';
  }

  newPatch(): void {
    this.selectedFactoryPresetName = '';
    this.selectedSavedPatchName = '';
    this.selectedPatch = this.createPatch('New Patch');
  }

  duplicatePatch(): void {
    const name = this.getUniquePatchName(`${this.selectedPatch.name} Copy`);
    this.selectedPatch = this.patchService.clonePatch(this.selectedPatch, name);
    this.selectedFactoryPresetName = '';
    this.selectedSavedPatchName = '';
  }

  resetPatch(): void {
    this.selectedPatch = this.createPatch(this.selectedPatch.name || 'New Patch');
  }

  randomizePatch(): void {
    const oscillatorCount = this.randomInt(2, 4);
    const oscillators = Array.from({length: oscillatorCount}, (_, index): SynthOscillatorConfig => ({
      type: this.randomItem(OSCILLATOR_TYPES),
      detune: this.randomInt(-18, 18),
      volume: Number(this.randomFloat(0.12, 0.32).toFixed(2)),
      pan: Number(this.randomFloat(-0.75, 0.75).toFixed(2)),
      octave: index === 0 ? 0 : this.randomItem([-1, 0, 0, 1]),
    }));

    this.selectedPatch = this.patchService.normalizePatch({
      name: this.getUniquePatchName('Generated Patch'),
      oscillators,
      envelope: {
        attack: Number(this.randomFloat(0.01, 0.8).toFixed(2)),
        decay: Number(this.randomFloat(0.05, 0.7).toFixed(2)),
        sustain: Number(this.randomFloat(0.35, 0.9).toFixed(2)),
        release: Number(this.randomFloat(0.1, 1.4).toFixed(2)),
      },
      filter: {
        enabled: true,
        type: this.randomItem(FILTER_TYPES),
        frequency: this.randomInt(450, 6200),
        resonance: Number(this.randomFloat(0.4, 10).toFixed(1)),
      },
      lfo: {
        enabled: Math.random() > 0.35,
        target: this.randomItem(LFO_TARGETS),
        rate: Number(this.randomFloat(0.3, 8).toFixed(2)),
        depth: this.randomInt(6, 80),
      },
      delay: {
        enabled: Math.random() > 0.45,
        time: Number(this.randomFloat(0.08, 0.48).toFixed(2)),
        feedback: Number(this.randomFloat(0.08, 0.55).toFixed(2)),
        mix: Number(this.randomFloat(0.08, 0.35).toFixed(2)),
      },
      master: {
        volume: Number(this.randomFloat(0.55, 0.9).toFixed(2)),
      },
    });
    this.selectedFactoryPresetName = '';
    this.selectedSavedPatchName = '';
  }

  setOscillatorType(oscillator: SynthOscillatorConfig, type: OscillatorType): void {
    oscillator.type = type;
  }

  setSoundDriver(driverId: SoundDriverId): void {
    this.selectedSoundDriverId = driverId;
    this.patchService.setSoundDriver(driverId);
  }

  trackByPatchName(_index: number, patch: SynthPatch): string {
    return patch.name;
  }

  trackBySoundDriverId(_index: number, driver: SoundDriverMetadata): SoundDriverId {
    return driver.id;
  }

  trackByPresetCategoryLabel(_index: number, category: SynthPresetCategory): string {
    return category.label;
  }

  trackByIndex(index: number): number {
    return index;
  }

  protected get filter(): NonNullable<SynthPatch['filter']> {
    return this.selectedPatch.filter!;
  }

  protected get lfo(): NonNullable<SynthPatch['lfo']> {
    return this.selectedPatch.lfo!;
  }

  protected get delay(): NonNullable<SynthPatch['delay']> {
    return this.selectedPatch.delay!;
  }

  protected get master(): NonNullable<SynthPatch['master']> {
    return this.selectedPatch.master!;
  }

  protected get oscillatorCount(): number {
    return this.selectedPatch.oscillators.length;
  }

  protected get complexityScore(): number {
    let score = this.oscillatorCount * 12;
    score += this.filter.enabled ? 18 : 0;
    score += this.lfo.enabled ? 16 : 0;
    score += this.delay.enabled ? 14 : 0;
    score += Math.round((this.selectedPatch.envelope.attack + this.selectedPatch.envelope.release) * 4);
    return Math.min(100, score);
  }

  protected get totalOscillatorVolume(): number {
    return Number(this.selectedPatch.oscillators
      .reduce((total, oscillator) => total + Number(oscillator.volume || 0), 0)
      .toFixed(2));
  }

  private createPatch(name: string): SynthPatch {
    return this.patchService.clonePatch(DEFAULT_SYNTH_PATCH, name);
  }

  private getPreviewNotes(): string[] {
    switch (this.previewMode) {
      case 'fifth':
        return [this.defaultNote, this.transposeNote(this.defaultNote, 7)];
      case 'minor':
        return [this.defaultNote, this.transposeNote(this.defaultNote, 3), this.transposeNote(this.defaultNote, 7)];
      case 'major':
        return [this.defaultNote, this.transposeNote(this.defaultNote, 4), this.transposeNote(this.defaultNote, 7)];
      case 'sequence':
        return [0, 3, 7, 10, 12].map(interval => this.transposeNote(this.defaultNote, interval));
      case 'note':
      default:
        return [this.defaultNote];
    }
  }

  private transposeNote(note: string, semitones: number): string {
    const match = /^([A-G]#?)(\d)$/.exec(note);
    if (!match) {
      return note;
    }

    const noteName = match[1];
    const octave = Number(match[2]);
    const noteIndex = NOTE_NAMES.indexOf(noteName);
    const nextIndex = noteIndex + semitones;
    const nextOctave = octave + Math.floor(nextIndex / NOTE_NAMES.length);
    const normalizedIndex = ((nextIndex % NOTE_NAMES.length) + NOTE_NAMES.length) % NOTE_NAMES.length;
    const nextNote = `${NOTE_NAMES[normalizedIndex]}${nextOctave}`;

    return FREQUENCIES[nextNote] ? nextNote : note;
  }

  private getUniquePatchName(baseName: string): string {
    const existingNames = new Set(this.savedPatches.map(patch => patch.name));
    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let index = 2;
    while (existingNames.has(`${baseName} ${index}`)) {
      index += 1;
    }

    return `${baseName} ${index}`;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.randomFloat(min, max + 1));
  }

  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private randomItem<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  protected readonly noteOptions = Object.keys(FREQUENCIES).filter(note => /[2-6]$/.test(note));
  protected readonly presetCategories = SYNTH_PRESET_CATEGORIES;
  protected readonly previewModes: readonly PreviewModeOption[] = [
    {id: 'note', label: 'Single'},
    {id: 'fifth', label: 'Fifth'},
    {id: 'minor', label: 'Minor'},
    {id: 'major', label: 'Major'},
    {id: 'sequence', label: 'Run'},
  ];
  protected readonly OSCILLATOR_TYPES = OSCILLATOR_TYPES;
  protected readonly FILTER_TYPES = FILTER_TYPES;
  protected readonly LFO_TARGETS = LFO_TARGETS;
  protected readonly faWaveSquare = faWaveSquare;
  protected readonly faTriangleCircleSquare = faTriangleCircleSquare;
  protected readonly faTooth = faTooth;
  protected readonly faSignature = faSignature;
  protected readonly faPlay = faPlay;
  protected readonly faFloppyDisk = faFloppyDisk;
  protected readonly faKeyboard = faKeyboard;
  protected readonly faPlus = faPlus;
  protected readonly faTrash = faTrash;
  protected readonly faShuffle = faShuffle;
  protected readonly faCopy = faCopy;
  protected readonly faRotateLeft = faRotateLeft;
  protected readonly faSliders = faSliders;
  protected readonly faVolumeHigh = faVolumeHigh;
}
