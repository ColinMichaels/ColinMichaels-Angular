import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';

import {PatchEditorComponent} from './patch-editor.component';
import {DEFAULT_SYNTH_PATCH, PatchService, SYNTH_PRESET_PATCHES, SynthPatch} from '../../../services/patch.service';
import {StorageService} from '../../../services/storage.service';
import {NotificationService} from '../../../services/notification.service';
import {SOUND_DRIVERS} from '../../../services/sound-drivers/sound-driver.types';

describe('PatchEditorComponent', () => {
  let component: PatchEditorComponent;
  let fixture: ComponentFixture<PatchEditorComponent>;
  let patchService: jasmine.SpyObj<PatchService>;
  let storageService: jasmine.SpyObj<StorageService>;
  let notify: jasmine.SpyObj<NotificationService>;

  const clonePatch = (patch: SynthPatch, nextName = patch.name): SynthPatch => {
    const clonedPatch = JSON.parse(JSON.stringify(patch)) as SynthPatch;
    return {...clonedPatch, name: nextName};
  };

  beforeEach(async () => {
    patchService = jasmine.createSpyObj<PatchService>('PatchService', [
      'playPatch',
      'normalizePatch',
      'clonePatch',
      'getPresetPatch',
      'getSoundDrivers',
      'setSoundDriver',
    ]);
    patchService.normalizePatch.and.callFake((patch: SynthPatch) => clonePatch(patch));
    patchService.clonePatch.and.callFake((patch: SynthPatch, nextName?: string) => clonePatch(patch, nextName));
    patchService.getSoundDrivers.and.returnValue([...SOUND_DRIVERS]);
    patchService.getPresetPatch.and.callFake((name: string) => {
      const preset = SYNTH_PRESET_PATCHES.find(patch => patch.name === name);
      return preset ? clonePatch(preset) : null;
    });

    storageService = jasmine.createSpyObj<StorageService>('StorageService', ['getItems', 'setItems']);
    storageService.getItems.and.returnValue(of([clonePatch(DEFAULT_SYNTH_PATCH, 'Saved Pad')]));
    storageService.setItems.and.returnValue(of(undefined));

    notify = jasmine.createSpyObj<NotificationService>('NotificationService', ['show', 'warn', 'error']);

    await TestBed.configureTestingModule({
      imports: [PatchEditorComponent],
      providers: [
        {provide: PatchService, useValue: patchService},
        {provide: StorageService, useValue: storageService},
        {provide: NotificationService, useValue: notify},
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(PatchEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads saved patches from storage', () => {
    expect(component.savedPatches.length).toBe(1);
    expect(component.savedPatches[0].name).toBe('Saved Pad');
  });

  it('previews the selected patch instead of the default patch', () => {
    component.selectedPatch = clonePatch(DEFAULT_SYNTH_PATCH, 'Edited Patch');

    component.playPreview();

    expect(patchService.playPatch).toHaveBeenCalledWith('C4', 0.6, jasmine.objectContaining({
      name: 'Edited Patch',
    }), 'web-audio');
  });

  it('routes preview through the selected sound driver', () => {
    component.selectedPatch = clonePatch(DEFAULT_SYNTH_PATCH, 'Piano');

    component.setSoundDriver('tone-sampler');
    component.playPreview();

    expect(patchService.setSoundDriver).toHaveBeenCalledWith('tone-sampler');
    expect(patchService.playPatch).toHaveBeenCalledWith('C4', 0.6, jasmine.objectContaining({
      name: 'Piano',
    }), 'tone-sampler');
  });

  it('replaces an existing saved patch with the same name', () => {
    component.selectedPatch = clonePatch(DEFAULT_SYNTH_PATCH, 'Saved Pad');

    component.savePatch();

    const setItemsArgs = storageService.setItems.calls.mostRecent().args;
    const savedPatches = setItemsArgs[1] as SynthPatch[];

    expect(setItemsArgs[0]).toBe('keyboard-patches');
    expect(savedPatches.length).toBe(1);
    expect(savedPatches[0].name).toBe('Saved Pad');
  });

  it('loads a factory preset into the editor', () => {
    component.selectedSavedPatchName = 'Saved Pad';

    component.loadFactoryPreset('Guitar');

    expect(patchService.getPresetPatch).toHaveBeenCalledWith('Guitar');
    expect(component.selectedPatch.name).toBe('Guitar');
    expect(component.selectedFactoryPresetName).toBe('Guitar');
    expect(component.selectedSavedPatchName).toBe('');
  });

  it('renders factory preset dropdown groups', () => {
    const groups = Array.from(
      fixture.nativeElement.querySelectorAll('#factory-preset optgroup')
    ) as HTMLOptGroupElement[];

    expect(groups.map(group => group.label)).toEqual(jasmine.arrayContaining([
      'Keys',
      'Guitars',
      'Synth Leads',
    ]));
  });

  it('toggles the patch keyboard tester', () => {
    expect(fixture.nativeElement.querySelector('app-piano')).toBeNull();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const keyboardToggle = buttons.find(button => button.textContent?.includes('Show Keys'));
    keyboardToggle?.click();
    fixture.detectChanges();

    expect(component.showKeyboard).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-piano')).not.toBeNull();
  });
});
