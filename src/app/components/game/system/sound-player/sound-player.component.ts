// sound-player.component.ts
import {SoundService} from '../../services/sound.service';
import {Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faPause, faPlay, faVolumeUp} from '@fortawesome/free-solid-svg-icons';
import {Setting, SettingsService} from '../../services/settings.service';

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
          class="w-20 accent-blue-500"
          min="0"
          max="100"
        >
      </div>
    </div>
  `
})
export class SoundPlayerComponent implements OnInit {
  private soundFiles = [
    {
      name: 'Ambient',
      src: 'ambient.mp3'
    }
    ];
  private soundService = inject(SoundService);
  private settingsService = inject(SettingsService);
  private readonly settingsSetId = 'audio-player';
  private settings: Setting[] = [
    { id: 'volume', value: 50},
    {id: 'playing', value: false},
    {id: 'soundFiles', value: this.soundFiles}
  ];

  constructor() {
    this.settingsService.registerSettingSet(this.settingsSetId, this.settings);
  }

  ngOnInit(): void {

  }

  isPlaying = signal(false);
  volume = signal(50);

  togglePlayPause() {
    this.isPlaying.update(v => {
      this.settingsService.updateSettingSetWithSingleValue(this.settingsSetId, 'playing', !v);
      if(v){
        this.soundService.pause(this.soundFiles[0].src);
      }else {
        this.soundService.play(this.soundFiles[0].src, {loop: true, volume: this.volume()/100});
      }
      return !v;
    });
    // Integrate with sound service
  }

  onVolumeChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.volume.set(Number(value));
    this.settingsService.updateSettingSetWithSingleValue(this.settingsSetId, 'volume', value);
    this.soundService.setVolume(this.soundFiles[0].src, this.volume());
    // Update volume through sound service
  }

  protected readonly faPause = faPause;
  protected readonly faPlay = faPlay;
  protected readonly faVolumeUp = faVolumeUp;
}
