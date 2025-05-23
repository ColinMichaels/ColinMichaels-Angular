import {Component, HostListener} from '@angular/core';
import {MUSIC_PLAYER_SETTING_ID, MusicService} from '../../services/music.service';
import {NgForOf, NgIf} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faBackward,
  faExpand,
  faForward,
  faPause,
  faPlay,
  faRepeat, faShuffle, faVolumeDown,
  faVolumeUp
} from '@fortawesome/free-solid-svg-icons';
import {SettingsService} from '../../services/settings.service';

@Component({
  selector: 'app-music-player',
  templateUrl: './music-player.component.html',
  standalone: true,
  imports: [
    NgForOf,
    FaIconComponent,
    NgIf
  ],
})
export class MusicPlayerComponent {
  toggleRepeat() {
      throw new Error('Method not implemented.');
  }
  currentTrack;
  trackLibrary;
  isPlaying = false;
  currentTime = 0;
  progress = 0;
  volume = 0;

  constructor(
    public music: MusicService,
    private readonly settingsService: SettingsService
  ) {
    this.currentTrack = this.music.currentTrack;
    this.trackLibrary = this.music.library;
    this.volume = this.music.volume();
    this.music.trackChanged.subscribe((track: any) => {
      this.currentTrack = track;
    });
    this.music.timeUpdated.subscribe((time: number) => {
      this.currentTime = time;
      this.progress = (time / this.currentTrack.duration) * 100;
    });
    this.music.isPlayingChanged.subscribe((state: boolean) => this.isPlaying = state);
  }

  play() {
    this.music.play();
  }

  pause() {
    this.music.pause();
  }

  nextTrack() {
    this.music.next();
  }

  prevTrack() {
    this.music.previous();
  }

  selectTrack(track: any) {
    this.music.load(track);
    this.music.play();
  }

  formatTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  onVolumeChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    const volume = Number(value) / 100;
    console.log(volume);

    this.settingsService.updateSettingSetWithSingleValue(MUSIC_PLAYER_SETTING_ID, 'volume', volume);
    this.music.setVolume(volume);
    // Update volume through sound service
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (event.code === 'Space') {
      this.isPlaying ? this.pause() : this.play();
    } else if (event.code === 'ArrowRight') {
      this.nextTrack();
    } else if (event.code === 'ArrowLeft') {
      this.prevTrack();
    }
  }

  protected readonly faBackward = faBackward;
  protected readonly faPlay = faPlay;
  protected readonly faPause = faPause;
  protected readonly faForward = faForward;
  protected readonly faExpand = faExpand;
  protected readonly faVolumeUp = faVolumeUp;
  protected readonly faRepeat = faRepeat;
  protected readonly faShuffle = faShuffle;
  protected readonly faVolumeDown = faVolumeDown;

  toggleShuffle() {
    const library = this.music.library;
    const random = Math.floor(Math.random() * library.length);
    const track = library[random];
     this.selectTrack(track);
  }

  toggleMute() {
    const volume = this.music.volume();
    const toggleVolume = this.volume =  volume === 0 ? 1 : 0;
    this.music.setVolume(toggleVolume);
  }
}
