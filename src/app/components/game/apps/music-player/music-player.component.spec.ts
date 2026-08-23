import {ComponentFixture, TestBed} from '@angular/core/testing';

import {MUSIC_PLAYER_SETTING_ID} from '../../services/music.service';
import {SettingsService} from '../../services/settings.service';
import {MusicPlayerComponent} from './music-player.component';

describe('MusicPlayerComponent', () => {
  let component: MusicPlayerComponent;
  let fixture: ComponentFixture<MusicPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MusicPlayerComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MusicPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('previews Finder metadata without inferring or loading a library track by filename', () => {
    const load = spyOn(component.music, 'load');
    const originalTrack = component.currentTrack;

    component.params = {
      source: 'finder',
      content: {kind: 'metadata-only'},
      file: {
        id: 'audio',
        name: 'ambient_1.mp3',
        virtualPath: '/Music/ambient_1.mp3',
        type: 'audio',
        mimeType: 'audio/mpeg',
      },
    };
    fixture.detectChanges();

    expect(component.finderFile?.id).toBe('audio');
    expect(load).not.toHaveBeenCalled();
    expect(component.currentTrack).toBe(originalTrack);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No audio bytes are attached');
  });

  it('implements repeat and keeps shortcuts scoped away from native controls', () => {
    const setLoop = spyOn(component.music, 'setLoop').and.callThrough();
    component.toggleRepeat();
    expect(component.repeatEnabled).toBeTrue();
    expect(setLoop).toHaveBeenCalledOnceWith(true);

    const next = spyOn(component, 'nextTrack');
    const preventDefault = jasmine.createSpy('preventDefault');
    component.handleKeyboard({
      code: 'ArrowRight',
      target: document.createElement('input'),
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(next).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();

    component.handleKeyboard({
      code: 'ArrowRight',
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(next).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);

    fixture.destroy();
    const reopened = TestBed.createComponent(MusicPlayerComponent);
    expect(reopened.componentInstance.repeatEnabled).toBeTrue();
    reopened.destroy();
  });

  it('keeps the Play/Pause button focused while its state changes', () => {
    spyOn(component.music, 'play').and.callFake(() => component.music.isPlayingChanged.next(true));
    const button = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Play"]') as HTMLButtonElement;

    button.focus();
    button.click();
    fixture.detectChanges();

    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-label')).toBe('Pause');
  });

  it('preserves volume and mute state across close and reopen without an unmute jump', () => {
    const settings = TestBed.inject(SettingsService);
    const update = spyOn(settings, 'updateSettingSetWithSingleValue');
    const setVolume = spyOn(component.music, 'setVolume').and.callThrough();
    const setMuted = spyOn(component.music, 'setMuted').and.callThrough();
    component.onVolumeChange({target: {value: '35'}} as unknown as Event);

    component.toggleMute();
    expect(component.muted).toBeTrue();
    expect(component.volume).toBe(0.35);
    expect(setMuted).toHaveBeenCalledWith(true);

    fixture.destroy();
    const reopened = TestBed.createComponent(MusicPlayerComponent);
    const reopenedComponent = reopened.componentInstance;
    expect(reopenedComponent.muted).toBeTrue();
    expect(reopenedComponent.volume).toBe(0.35);

    reopenedComponent.toggleMute();
    expect(reopenedComponent.muted).toBeFalse();
    expect(reopenedComponent.volume).toBe(0.35);
    expect(setVolume).toHaveBeenCalledWith(0.35);
    expect(setMuted).toHaveBeenCalledWith(false);
    expect(update).toHaveBeenCalledOnceWith(MUSIC_PLAYER_SETTING_ID, 'volume', 0.35);
    reopened.destroy();
  });

  it('synchronizes mute presentation when another control changes root audio volume', () => {
    component.toggleMute();
    expect(component.muted).toBeTrue();

    component.music.setVolume(0.6);
    fixture.detectChanges();

    expect(component.muted).toBeFalse();
    expect(component.volume).toBe(0.6);
    expect((fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Mute"]')).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[aria-label="Volume"]')?.value)
      .toBe('60');
  });
});
