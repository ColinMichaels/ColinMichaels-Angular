import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {
  PatchService,
  SYNTH_PRESET_CATEGORIES,
  SynthPatch,
  SynthPresetCategory
} from '../../../services/patch.service';
import {FormsModule} from '@angular/forms';
import {SoundDriverId, SoundDriverMetadata} from '../../../services/sound-drivers/sound-driver.types';
import {
  KeyboardControllerComponent,
  KeyboardNoteEvent
} from '../keyboard-controller/keyboard-controller.component';

@Component({
  selector: 'app-piano',
  templateUrl: './piano.component.html',
  styleUrls: ['./piano.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    NgForOf,
    NgIf,
    FormsModule,
    KeyboardControllerComponent,
  ],
})
export class PianoComponent {
  @Input() startingOctave = 3;
  @Input() visibleOctaves = 2;
  @Input() noteDuration = 0.7;
  @Input() patch: SynthPatch | null = null;
  @Input() compact = false;
  @Input() enableComputerKeyboard = true;
  @Input() soundDriverId: SoundDriverId = 'web-audio';
  @Input() showDriverControl = true;

  selectedPreset = 'Piano';
  presetCategories: readonly SynthPresetCategory[] = SYNTH_PRESET_CATEGORIES;
  soundDrivers: readonly SoundDriverMetadata[] = [];

  constructor(private readonly patchService: PatchService) {
    this.soundDrivers = this.patchService.getSoundDrivers();
  }

  playNote(note: string, octave?: number, velocity = this.noteDuration): void {
    const noteAdjusted = this.normalizeNote(note, octave);

    if (this.patch) {
      this.patchService.playPatch(noteAdjusted, velocity, this.patch, this.soundDriverId);
      return;
    }

    this.patchService.playPreset(noteAdjusted, velocity, this.selectedPreset, this.soundDriverId);
  }

  playControllerNote(event: KeyboardNoteEvent): void {
    this.playNote(event.note, undefined, event.duration);
  }

  trackBySoundDriverId(_index: number, driver: SoundDriverMetadata): SoundDriverId {
    return driver.id;
  }

  trackByPresetCategoryLabel(_index: number, category: SynthPresetCategory): string {
    return category.label;
  }

  trackByPatchName(_index: number, patch: SynthPatch): string {
    return patch.name;
  }

  protected get activePatchName(): string {
    return this.patch?.name || this.selectedPreset;
  }

  protected get keyboardModeLabel(): string {
    return this.patch ? 'Patch controller' : 'Preset controller';
  }

  private normalizeNote(note: string, octave?: number): string {
    if (octave !== undefined || /\d$/.test(note)) {
      return `${note}${octave ?? ''}`;
    }

    return `${note}${this.startingOctave}`;
  }
}
