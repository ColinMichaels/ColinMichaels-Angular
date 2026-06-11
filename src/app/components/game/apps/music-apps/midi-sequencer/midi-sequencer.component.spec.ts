import {ComponentFixture, TestBed} from '@angular/core/testing';

import {MidiSequencerComponent} from './midi-sequencer.component';
import {PatchService} from '../../../services/patch.service';
import {SOUND_DRIVERS} from '../../../services/sound-drivers/sound-driver.types';

describe('MidiSequencerComponent', () => {
  let component: MidiSequencerComponent;
  let fixture: ComponentFixture<MidiSequencerComponent>;
  let patchService: jasmine.SpyObj<PatchService>;

  beforeEach(async () => {
    patchService = jasmine.createSpyObj<PatchService>('PatchService', ['getSoundDrivers', 'playPreset']);
    patchService.getSoundDrivers.and.returnValue([...SOUND_DRIVERS]);

    await TestBed.configureTestingModule({
      imports: [MidiSequencerComponent],
      providers: [
        {provide: PatchService, useValue: patchService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MidiSequencerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create a multi-channel sequence grid', () => {
    expect(component).toBeTruthy();
    expect(component.channels.length).toBe(4);
    expect(component.channels.every(channel => channel.steps.length === 16)).toBeTrue();
  });

  it('toggles steps using the selected channel note', () => {
    const channel = component.channels[0];
    channel.selectedNote = 'F#4';
    channel.steps[1].active = false;

    component.toggleStep(channel, 1);

    expect(channel.steps[1]).toEqual(jasmine.objectContaining({
      active: true,
      note: 'F#4',
    }));
  });

  it('plays active steps through the channel sound generator settings', () => {
    const channel = component.channels[0];
    channel.presetName = 'Electric Piano';
    channel.soundDriverId = 'soundfont';
    channel.steps[0].active = true;
    channel.steps[0].note = 'C4';

    component.playStep(0);

    expect(patchService.playPreset).toHaveBeenCalledWith('C4', jasmine.any(Number), 'Electric Piano', 'soundfont');
  });

  it('resizes channels when bar count changes', () => {
    component.setBars(2);

    expect(component.channels.every(channel => channel.steps.length === 32)).toBeTrue();
  });
});
