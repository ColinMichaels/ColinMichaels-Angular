import {CommonModule} from '@angular/common';
import {Component, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faKeyboard, faPlay, faPlus, faStop, faTrash} from '@fortawesome/free-solid-svg-icons';

import {
  FREQUENCIES,
  PatchService,
  SYNTH_PRESET_CATEGORIES,
  SynthPresetCategory,
  SynthPatch
} from '../../../services/patch.service';
import {SoundDriverId, SoundDriverMetadata} from '../../../services/sound-drivers/sound-driver.types';
import {
  KeyboardControllerComponent,
  KeyboardNoteEvent
} from '../keyboard-controller/keyboard-controller.component';

interface SequencerStep {
  active: boolean;
  note: string;
  velocity: number;
}

interface SequencerChannel {
  id: number;
  name: string;
  presetName: string;
  selectedNote: string;
  soundDriverId: SoundDriverId;
  muted: boolean;
  steps: SequencerStep[];
}

type SequencerResolution = 1 | 2 | 4;

@Component({
  selector: 'app-midi-sequencer',
  templateUrl: './midi-sequencer.component.html',
  styleUrls: ['./midi-sequencer.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    FaIconComponent,
    KeyboardControllerComponent,
  ],
})
export class MidiSequencerComponent implements OnDestroy {
  tempo = 112;
  bars = 1;
  stepsPerBeat: SequencerResolution = 4;
  playheadStep = 0;
  isPlaying = false;
  selectedChannelId = 1;

  readonly presetCategories: readonly SynthPresetCategory[] = SYNTH_PRESET_CATEGORIES;
  readonly soundDrivers: readonly SoundDriverMetadata[];
  readonly noteOptions = Object.keys(FREQUENCIES).filter(note => /[2-6]$/.test(note));
  readonly resolutionOptions: readonly { label: string; value: SequencerResolution }[] = [
    {label: 'Quarter', value: 1},
    {label: 'Eighth', value: 2},
    {label: 'Sixteenth', value: 4},
  ];

  channels: SequencerChannel[] = [
    this.createChannel(1, 'Keys', 'Electric Piano', 'C4'),
    this.createChannel(2, 'Bass', 'Synth Bass', 'C2'),
    this.createChannel(3, 'Pad', 'Warm Pad', 'G3'),
    this.createChannel(4, 'Lead', 'Square Lead', 'C5'),
  ];

  private loopTimerId: number | null = null;
  private nextChannelId = this.channels.length + 1;

  constructor(private readonly patchService: PatchService) {
    this.soundDrivers = this.patchService.getSoundDrivers();
    this.seedPattern();
  }

  togglePlayback(): void {
    if (this.isPlaying) {
      this.stop();
      return;
    }

    this.play();
  }

  play(): void {
    this.stop();
    this.isPlaying = true;
    this.playheadStep = 0;
    this.playStep(this.playheadStep);
    this.loopTimerId = window.setInterval(() => {
      this.playheadStep = (this.playheadStep + 1) % this.totalSteps;
      this.playStep(this.playheadStep);
    }, this.stepDurationMs);
  }

  stop(): void {
    if (this.loopTimerId !== null) {
      window.clearInterval(this.loopTimerId);
    }

    this.loopTimerId = null;
    this.isPlaying = false;
    this.playheadStep = 0;
  }

  playStep(stepIndex: number): void {
    const duration = this.stepDurationSeconds * 0.86;
    for (const channel of this.channels) {
      if (channel.muted) {
        continue;
      }

      const step = channel.steps[stepIndex];
      if (step?.active) {
        this.patchService.playPreset(step.note, duration, channel.presetName, channel.soundDriverId);
      }
    }
  }

  previewChannel(channel: SequencerChannel): void {
    this.patchService.playPreset(channel.selectedNote, this.stepDurationSeconds, channel.presetName, channel.soundDriverId);
  }

  playSelectedChannelNote(event: KeyboardNoteEvent): void {
    const channel = this.selectedChannel;
    if (!channel) {
      return;
    }

    channel.selectedNote = event.note;
    this.patchService.playPreset(event.note, event.duration, channel.presetName, channel.soundDriverId);
  }

