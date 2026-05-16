import {BehaviorSubject} from 'rxjs';

import {LogService} from './log.service';
import {PatchService, SYNTH_PRESET_CATEGORIES, SynthPatch} from './patch.service';
import {SettingsService} from './settings.service';

describe('PatchService presets', () => {
  let service: PatchService;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let logger: jasmine.SpyObj<LogService>;

  beforeEach(() => {
    settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', [
      'getSettingSet',
      'registerSettingSet',
      'updateSettingSet',
    ]);
    logger = jasmine.createSpyObj<LogService>('LogService', ['warn']);
    service = new PatchService(settingsService, logger);
  });

  it('registers the factory preset catalog', () => {
    service.registerPatches();

    const [storageKey, patches] = settingsService.registerSettingSet.calls.mostRecent().args;

    expect(storageKey).toBe('keyboard-patches');
    expect((patches as SynthPatch[]).map(patch => patch.name)).toEqual(jasmine.arrayContaining([
      'Piano',
      'Electric Piano',
      'Guitar',
      'Clean Electric Guitar',
      'Organ',
      'Strings',
      'Bass',
      'Synth Bass',
      'Glass Pad',
    ]));
  });

  it('groups factory presets into library categories', () => {
    expect(SYNTH_PRESET_CATEGORIES.map(category => category.label)).toEqual([
      'Keys',
      'Guitars',
      'Organs',
      'Strings & Pads',
      'Bass',
      'Bells & Mallets',
      'Synth Leads',
    ]);
    expect(SYNTH_PRESET_CATEGORIES.flatMap(category => category.patches).map(patch => patch.name)).toContain('Acid Lead');
  });

  it('returns preset patch clones by case-insensitive name', () => {
    const piano = service.getPresetPatch('piano');
    expect(piano?.name).toBe('Piano');

    piano!.oscillators[0].volume = 0;

    expect(service.getPresetPatch('Piano')?.oscillators[0].volume).not.toBe(0);
  });

  it('plays presets through the patch engine', () => {
    const playPatch = spyOn(service, 'playPatch');

    service.playPreset('C4', 0.5, 'Organ');

    expect(playPatch).toHaveBeenCalledWith('C4', 0.5, jasmine.objectContaining({
      name: 'Organ',
    }), 'web-audio');
  });

  it('exposes and tracks selectable sound drivers', () => {
    expect(service.getSoundDrivers().map(driver => driver.id)).toEqual(['web-audio', 'tone-sampler', 'soundfont']);
    expect(service.getSoundDriverId()).toBe('web-audio');

    service.setSoundDriver('tone-sampler');

    expect(service.getSoundDriverId()).toBe('tone-sampler');

    service.setSoundDriver('soundfont');

    expect(service.getSoundDriverId()).toBe('soundfont');
  });

  it('keeps presets available when saving a user patch', () => {
    settingsService.getSettingSet.and.returnValue(new BehaviorSubject<unknown[]>(service.getPresetPatches()));
    const pianoPreset = service.getPresetPatch('Piano')!;
    const customPatch = service.clonePatch(pianoPreset, 'Custom Piano');

    service.savePatch(customPatch);

    const savedPatches = settingsService.updateSettingSet.calls.mostRecent().args[1] as SynthPatch[];
    expect(savedPatches[0].name).toBe('Custom Piano');
    expect(savedPatches.some(patch => patch.name === 'Piano')).toBeTrue();
    expect(savedPatches.some(patch => patch.name === 'Guitar')).toBeTrue();
  });
});
