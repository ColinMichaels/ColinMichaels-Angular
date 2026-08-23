// sound-player.component.ts
import {Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faPause, faPlay, faVolumeUp} from '@fortawesome/free-solid-svg-icons';
import {Setting, SettingsService} from '../../services/settings.service';
import {MUSIC_PLAYER_SETTING_ID, MusicService} from '../../services/music.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sound-player',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="flex items-center space-x-2 bg-zinc-800/40 p-1.5 rounded-lg">
      <button type="button" (click)="togglePlayPause()" [attr.aria-label]="isPlaying() ? 'Pause music' : 'Play music'"
              class="text-white/80 hover:text-white text-xs">
        <fa-icon [icon]="isPlaying() ? faPause : faPlay"></fa-icon>
      </button>

      <div class="flex items-center space-x-2 text-xs">
        <fa-icon [icon]="faVolumeUp" class="text-white/80"></fa-icon>
        <input
          type="range"
          aria-label="Music volume"
          [value]="volume() * 100"
          (input)="onVolumeChange($event)"
          class="w-20 accent-gray-300"
          min="0"
          max="100"
        >
      </div>
    </div>
  `
})
export class SoundPlayerComponent {
  musicService = inject(MusicService);
  private settingsService = inject(SettingsService);
  private settings: Setting[] = [
    {id: 'volume', value: 0.1},
    {id: 'playing', value: false},
    {id: 'soundFiles', value: []}
  ];

  constructor() {
    this.settingsService.registerSettingSet(MUSIC_PLAYER_SETTING_ID, this.settings);
    this.musicService.isPlayingChanged.pipe(takeUntilDestroyed()).subscribe(playing => {
      this.isPlaying.set(playing);
    });
    this.musicService.volumeChanged.pipe(takeUntilDestroyed()).subscribe(volume => {
      this.volume.set(volume);
    });
  }

  isPlaying = signal(false);
  volume = signal(this.musicService.volume());

  togglePlayPause() {
    this.isPlaying.update(v => {
      this.settingsService.updateSettingSetWithSingleValue(MUSIC_PLAYER_SETTING_ID, 'playing', !v);
      if(v){
        this.musicService.pause();
      }else {
        this.musicService.play();
      }
      return !v;
    });
    // Integrate with sound service
  }

  onVolumeChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    const newVolume = Number(value) / 100;
    this.settingsService.updateSettingSetWithSingleValue(MUSIC_PLAYER_SETTING_ID, 'volume', newVolume);
    this.musicService.setVolume(newVolume);
    // Update volume through sound service
  }

  protected readonly faPause = faPause;
  protected readonly faPlay = faPlay;
  protected readonly faVolumeUp = faVolumeUp;
}