  toggleStep(channel: SequencerChannel, stepIndex: number): void {
    this.selectedChannelId = channel.id;
    const step = channel.steps[stepIndex];
    if (!step) {
      return;
    }

    if (!step.active) {
      step.active = true;
      step.note = channel.selectedNote;
      step.velocity = 0.82;
      return;
    }

    if (step.note !== channel.selectedNote) {
      step.note = channel.selectedNote;
      return;
    }

    step.active = false;
  }

  addChannel(): void {
    const channel = this.createChannel(this.nextChannelId, `Channel ${this.nextChannelId}`, 'Piano', 'C4');
    this.nextChannelId += 1;
    this.channels = [...this.channels, channel];
    this.selectedChannelId = channel.id;
  }

  removeChannel(channelId: number): void {
    if (this.channels.length === 1) {
      return;
    }

    this.channels = this.channels.filter(channel => channel.id !== channelId);
    if (!this.channels.some(channel => channel.id === this.selectedChannelId)) {
      this.selectedChannelId = this.channels[0].id;
    }
  }

  setBars(value: number): void {
    this.bars = Math.min(8, Math.max(1, Math.round(value)));
    this.resizeSequence();
  }

  setStepsPerBeat(value: SequencerResolution): void {
    this.stepsPerBeat = value;
    this.resizeSequence();
  }

  selectChannel(channel: SequencerChannel): void {
    this.selectedChannelId = channel.id;
  }

  trackByChannelId(_index: number, channel: SequencerChannel): number {
    return channel.id;
  }

  trackByStepIndex(index: number): number {
    return index;
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

  ngOnDestroy(): void {
    this.stop();
  }

  protected get totalSteps(): number {
    return this.bars * 4 * this.stepsPerBeat;
  }

  protected get activeStepCount(): number {
    return this.channels.reduce(
      (total, channel) => total + channel.steps.filter(step => step.active).length,
      0
    );
  }

  protected get selectedChannel(): SequencerChannel | undefined {
    return this.channels.find(channel => channel.id === this.selectedChannelId);
  }

  protected get stepDurationMs(): number {
    return 60000 / this.tempo / this.stepsPerBeat;
  }

  protected get stepDurationSeconds(): number {
    return this.stepDurationMs / 1000;
  }

  protected readonly faKeyboard = faKeyboard;
  protected readonly faPlay = faPlay;
  protected readonly faPlus = faPlus;
  protected readonly faStop = faStop;
  protected readonly faTrash = faTrash;

  private createChannel(id: number, name: string, presetName: string, selectedNote: string): SequencerChannel {
    return {
      id,
      name,
      presetName,
      selectedNote,
      soundDriverId: 'web-audio',
      muted: false,
      steps: this.createSteps(selectedNote),
    };
  }

  private createSteps(note: string): SequencerStep[] {
    return Array.from({length: this.totalSteps}, (): SequencerStep => ({
      active: false,
      note,
      velocity: 0.82,
    }));
  }

  private resizeSequence(): void {
    this.channels = this.channels.map(channel => ({
      ...channel,
      steps: Array.from({length: this.totalSteps}, (_, index): SequencerStep => {
        const existingStep = channel.steps[index];
        return existingStep ? {...existingStep} : {
          active: false,
          note: channel.selectedNote,
          velocity: 0.82,
        };
      }),
    }));
    this.playheadStep = Math.min(this.playheadStep, this.totalSteps - 1);
  }

  private seedPattern(): void {
    const [keys, bass, pad, lead] = this.channels;
    [0, 4, 8, 12].forEach((stepIndex, index) => {
      keys.steps[stepIndex].active = true;
      keys.steps[stepIndex].note = ['C4', 'E4', 'G4', 'B4'][index];
    });
    [0, 8].forEach(stepIndex => {
      bass.steps[stepIndex].active = true;
      bass.steps[stepIndex].note = 'C2';
    });
    [0].forEach(stepIndex => {
      pad.steps[stepIndex].active = true;
      pad.steps[stepIndex].note = 'G3';
    });
    [6, 10, 14].forEach((stepIndex, index) => {
      lead.steps[stepIndex].active = true;
      lead.steps[stepIndex].note = ['E5', 'G5', 'D5'][index];
    });
  }
}
