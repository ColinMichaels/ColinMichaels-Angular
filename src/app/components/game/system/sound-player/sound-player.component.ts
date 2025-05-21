// sound-player.component.ts
import {Component, inject, signal} from '@angular/core';
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
  template: `
    <div class="flex items-center space-x-2 bg-zinc-800/40 p-1.5 rounded-lg">
      <button (click)="togglePlayPause()" class="text-white/80 hover:text-white text-xs">
        <fa-icon [icon]="isPlaying() ? faPause : faPlay"></fa-icon>
      </button>

      <div class="flex items-center space-x-2 text-xs">
        <fa-icon [icon]="faVolumeUp" class="text-white/80"></fa-icon>
        <input
          type="range"
          [value]="volume()"
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
  private musicService = inject(MusicService);
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
  }

  get currentSong() {
    return this.musicService.currentTrack;
  }

  isPlaying = signal(false);
  volume = signal(0.1);

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
    this.volume.set(Number(value));
    this.settingsService.updateSettingSetWithSingleValue(MUSIC_PLAYER_SETTING_ID, 'volume', value);
    this.musicService.setVolume(this.volume() / 100);
    // Update volume through sound service
  }

  protected readonly faPause = faPause;
  protected readonly faPlay = faPlay;
  protected readonly faVolumeUp = faVolumeUp;
}
