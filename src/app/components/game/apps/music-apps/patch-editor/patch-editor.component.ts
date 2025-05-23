import {Component, OnInit} from '@angular/core';
import {StorageService} from '../../../services/storage.service';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';
import {NotificationService} from '../../../services/notification.service';
import {OSCILLATOR_TYPES, PatchService, SynthPatch} from '../../../services/patch.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCaretUp, faSignature, faTooth, faTriangleCircleSquare, faWaveSquare} from '@fortawesome/free-solid-svg-icons';
import {TooltipDirective} from '../../../directives/tooltip.directive';

@Component({
  selector: 'app-defaultPatch-editor',
  imports: [
    FormsModule,
    NgForOf,
    NgIf,
    FaIconComponent,
    TooltipDirective,
    NgSwitch,
    NgSwitchCase
  ],
  templateUrl: './patch-editor.component.html'
})
export class PatchEditorComponent implements OnInit {
  defaultPatch: SynthPatch = {
    name: 'New Patch',
    oscillators: [
      {type: 'sine', detune: 0, volume: 0.2}
    ],
    envelope: {attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2}
  };

  savedPatches: any[] = [];
  defaultNote = 'C4';
  selectedPatch: SynthPatch = this.defaultPatch;
  currentPosition: number | undefined;

  constructor(
    private patchService: PatchService,
    private readonly storageService: StorageService,
    private readonly notify: NotificationService
  ) {
    this.selectedPatch = this.defaultPatch;
  }

  ngOnInit(): void {
    this.loadPatchList();
  }

  addOscillator() {
    this.selectedPatch.oscillators.push({type: 'sine', detune: 0, volume: 0.2});
  }

  removeOscillator(index: number) {
    this.selectedPatch.oscillators.splice(index, 1);
  }

  playPreview() {
    this.patchService.playPatch(this.defaultNote, 0.4, this.defaultPatch);
  }

  savePatch() {
    // Handle the Observable properly
    this.storageService.getItems<SynthPatch>('keyboard-patches').subscribe({
      next: (existingPatches) => {
        const patches = existingPatches || [];
        this.storageService.setItems('keyboard-patches', [...patches, this.selectedPatch]).subscribe({
          next: () => this.notify.show(
            {
              title: 'Patch saved!',
              message: ''
            }),
          error: (error) => console.error('Failed to save defaultPatch:', error)
        });
      },
      error: (error) => console.error('Failed to load patches:', error)
    });
  }

  deletePatch(name: string) {
    localStorage.removeItem(`patch_${name}`);
    this.loadPatchList();
    if (this.selectedPatch.name === name) {
      this.selectedPatch = {
        name: 'New Patch',
        oscillators: [{type: 'sine', detune: 0, volume: 0.2}],
        envelope: {attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2}
      };
    }
    this.notify.warn(`Deleted patch '${name}'`);
  }

  loadPatchList() {
    this.storageService.getItems<SynthPatch>('keyboard-patches').subscribe((patches) => {
      if (patches) {
        this.savedPatches = patches as unknown as string[];
      }
    });

  }

  onPositionChange($event: number) {
    console.warn('knob value changed', $event);
  }

  protected readonly OSCILLATOR_TYPES = OSCILLATOR_TYPES;
  protected readonly faWaveSquare = faWaveSquare;
  protected readonly faTriangleCircleSquare = faTriangleCircleSquare;
  protected readonly faCaretUp = faCaretUp;
  protected readonly faTooth = faTooth;
  protected readonly faSignature = faSignature;
}
