import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PianoComponent } from './piano.component';
import {DEFAULT_SYNTH_PATCH, PatchService} from '../../../services/patch.service';
import {SOUND_DRIVERS} from '../../../services/sound-drivers/sound-driver.types';

describe('PianoComponent', () => {
  let component: PianoComponent;
  let fixture: ComponentFixture<PianoComponent>;
  let patchService: jasmine.SpyObj<PatchService>;

  beforeEach(async () => {
    patchService = jasmine.createSpyObj<PatchService>('PatchService', ['playPatch', 'playPreset', 'getSoundDrivers']);
    patchService.getSoundDrivers.and.returnValue([...SOUND_DRIVERS]);

    await TestBed.configureTestingModule({
      imports: [PianoComponent],
      providers: [
        {provide: PatchService, useValue: patchService},
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PianoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('generates a responsive octave range', () => {
    component.startingOctave = 2;
    component.visibleOctaves = 3;

    component.generateKeyMap();

    expect(component.keyMap.length).toBe(36);
    expect(component.keyMap[0]?.label).toBe('C2');
    expect(component.keyMap[component.keyMap.length - 1]?.label).toBe('B4');
  });

  it('plays the provided patch when testing editor sounds', () => {
    component.patch = DEFAULT_SYNTH_PATCH;
    component.soundDriverId = 'tone-sampler';

    component.playNote('D#', 4);

    expect(patchService.playPatch).toHaveBeenCalledWith('D#4', 0.7, DEFAULT_SYNTH_PATCH, 'tone-sampler');
  });

  it('falls back to the selected preset patch without a patch input', () => {
    component.selectedPreset = 'Guitar';
    component.soundDriverId = 'tone-sampler';

    component.playNote('C', 3, 0.5);

    expect(patchService.playPreset).toHaveBeenCalledWith('C3', 0.5, 'Guitar', 'tone-sampler');
  });

  it('renders grouped preset options', () => {
    const groups = Array.from(
      fixture.nativeElement.querySelectorAll('#piano-preset optgroup')
    ) as HTMLOptGroupElement[];

    expect(groups.map(group => group.label)).toEqual(jasmine.arrayContaining([
      'Keys',
      'Bells & Mallets',
      'Synth Leads',
    ]));
  });
});
