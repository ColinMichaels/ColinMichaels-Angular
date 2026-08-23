import {Component, DestroyRef, HostListener, Input, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {MUSIC_PLAYER_SETTING_ID, MusicService, Track} from '../../services/music.service';
import {NgForOf, NgIf} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faBackward,
  faExpand,
  faForward,
  faPause,
  faPlay,
  faRepeat, faShuffle, faVolumeDown, faVolumeMute,
  faVolumeUp
} from '@fortawesome/free-solid-svg-icons';
import {SettingsService} from '../../services/settings.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  ApplicationFileDescriptor,
  isApplicationFileOpenParams,
} from '@core-os/app-registry/application-manager.models';

@Component({
  selector: 'app-music-player',
  templateUrl: './music-player.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    NgForOf,
    FaIconComponent,
    NgIf
  ],
})
export class MusicPlayerComponent implements OnDestroy {
  currentTrack: Track;
  trackLibrary: Track[];
  isPlaying = false;
  currentTime = 0;
  progress = 0;
  volume = 0;
  muted = false;
  repeatEnabled = false;
  finderFile?: ApplicationFileDescriptor;

  @Input()
  set params(value: unknown) {
    if (!isApplicationFileOpenParams(value)) {
      this.finderFile = undefined;
      return;
    }
    this.finderFile = {...value.file};
  }

  constructor(
    public music: MusicService,
    private readonly settingsService: SettingsService,
    private readonly destroyRef: DestroyRef,
  ) {
    this.currentTrack = this.music.currentTrack;
    this.trackLibrary = this.music.library;
    this.volume = this.music.volume();
    this.muted = this.music.isMuted();
    this.repeatEnabled = this.music.loopEnabled();
    this.music.trackChanged.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((track) => {
      this.currentTrack = track;
    });
    this.music.timeUpdated.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((time: number) => {
      this.currentTime = time;
      this.progress = (time / this.currentTrack.duration) * 100;
    });
    this.music.isPlayingChanged.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((state: boolean) => this.isPlaying = state);
    this.music.mutedChanged.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((state: boolean) => this.muted = state);
    this.music.volumeChanged.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((volume: number) => this.volume = volume);
  }

  play() {
    this.music.play();
  }

  pause() {
    this.music.pause();
  }

  togglePlayback() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  nextTrack() {
    this.music.next();
  }

  prevTrack() {
    this.music.previous();
  }

  selectTrack(track: Track) {
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
    this.applyVolume(volume);
  }

  @HostListener('keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('button, input, select, textarea, a[href], [contenteditable="true"]')) {
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      this.nextTrack();
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
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

  toggleRepeat() {
    this.repeatEnabled = !this.repeatEnabled;
    this.music.setLoop(this.repeatEnabled);
  }

  toggleMute() {
    this.muted = !this.muted;
    this.music.setMuted(this.muted);
  }

  ngOnDestroy() {
    this.music.stopAll();
  }

  protected readonly faVolumeMute = faVolumeMute;

  private applyVolume(volume: number): void {
    const normalized = Math.min(1, Math.max(0, volume));
    this.volume = normalized;
    this.muted = false;
    this.settingsService.updateSettingSetWithSingleValue(MUSIC_PLAYER_SETTING_ID, 'volume', normalized);
    this.music.setVolume(normalized);
  }
}
